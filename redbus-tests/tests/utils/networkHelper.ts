// =============================================================================
// tests/utils/networkHelper.ts
// XHR / Network interception wrappers — the core "waitForAPI" layer
// Replace all brittle DOM polling with network-level assertions
// =============================================================================

import { Page, Route, Request, Response } from '@playwright/test';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiResponse {
  url:        string;
  status:     number;
  body:       unknown;
  durationMs: number;
  timestamp:  number;
}

export interface NetworkMetrics {
  pageLoadTime:     number;   // ms
  domContentLoaded: number;   // ms
  firstPaintMs:     number;   // ms
  apiCalls:         number;
  totalRequests:    number;
  failedRequests:   number;
  slowestApiMs:     number;
}

export interface WaitForApiOptions {
  /** Max wait in ms (default 30 000) */
  timeout?:       number;
  /** Minimum HTTP status to accept (default 200) */
  minStatus?:     number;
  /** Maximum HTTP status to accept (default 299) */
  maxStatus?:     number;
  /** Optional substring that must appear in the JSON body */
  bodyContains?:  string;
}

// ─── URL Patterns for RedBus APIs ─────────────────────────────────────────────

export const API_PATTERNS = {
  suggestions: /\/autocomplete|\/suggest|\/source|\/destination|\/city|\/autosuggest/i,
  busSearch:   /\/api\/bus|\/inventory|\/searchresult|\/buses|search/i,
  seatLayout:  /\/seat|seatLayout|\/layout|\/booking/i,
  hotelSearch: /\/hotel|\/property|\/accommodation|\/stay/i,
  trainSearch: /\/rail|\/train|\/irctc|redRail/i,
  offers:      /\/offer|\/promo|\/coupon|\/deal/i,
  auth:        /\/login|\/auth|\/user|\/account/i,
  payment:     /\/payment|\/pay|\/transaction|\/order/i,
} as const;

export type PatternKey = keyof typeof API_PATTERNS;

// =============================================================================
// NetworkHelper — attach to a page, then call waitForAPI() anywhere
// =============================================================================

export class NetworkHelper {
  private readonly page: Page;
  private captured: Map<PatternKey, ApiResponse[]> = new Map();
  private timings:  Map<string, number>            = new Map();
  private mocks:    Map<PatternKey, unknown>        = new Map();
  private _totalRequests  = 0;
  private _failedRequests = 0;

  constructor(page: Page) {
    this.page = page;
    this._attach();
  }

  // ===========================================================================
  // Attach listeners
  // ===========================================================================

  private _attach(): void {
    // Track request start
    this.page.on('request', (req: Request) => {
      this._totalRequests++;
      this.timings.set(req.url(), Date.now());
    });

    // Capture responses
    this.page.on('response', async (res: Response) => {
      const url      = res.url();
      const start    = this.timings.get(url) ?? Date.now();
      const duration = Date.now() - start;

      if (res.status() >= 400) this._failedRequests++;

      const ct = res.headers()['content-type'] ?? '';
      if (!ct.includes('json') && !ct.includes('javascript')) return;

      let body: unknown;
      try { body = await res.json(); }
      catch { return; }

      const entry: ApiResponse = {
        url, status: res.status(), body, durationMs: duration, timestamp: Date.now(),
      };

      for (const [key, pattern] of Object.entries(API_PATTERNS) as [PatternKey, RegExp][]) {
        if (pattern.test(url)) {
          const arr = this.captured.get(key) ?? [];
          arr.push(entry);
          this.captured.set(key, arr);
        }
      }
    });

    // Route intercept for mocking
    this.page.route('**/*', async (route: Route) => {
      const url = route.request().url();
      for (const [key, mockBody] of this.mocks) {
        if ((API_PATTERNS[key] as RegExp).test(url)) {
          await route.fulfill({
            status:      200,
            contentType: 'application/json',
            body:        JSON.stringify(mockBody),
          });
          return;
        }
      }
      await route.continue();
    });
  }

  // ===========================================================================
  // ✅  PRIMARY PUBLIC API: waitForAPI
  // ===========================================================================

  /**
   * Wait until a matching API response arrives after this call.
   *
   * REPLACES:
   *   await page.waitForSelector('ul.sc-dnqmqq li', { timeout: 10000 })
   *
   * USAGE:
   *   await networkHelper.waitForAPI('suggestions', { timeout: 10000 })
   *   await networkHelper.waitForAPI('busSearch',   { timeout: 30000 })
   *   await networkHelper.waitForAPI('seatLayout',  { timeout: 15000 })
   */
  async waitForAPI(key: PatternKey, opts: WaitForApiOptions = {}): Promise<ApiResponse> {
    const {
      timeout      = 30_000,
      minStatus    = 200,
      maxStatus    = 299,
      bodyContains,
    } = opts;

    const deadline   = Date.now() + timeout;
    const beforeCount = (this.captured.get(key) ?? []).length;   // snapshot

    while (Date.now() < deadline) {
      const all   = this.captured.get(key) ?? [];
      const fresh = all.slice(beforeCount);   // only new responses after call

      for (const r of fresh) {
        if (r.status < minStatus || r.status > maxStatus) continue;
        if (bodyContains && !JSON.stringify(r.body).includes(bodyContains)) continue;
        console.log(`✅ [XHR] ${key} → ${r.status} ${r.url} (${r.durationMs}ms)`);
        return r;
      }
      await this.page.waitForTimeout(200);
    }

    // Timeout — throw descriptive error
    throw new Error(
      `⏱️  waitForAPI('${key}') timed out after ${timeout}ms.\n` +
      `   Pattern: ${API_PATTERNS[key]}\n` +
      `   Captured so far: ${(this.captured.get(key) ?? []).length} response(s)`,
    );
  }

  // ===========================================================================
  // Domain-specific named wrappers (convenience)
  // ===========================================================================

  /** Replaces: waitForSelector('ul.sc-dnqmqq li', { timeout: 10000 }) */
  async waitForSuggestions(timeout = 10_000): Promise<ApiResponse> {
    return this.waitForAPI('suggestions', { timeout });
  }

  /** Replaces: waitForSelector('.bus-item', { timeout: 30000 }) */
  async waitForBusResults(timeout = 30_000): Promise<ApiResponse> {
    return this.waitForAPI('busSearch', { timeout });
  }

  /** Replaces: waitForSelector('.seat-map-container', { timeout: 15000 }) */
  async waitForSeatLayout(timeout = 20_000): Promise<ApiResponse> {
    return this.waitForAPI('seatLayout', { timeout });
  }

  /** Replaces: waitForSelector('.hotel-card', { timeout: 30000 }) */
  async waitForHotelResults(timeout = 30_000): Promise<ApiResponse> {
    return this.waitForAPI('hotelSearch', { timeout });
  }

  /** Replaces: waitForSelector('.train-item', { timeout: 30000 }) */
  async waitForTrainResults(timeout = 30_000): Promise<ApiResponse> {
    return this.waitForAPI('trainSearch', { timeout });
  }

  // ===========================================================================
  // XHR-aware Input Helper
  // ===========================================================================

  /**
   * Type into an input, then wait for the autocomplete API.
   *
   * REPLACES:
   *   await page.fill(selector, value)
   *   await page.waitForSelector('ul.sc-dnqmqq li', { timeout: 10000 })
   */
  async typeAndWaitForSuggestions(
    selector: string,
    value:    string,
    timeout = 10_000,
  ): Promise<ApiResponse> {
    const el = this.page.locator(selector).first();
    await el.click({ clickCount: 3 });
    await el.fill('');
    await el.type(value, { delay: 80 });
    return this.waitForSuggestions(timeout);
  }

  // ===========================================================================
  // Mocking
  // ===========================================================================

  /** Stub a specific API pattern with fixture JSON */
  setMock(key: PatternKey, body: unknown): void {
    this.mocks.set(key, body);
    console.log(`🔧 [Mock] ${key} stubbed`);
  }

  removeMock(key: PatternKey): void {
    this.mocks.delete(key);
  }

  // ===========================================================================
  // Metrics & Debugging
  // ===========================================================================

  async getNetworkMetrics(): Promise<NetworkMetrics> {
    const timing = await this.page.evaluate(() => {
      const nav   = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByName('first-paint')[0];
      return {
        pageLoadTime:     Math.round(nav.loadEventEnd              - nav.startTime),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd  - nav.startTime),
        firstPaintMs:     paint ? Math.round(paint.startTime) : 0,
      };
    });

    let slowestApiMs = 0;
    let apiCalls     = 0;
    for (const arr of this.captured.values()) {
      apiCalls += arr.length;
      for (const r of arr) {
        if (r.durationMs > slowestApiMs) slowestApiMs = r.durationMs;
      }
    }

    return {
      ...timing,
      apiCalls,
      totalRequests:  this._totalRequests,
      failedRequests: this._failedRequests,
      slowestApiMs,
    };
  }

  getCaptured(key: PatternKey): ApiResponse[] {
    return this.captured.get(key) ?? [];
  }

  debugLog(): void {
    console.log('\n════════ Network Capture Summary ════════');
    for (const [key, arr] of this.captured) {
      if (arr.length === 0) continue;
      console.log(`  [${key}] ${arr.length} calls`);
      arr.slice(-2).forEach(r =>
        console.log(`    ↳ ${r.status} ${r.url.slice(0, 80)} (${r.durationMs}ms)`),
      );
    }
    console.log('═════════════════════════════════════════\n');
  }
}
