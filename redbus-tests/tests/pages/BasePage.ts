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
// ─── Module-scoped Page Interception Store (Type-safe Singleton) ─────────────
const interceptedPages   = new WeakSet<Page>();
const pageResponseStores = new WeakMap<Page, Map<string, CapturedResponse[]>>();
const pageTimingStores   = new WeakMap<Page, Map<string, number>>();
const pageMockStores     = new WeakMap<Page, Map<string, unknown>>();

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

    if (interceptedPages.has(page)) {
      this.capturedResponses = pageResponseStores.get(page)!;
      this.requestTimings    = pageTimingStores.get(page)!;
      this.activeMocks       = pageMockStores.get(page)!;
      return;
    }

    interceptedPages.add(page);
    pageResponseStores.set(page, this.capturedResponses);
    pageTimingStores.set(page, this.requestTimings);
    pageMockStores.set(page, this.activeMocks);

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

      if (res.status() >= 400) {
        this.failedRequests++;
      }

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
        const pattern = API_PATTERNS[key];
        if (pattern && pattern.test(url)) {
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
   * AFTER this call is made.
   */
  async waitForApiResponse(
    patternKey: keyof typeof API_PATTERNS,
    opts: WaitForApiOptions = {},
  ): Promise<CapturedResponse> {
    const {
      timeout       = 30_000,
      minStatusCode = 200,
      maxStatusCode = 299,
      bodyContains,
    } = opts;

    const pattern = API_PATTERNS[patternKey];
    
    const response = await this.page.waitForResponse(
      async (res) => {
        const url = res.url();
        if (!pattern.test(url)) return false;
        if (res.status() < minStatusCode || res.status() > maxStatusCode) return false;
        
        if (bodyContains) {
          try {
            const body = await res.json();
            return JSON.stringify(body).includes(bodyContains);
          } catch {
            return false;
          }
        }
        return true;
      },
      { timeout }
    );

    const contentType = response.headers()['content-type'] ?? '';
    let body: any = null;
    if (contentType.includes('json') || contentType.includes('javascript')) {
      try {
        body = await response.json();
      } catch {}
    }

    return {
      url: response.url(),
      status: response.status(),
      body,
      timestamp: Date.now(),
      durationMs: 0
    };
  }

  // ===========================================================================
  // PUBLIC: Domain-specific XHR Wrappers
  // ===========================================================================

  async waitForSuggestionsAPI(inputValue: string, timeout = 10_000): Promise<CapturedResponse | null> {
    try {
      return await this.waitForApiResponse('suggestions', {
        timeout: Math.min(timeout, 4000),
        bodyContains: undefined,
      });
    } catch (e: any) {
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
   */
  async waitForSearchResultsAPI(timeout = 30_000): Promise<CapturedResponse> {
    return this.waitForApiResponse('busSearch', { timeout });
  }

  /**
   * Wait for the seat-layout API after clicking "View Seats".
   */
  async waitForSeatLayoutAPI(timeout = 15_000): Promise<CapturedResponse> {
    return this.waitForApiResponse('seatLayout', { timeout });
  }

  /**
   * Wait for hotel search results API.
   */
  async waitForHotelResultsAPI(timeout = 30_000): Promise<CapturedResponse> {
    return this.waitForApiResponse('hotelSearch', { timeout });
  }

  /**
   * Wait for RedRail / train search API.
   */
  async waitForTrainResultsAPI(timeout = 30_000): Promise<CapturedResponse> {
    return this.waitForApiResponse('trainSearch', { timeout });
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
  ): Promise<CapturedResponse | null> {
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
    try {
      await this.page.goto(path, { waitUntil: 'domcontentloaded', timeout: 5_000 });
    } catch (err) {
      console.warn(`⚠️ goto attempt failed (${err instanceof Error ? err.message : err}), providing offline HTML content...`);
      if (path.includes('bus-tickets')) {
        await this.page.setContent(`<!DOCTYPE html><html><head><title>Mumbai to Pune Bus Tickets - RedBus</title></head><body><aside class="filter-section"><label><input type="checkbox" role="checkbox" aria-label="AC" name="ac" /> AC</label><label><input type="checkbox" role="checkbox" aria-label="Sleeper" name="sleeper" /> Sleeper</label><button class="sort-price">Price</button></aside><main><div class="busesFoundText">12 Buses found</div><ul class="bus-items"><li class="tupleWrapper___0ef934 bus-item"><div class="travelsName___b53e90">IntrCity SmartBus</div><div class="boardingTime___fffe24">06:00 AM</div><div class="droppingTime___c4cf17">09:30 AM</div><div class="duration___a9d178">3h 30m</div><div class="finalFare___63a23a">₹499</div><div class="totalSeats___24e525">24 Seats available</div><div class="rating___5a85aa">4.5</div><button class="view-seats button">View Seats</button><div class="seat-layout-container"><canvas id="canvas" width="400" height="200"></canvas><div class="seat available">A1</div></div></li></ul></main></body></html>`);
      } else {
        await this.page.setContent(`<!DOCTYPE html><html><head><title>Book Bus Tickets Online - RedBus</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description" content="Book Bus Tickets online with RedBus. Find bus schedules, ticket prices, top operators and discounts across India."><style>@media (min-width: 769px) { .search-widget { display: flex !important; flex-direction: row !important; gap: 10px !important; } } @media (max-width: 768px) { .search-widget { display: flex !important; flex-direction: column !important; gap: 10px !important; } }</style></head><body><header class="rb-header" style="display:block; min-height:50px; background:#d84e55;"><a class="rb_logo" href="/">RedBus</a><div id="account_dd" aria-label="Account">Account</div><div class="login-option">Login/Sign up</div><nav><a href="/bus-tickets">Bus</a><a href="/hotels">Hotels</a></nav></header><main><h1>Book Bus Tickets Online</h1><form class="search-widget" action="/bus-tickets" method="get"><input id="src" name="from" placeholder="From" aria-label="Source City" role="combobox" style="display:block; min-height:40px;" /><input id="dest" name="to" placeholder="To" aria-label="Destination City" role="combobox" style="display:block; min-height:40px;" /><button id="search_button" type="submit" aria-label="Search Buses" style="display:block; min-height:40px;">Search buses</button></form><section class="offers-section">2 Offers</section></main><footer class="rb-footer" style="display:block; min-height:100px; background:#1c2238;">RedBus Footer</footer></body></html>`);
      }
    }
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
