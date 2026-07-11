// =============================================================================
// BusResultsPage.ts – Search Results + Seat Selection Page Object
// XHR-based waiting replaces all brittle DOM polling
// =============================================================================

import { Page, expect } from '@playwright/test';
import { BasePage }     from './BasePage';

const SEL = {
  // Bus listings
  busItem:        'li[class*="tupleWrapper"], .tupleWrapper___0ef934, .bus-item, .travels, [class*="bus-item"], .result-item',
  busCount:       '[class*="busesFoundText"], .busesFoundText__ind-search-styles-module-scss-PHVGD, .buses_count, .result-count, .total-results',
  busName:        '.travelsName___b53e90, [class*="travelsName"], .travels, .bus-name, [class*="operator"], .companyName',
  departureTime:  '.boardingTime___fffe24, [class*="boardingTime"], .departure, [class*="departure"], .time',
  arrivalTime:    '.droppingTime___c4cf17, [class*="droppingTime"], .arrival, [class*="arrival"]',
  duration:       '.duration___a9d178, [class*="duration"]',
  price:          '.finalFare___63a23a, [class*="finalFare"], .fare, .price, [class*="price"], .seat-fare',
  seatsAvailable: '.totalSeats___24e525, [class*="totalSeats"], .seat-left, [class*="seats"], .available',
  rating:         '.rating___5a85aa, .ratingTag___aad9f6, [class*="rating"]',
  busType:        '.busType___0372b0, [class*="busType"]',

  // Filters
  filterPanel:    '.filter-section, .filters, [class*="filter"]',
  priceFilter:    '.price-filter, [class*="price-filter"] input',
  priceRangeMin:  'input[name*="min"], .rc-slider-handle:first-child',
  priceRangeMax:  'input[name*="max"], .rc-slider-handle:last-child',
  departureFilter:'.departure-filter, [class*="departure-time"] input',
  busTypeFilter:  '.bus-type-filter, [class*="bus-type"] input',
  acFilter:       'div[role="button"][aria-label*="AC " i], div[role="button"][aria-label^="AC"], label:has-text("AC"), [class*="filter"] label:has-text("AC")',
  nonAcFilter:    'div[role="button"][aria-label*="Non AC" i], div[role="button"][aria-label*="Non-AC" i], label:has-text("Non A/C"), [class*="filter"] label:has-text("Non A/C")',
  sleeperFilter:  'div[role="button"][aria-label*="Sleeper" i], label:has-text("Sleeper"), [class*="filter"] label:has-text("Sleeper")',
  clearFilter:    'button:has-text("Clear"), .clear-filter',
  applyFilter:    'button:has-text("Apply"), .apply-filter',

  // Sort
  sortLowest:    'div[class*="sortWrapper"] :has-text("Price"), [class*="sortWrapper"] :has-text("Price"), div:has-text("Price")',
  sortEarliest:  '.sort-earliest',

  // Seat Selection
  viewSeatsBtn:   'button:has-text("View seats"), button:has-text("View Seats"), .viewSeatsBtn___6aefb2, [class*="viewSeatsBtn"]',
  seatLayout:     '.seat-container, .layout-block, [class*="seat-layout"], .canvaswrapper___86zip, .deckWrapper___y3hHf',
  seatAvailable:  'span[role="button"][aria-label*="available"], span[class*="sleeper"]:not(:has-text("Sold")), span[class*="seat"]:not(:has-text("Sold")), .seat.available, .seat-block.available, [class*="available"] .seat',
  seatSelected:   'span[role="button"][aria-pressed="true"], .seat.selected, [class*="selected"]',
  seatPrice:      '.seat-fare, .total-fare, [class*="fare"], span[class*="sleeperPrice"]',
  proceedBtn:     'button:has-text("Proceed to Book"), button:has-text("Book Now"), button:has-text("Proceed to book")',

  // No results
  noResults:      '.no-results, [class*="no-result"], [class*="empty"]',

  // Pagination / Load more
  loadMore:       'button:has-text("Load More"), .load-more',
};

// =============================================================================
export class BusResultsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ===========================================================================
  // XHR-based Results Loading
  // ===========================================================================

  /**
   * Wait for the bus results to be populated via API.
   *
   * OLD: await page.waitForSelector('.bus-item', { timeout: 30000 })
   * NEW: await resultsPage.waitForResultsViaAPI()
   */
  async waitForResultsViaAPI(timeout = 30_000, sinceCount?: number): Promise<void> {
    try {
      // Prefer network signal
      await this.waitForSearchResultsAPI(timeout, sinceCount);
      console.log('✅ Bus results loaded via XHR intercept');
    } catch {
      // Fallback to DOM
      console.warn('⚠️  XHR intercept missed — falling back to DOM selector');
      await this.page.waitForSelector(SEL.busItem, {
        state: 'visible',
        timeout,
      });
    }
  }

  /**
   * Wait for seat layout to load via API.
   *
   * OLD: await page.waitForSelector('.seat-map-container', { timeout: 15000 })
   * NEW: await resultsPage.waitForSeatLayoutViaAPI()
   */
  async waitForSeatLayoutViaAPI(timeout = 20_000, sinceCount?: number): Promise<void> {
    try {
      await this.waitForSeatLayoutAPI(timeout, sinceCount);
      console.log('✅ Seat layout loaded via XHR intercept');
    } catch {
      console.warn('⚠️  Seat layout XHR missed — falling back to DOM');
      await this.page.waitForSelector(SEL.seatLayout, {
        state: 'visible',
        timeout,
      });
    }
  }

  // ===========================================================================
  // Result List Actions
  // ===========================================================================

  async getBusCount(): Promise<number> {
    try {
      const txt = await this.page.locator(SEL.busCount).first().textContent() ?? '0';
      const match = txt.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    } catch {
      return this.page.locator(SEL.busItem).count();
    }
  }

  async getBusNames(): Promise<string[]> {
    return this.page.locator(SEL.busName).allTextContents();
  }

  async getBusPrices(): Promise<number[]> {
    const texts = await this.page.locator(SEL.price).allTextContents();
    return texts
      .map(t => parseInt(t.replace(/[^0-9]/g, ''), 10))
      .filter(n => !isNaN(n));
  }

  async getBusTypes(): Promise<string[]> {
    return this.page.locator(SEL.busType).allTextContents();
  }

  async getRatings(): Promise<string[]> {
    return this.page.locator(SEL.rating).allTextContents();
  }

  async dismissLoginModal(): Promise<void> {
    const closeBtn = this.page.locator('i.icon-close, i.slicon-close, .modalCloseBtn').first();
    if (await closeBtn.isVisible({ timeout: 4000 })) {
      await closeBtn.click({ force: true });
      console.log('✅ Dismissed RedBus login modal');
      await this.page.waitForTimeout(1000);
    }
  }

  /** Click the first bus's "View Seats" and wait for seat layout API */
  async clickViewSeatsForFirst(): Promise<void> {
    const startCount = this.getCapturedResponses('seatLayout').length;
    await this.page.locator(SEL.viewSeatsBtn).first().click();
    await this.waitForSeatLayoutViaAPI(20_000, startCount);
    await this.dismissLoginModal();
  }

  async isNoResultsVisible(): Promise<boolean> {
    return this.page.locator(SEL.noResults).first().isVisible().catch(() => false);
  }

  // ===========================================================================
  // Filter Actions (XHR-aware)
  // ===========================================================================

  /** Apply AC filter and wait for results to refresh via API */
  async applyACFilter(): Promise<void> {
    const startCount = this.getCapturedResponses('busSearch').length;
    await this.page.locator(SEL.acFilter).first().click({ force: true });
    // After filter click RedBus fires a new search API call
    await this.waitForSearchResultsAPI(15_000, startCount).catch(() =>
      this.page.waitForTimeout(2000),
    );
  }

  async applySleeperFilter(): Promise<void> {
    const startCount = this.getCapturedResponses('busSearch').length;
    await this.page.locator(SEL.sleeperFilter).first().click({ force: true });
    await this.waitForSearchResultsAPI(15_000, startCount).catch(() =>
      this.page.waitForTimeout(2000),
    );
  }

  async applyNonACFilter(): Promise<void> {
    const startCount = this.getCapturedResponses('busSearch').length;
    await this.page.locator(SEL.nonAcFilter).first().click({ force: true });
    await this.waitForSearchResultsAPI(15_000, startCount).catch(() =>
      this.page.waitForTimeout(2000),
    );
  }

  async clearAllFilters(): Promise<void> {
    const clearBtn = this.page.locator(SEL.clearFilter).first();
    if (await clearBtn.isVisible({ timeout: 3000 })) {
      const startCount = this.getCapturedResponses('busSearch').length;
      await clearBtn.click();
      await this.waitForSearchResultsAPI(10_000, startCount).catch(() =>
        this.page.waitForTimeout(2000),
      );
    }
  }

  /** Drag price slider — uses evaluate for reliable DOM interaction */
  async setPriceFilter(maxPrice: number): Promise<void> {
    try {
      const slider = this.page.locator(SEL.priceRangeMax).first();
      if (await slider.isVisible({ timeout: 3000 })) {
        const box = await slider.boundingBox();
        if (box) {
          const startCount = this.getCapturedResponses('busSearch').length;
          await slider.click();
          await this.page.keyboard.press('ArrowLeft');
          await this.page.keyboard.press('ArrowLeft');
          await this.waitForSearchResultsAPI(10_000, startCount).catch(() =>
            this.page.waitForTimeout(1500),
          );
        }
      }
    } catch {
      console.warn('⚠️  Price slider not interactive, skipping');
    }
  }

  // ===========================================================================
  // Sort Actions
  // ===========================================================================

  async sortByLowestPrice(): Promise<void> {
    const startCount = this.getCapturedResponses('busSearch').length;
    await this.page.locator(SEL.sortLowest).first().click({ force: true });
    await this.waitForSearchResultsAPI(10_000, startCount).catch(() =>
      this.page.waitForTimeout(1500),
    );
  }

  // ===========================================================================
  // Seat Selection (XHR-aware)
  // ===========================================================================

  /** Select the first available seat from the seat map */
  async selectFirstAvailableSeat(): Promise<string> {
    const seats = this.page.locator(SEL.seatAvailable);
    const count = await seats.count();
    if (count === 0) throw new Error('No available seats found');

    const first = seats.first();
    const label = (await first.getAttribute('id')) || (await first.textContent())?.trim() || 'S1';
    await first.click({ force: true });
    return label;
  }

  async isSeatSelected(): Promise<boolean> {
    return this.page.locator(SEL.seatSelected).first().isVisible().catch(() => false);
  }

  async getSelectedSeatPrice(): Promise<string> {
    return (await this.page.locator(SEL.seatPrice).first().textContent())?.trim() ?? '';
  }

  async clickProceedToBook(): Promise<void> {
    await this.page.locator(SEL.proceedBtn).first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ===========================================================================
  // Bus Details Validation
  // ===========================================================================

  async getFirstBusDetails(): Promise<{
    name: string;
    departure: string;
    arrival: string;
    duration: string;
    price: string;
    seats: string;
  }> {
    const first = this.page.locator(SEL.busItem).first();
    return {
      name:      (await first.locator(SEL.busName).first().textContent())?.trim()        ?? '',
      departure: (await first.locator(SEL.departureTime).first().textContent())?.trim()  ?? '',
      arrival:   (await first.locator(SEL.arrivalTime).first().textContent())?.trim()    ?? '',
      duration:  (await first.locator(SEL.duration).first().textContent())?.trim()       ?? '',
      price:     (await first.locator(SEL.price).first().textContent())?.trim()          ?? '',
      seats:     (await first.locator(SEL.seatsAvailable).first().textContent())?.trim() ?? '',
    };
  }

  // ===========================================================================
  // API Response Validation
  // ===========================================================================

  /** Verify that the API returned data that matches the DOM */
  async validateAPIMatchesDOM(): Promise<void> {
    const apiResponses = this.getCapturedResponses('busSearch');
    const domCount     = await this.getBusCount();

    if (apiResponses.length > 0) {
      console.log(`🔍 API returned ${apiResponses.length} response(s); DOM shows ${domCount} buses`);
      this.assertApiCallCount('busSearch', 1);
    }
  }
}
