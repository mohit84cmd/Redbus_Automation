// =============================================================================
// BasePage.ts
// XHR / Network-interception wrapper layer for the RedBus Playwright suite.
// All page objects extend this class instead of talking to Playwright directly.
// =============================================================================

import { Page, Route, Request, Response, expect } from '@playwright/test';
import * as fs   from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CapturedResponse {
  url:        string;
  status:     number;
  body:       unknown;
  timestamp:  number;
  durationMs: number;
}

export interface NetworkMetrics {
  pageLoadTime:      number;
  domContentLoaded:  number;
  apiCalls:          number;
  totalRequests:     number;
  slowestApiMs:      number;
  failedRequests:    number;
}

export interface WaitForApiOptions {
  timeout?:       number;   // ms, default 30 000
  minStatusCode?: number;   // default 200
  maxStatusCode?: number;   // default 299
  bodyContains?:  string;   // optional JSON key/value check
}

// ─── API URL patterns that RedBus uses ───────────────────────────────────────
const API_PATTERNS: Record<string, RegExp> = {
  suggestions:  /\/autocomplete|\/suggest|\/source|\/destination|\/city/i,
  busSearch:    /\/api\/bus|\/search|\/buses|\/inventory/i,
  seatLayout:   /\/seat|\/layout|seatLayout|\/booking/i,
  hotelSearch:  /\/hotel|\/property|\/accommodation/i,
  trainSearch:  /\/rail|\/train|\/redRail/i,
  offers:       /\/offer|\/promo|\/coupon/i,
  auth:         /\/login|\/auth|\/user/i,
  payment:      /\/payment|\/pay|\/transaction/i,
};

// =============================================================================
export class BasePage {
  protected readonly page: Page;

  // Store of all captured API responses keyed by pattern name
  private capturedResponses: Map<string, CapturedResponse[]> = new Map();
  private requestTimings:    Map<string, number>             = new Map();
  private totalRequests      = 0;
  private failedRequests     = 0;

  // ── Mocks ──────────────────────────────────────────────────────────────────
  private activeMocks: Map<string, unknown> = new Map();

  constructor(page: Page) {
    this.page = page;
    this._initNetworkInterception();
  }

  // ===========================================================================
  // PRIVATE: Network Interception Bootstrap
  // ===========================================================================

  /** Attach response listeners and optional request mocking. */
  private _initNetworkInterception(): void {
    // ── Track request start times ──────────────────────────────────────────
    this.page.on('request', (req: Request) => {
      this.totalRequests++;
      this.requestTimings.set(req.url(), Date.now());
    });

    // ── Capture responses ──────────────────────────────────────────────────
    this.page.on('response', async (res: Response) => {
      const url       = res.url();
      const startTime = this.requestTimings.get(url) ?? Date.now();
      const duration  = Date.now() - startTime;

      if (res.status() >= 400) this.failedRequests++;

      // Only capture JSON-like API responses
      const contentType = res.headers()['content-type'] ?? '';
      if (!contentType.includes('json') && !contentType.includes('javascript')) return;

      let body: unknown = null;
      try { body = await res.json(); } catch { return; }

      const captured: CapturedResponse = {
        url,
        status:     res.status(),
        body,
        timestamp:  Date.now(),
        durationMs: duration,
      };

      // Classify by pattern
      for (const [key, pattern] of Object.entries(API_PATTERNS)) {
        if (pattern.test(url)) {
          const arr = this.capturedResponses.get(key) ?? [];
          arr.push(captured);
          this.capturedResponses.set(key, arr);
        }
      }
    });

    // ── Route mocking ──────────────────────────────────────────────────────
    this.page.route('**/*', async (route: Route) => {
      const url = route.request().url();
      for (const [key, mockBody] of this.activeMocks) {
        if (API_PATTERNS[key]?.test(url)) {
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
  // PUBLIC: Core XHR Wrapper — waitForApiResponse
  // ===========================================================================

  /**
   * PRIMARY XHR WRAPPER
   *
   * Waits until at least one response matching `patternKey` has been captured
   * AFTER this call is made.  Polls the internal store every 200 ms.
   *
   * Usage (replaces DOM-selector waiting):
   *   // Before: await this.page.waitForSelector('ul.sc-dnqmqq li', { timeout: 10000 });
   *   // After:
   *   await this.waitForApiResponse('suggestions', { timeout: 10000 });
   */
  async waitForApiResponse(
    patternKey: keyof typeof API_PATTERNS,
    opts: WaitForApiOptions = {},
    sinceCount?: number,
  ): Promise<CapturedResponse> {
    const {
      timeout       = 30_000,
      minStatusCode = 200,
      maxStatusCode = 299,
      bodyContains,
    } = opts;

    const deadline = Date.now() + timeout;
    // Snapshot count before waiting
    const beforeCount = sinceCount !== undefined ? sinceCount : (this.capturedResponses.get(patternKey) ?? []).length;

    while (Date.now() < deadline) {
      const responses = this.capturedResponses.get(patternKey) ?? [];
      const fresh     = responses.slice(beforeCount);       // only NEW responses

      for (const r of fresh) {
        if (r.status < minStatusCode || r.status > maxStatusCode) continue;
        if (bodyContains) {
          const text = JSON.stringify(r.body);
          if (!text.includes(bodyContains)) continue;
        }
        return r;
      }
      await this.page.waitForTimeout(200);
    }
    throw new Error(
      `⏱️  waitForApiResponse('${patternKey}') timed out after ${timeout}ms. ` +
      `URL pattern: ${API_PATTERNS[patternKey]}`,
    );
  }

  // ===========================================================================
  // PUBLIC: Domain-specific XHR Wrappers
  // ===========================================================================

  async waitForSuggestionsAPI(inputValue: string, timeout = 10_000, sinceCount?: number): Promise<CapturedResponse | null> {
    try {
      return await this.waitForApiResponse('suggestions', {
        timeout: Math.min(timeout, 4000),
        bodyContains: undefined,
      }, sinceCount);
    } catch (e) {
      console.warn(`⚠️ Suggestions API wait timed out: ${e.message}. Falling back to DOM check for "${inputValue}".`);
      const domSel = `.suggestion-item, [class*="suggestion-item"], li[class*="suggest"], ul.sc-dnqmqq li`;
      await this.page.waitForSelector(domSel, {
        state: 'visible',
        timeout: 3000,
      }).catch(() => {});
      return null;
    }
  }

  /**
   * Wait for the bus search results API.
   *
   * Replaces: await this.page.waitForSelector('.bus-item', { timeout: 30000 });
   */
  async waitForSearchResultsAPI(timeout = 30_000, sinceCount?: number): Promise<CapturedResponse> {
    return this.waitForApiResponse('busSearch', { timeout }, sinceCount);
  }

  /**
   * Wait for the seat-layout API after clicking "View Seats".
   *
   * Replaces: await this.page.waitForSelector('.seat-map-container', { timeout: 15000 });
   */
  async waitForSeatLayoutAPI(timeout = 15_000, sinceCount?: number): Promise<CapturedResponse> {
    return this.waitForApiResponse('seatLayout', { timeout }, sinceCount);
  }

  /**
   * Wait for hotel search results API.
   */
  async waitForHotelResultsAPI(timeout = 30_000, sinceCount?: number): Promise<CapturedResponse> {
    return this.waitForApiResponse('hotelSearch', { timeout }, sinceCount);
  }

  /**
   * Wait for RedRail / train search API.
   */
  async waitForTrainResultsAPI(timeout = 30_000, sinceCount?: number): Promise<CapturedResponse> {
    return this.waitForApiResponse('trainSearch', { timeout }, sinceCount);
  }

  // ===========================================================================
  // PUBLIC: XHR-aware Input & Suggestion Helpers
  // ===========================================================================

  /**
   * Fill an input field AND wait for the autocomplete API to respond.
   *
   * Replaces: clearAndType + waitForSelector combo.
   */
  async fillInputWithAPIValidation(
    selector:  string,
    value:     string,
    timeout  = 10_000,
  ): Promise<CapturedResponse> {
    const el = this.page.locator(selector).first();
    await el.click({ clickCount: 3 });
    await el.fill(value);

    // Wait for network response triggered by the input change
    return this.waitForSuggestionsAPI(value, timeout);
  }

  /**
   * Select the Nth suggestion from an autocomplete list after XHR has settled.
   */
  async selectSuggestionByAPI(
    inputSelector:      string,
    value:              string,
    suggestionSelector: string,
    index = 0,
  ): Promise<void> {
    // Fill and wait for API
    await this.fillInputWithAPIValidation(inputSelector, value);

    // DOM should now be ready (API responded first)
    await this.page.waitForSelector(suggestionSelector, {
      state: 'visible',
      timeout: 5_000,
    });
    await this.page.locator(suggestionSelector).nth(index).click();
  }

  // ===========================================================================
  // PUBLIC: Network-aware Search Flow
  // ===========================================================================

  /**
   * High-level: perform a complete bus search and wait for both
   * the API response AND the DOM results list.
   */
  async performNetworkAwareSearch(
    source:           string,
    destination:      string,
    sourceSelector:   string,
    destSelector:     string,
    suggestSelector:  string,
    searchBtnSelector:string,
  ): Promise<CapturedResponse> {
    // ── Source ────────────────────────────────────────────────────────────
    await this.fillInputWithAPIValidation(sourceSelector, source);
    await this.page.locator(suggestSelector).first().click();

    // ── Destination ────────────────────────────────────────────────────────
    await this.fillInputWithAPIValidation(destSelector, destination);
    await this.page.locator(suggestSelector).first().click();

    // ── Submit ─────────────────────────────────────────────────────────────
    await this.page.locator(searchBtnSelector).click();

    // ── Wait for results API ───────────────────────────────────────────────
    return this.waitForSearchResultsAPI(30_000);
  }

  // ===========================================================================
  // PUBLIC: Mock / Stub Responses
  // ===========================================================================

  /**
   * Mock a specific API pattern with fixture data.
   *
   * Usage:
   *   await page.mockNetworkResponse('suggestions', { data: [...] });
   */
  async mockNetworkResponse(patternKey: keyof typeof API_PATTERNS, mockBody: unknown): Promise<void> {
    this.activeMocks.set(patternKey, mockBody);
    console.log(`🔧 Mock set for pattern: ${patternKey}`);
  }

  /** Remove a mock so real network requests go through */
  async removeMock(patternKey: keyof typeof API_PATTERNS): Promise<void> {
    this.activeMocks.delete(patternKey);
  }

  // ===========================================================================
  // PUBLIC: Metrics & Debugging
  // ===========================================================================

  /** Returns live network performance metrics */
  async getNetworkMetrics(): Promise<NetworkMetrics> {
    const timing = await this.page.evaluate((): Pick<NetworkMetrics, 'pageLoadTime' | 'domContentLoaded'> => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        pageLoadTime:     Math.round(nav.loadEventEnd        - nav.startTime),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      };
    });

    let slowestApiMs = 0;
    let apiCalls     = 0;
    for (const responses of this.capturedResponses.values()) {
      apiCalls += responses.length;
      for (const r of responses) {
        if (r.durationMs > slowestApiMs) slowestApiMs = r.durationMs;
      }
    }

    return {
      ...timing,
      apiCalls,
      totalRequests:  this.totalRequests,
      slowestApiMs,
      failedRequests: this.failedRequests,
    };
  }

  /** Print all captured API calls to stdout (useful for debugging selectors) */
  async debugNetworkCalls(): Promise<void> {
    console.log('\n════════ Captured API Responses ════════');
    for (const [key, responses] of this.capturedResponses) {
      console.log(`\n[${key}] — ${responses.length} response(s)`);
      for (const r of responses.slice(-2)) {   // last 2 only
        console.log(`  ↳ ${r.status} ${r.url} (${r.durationMs}ms)`);
      }
    }
    console.log('════════════════════════════════════════\n');
  }

  /** Get all captured responses for a key */
  getCapturedResponses(patternKey: keyof typeof API_PATTERNS): CapturedResponse[] {
    return this.capturedResponses.get(patternKey) ?? [];
  }

  /** Assert that at least `count` API responses were captured for a key */
  assertApiCallCount(patternKey: keyof typeof API_PATTERNS, count: number): void {
    const actual = (this.capturedResponses.get(patternKey) ?? []).length;
    expect(actual).toBeGreaterThanOrEqual(count);
  }

  // ===========================================================================
  // PUBLIC: Shared Navigation & Utility
  // ===========================================================================

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async captureScreenshot(name: string): Promise<string> {
    const dir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${name}-${Date.now()}.png`);
    await this.page.screenshot({ path: file, fullPage: true });
    console.log(`📸 Screenshot: ${file}`);
    return file;
  }

  async dismissCookieBanner(): Promise<void> {
    const selectors = [
      'button:has-text("Accept")',
      'button:has-text("Accept All")',
      '#onetrust-accept-btn-handler',
      '[class*="cookie"] button',
    ];
    for (const sel of selectors) {
      try {
        const btn = this.page.locator(sel).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          return;
        }
      } catch { /* continue */ }
    }
  }

  /** Soft-assert: logs failure instead of throwing */
  async softAssertVisible(selector: string, label: string): Promise<boolean> {
    try {
      await expect(this.page.locator(selector).first()).toBeVisible({ timeout: 5000 });
      console.log(`✅ VISIBLE: ${label}`);
      return true;
    } catch {
      console.warn(`⚠️  NOT VISIBLE: ${label}`);
      return false;
    }
  }
}
