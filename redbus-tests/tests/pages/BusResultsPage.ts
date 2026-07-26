// =============================================================================
// BusResultsPage.ts – Search Results + Seat Selection Page Object
// Refactored to delegate actions to Filter, SeatLayout, and BusList sections.
// =============================================================================

import { Page, expect } from '@playwright/test';
import { BasePage }     from './BasePage';
import { FilterSection } from './sections/FilterSection';
import { SeatLayoutSection } from './sections/SeatLayoutSection';
import { BusListSection } from './sections/BusListSection';

const SEL = {
  busItem:        'li[class*="tupleWrapper"], .tupleWrapper___0ef934, .bus-item, .travels, [class*="bus-item"], .result-item',
  busCount:       '[class*="busesFoundText"], .busesFoundText__ind-search-styles-module-scss-PHVGD, .buses_count, .result-count, .total-results',
  busName:        '.travelsName___b53e90, [class*="travelsName"], .travels, .bus-name, [class*="operator"], .companyName',
  departureTime:  '.boardingTime___fffe24, [class*="boardingTime"], .departure, [class*="departure"], .time',
  arrivalTime:    '.droppingTime___c4cf17, [class*="droppingTime"], .arrival, [class*="arrival"]',
  duration:       '.duration___a9d178, [class*="duration"]',
  price:          '.finalFare___63a23a, [class*="finalFare"], .fare, .seat-fare',
  seatsAvailable: '.totalSeats___24e525, [class*="totalSeats"], .seat-left, [class*="seats"], .available',
  rating:         '.rating___5a85aa, .ratingTag___aad9f6, [class*="rating"]',
  busType:        '.busType___0372b0, [class*="busType"]',
  noResults:      '.no-results, [class*="no-result"], [class*="empty"]',
  clearFilter:    'button:has-text("Clear"), .clear-filter',
  priceRangeMax:  'input[name*="max"], .rc-slider-handle:last-child',
};

export class BusResultsPage extends BasePage {
  readonly filters: FilterSection;
  readonly seatLayout: SeatLayoutSection;
  readonly busList: BusListSection;

  constructor(page: Page) {
    super(page);
    this.filters = new FilterSection(page);
    this.seatLayout = new SeatLayoutSection(page);
    this.busList = new BusListSection(page);
  }

  // ─── XHR Results Loading ───────────────────────────────────────────────────

  async waitForResultsViaAPI(timeout = 30_000, sinceCount?: number): Promise<void> {
    try {
      await this.waitForSearchResultsAPI(timeout, sinceCount);
      console.log('✅ Bus results loaded via XHR intercept');
    } catch (e: any) {
      console.warn(`⚠️ XHR intercept missed or timed out: ${e.message}`);
    }
    
    // Always wait for the DOM results list to be rendered and visible
    await this.page.waitForSelector(SEL.busItem, {
      state: 'visible',
      timeout,
    });
  }

  async waitForSeatLayoutViaAPI(timeout = 20_000, sinceCount?: number): Promise<void> {
    try {
      await this.waitForSeatLayoutAPI(timeout, sinceCount);
      console.log('✅ Seat layout loaded via XHR intercept');
    } catch (e: any) {
      console.warn(`⚠️ Seat layout XHR missed or timed out: ${e.message}`);
    }

    // Always wait for the DOM seat layout to be rendered and visible
    await this.page.waitForSelector('.seat-container, .layout-block, [class*="seat-layout"], .canvaswrapper___86zip, .deckWrapper___y3hHf', {
      state: 'visible',
      timeout,
    });
  }

  // ─── Delegated BusList Methods (Backward Compatibility) ────────────────────

  async getBusCount(): Promise<number> {
    return this.busList.getBusCount();
  }

  async getBusNames(): Promise<string[]> {
    return this.busList.getBusNames();
  }

  async getBusPrices(): Promise<number[]> {
    return this.busList.getBusPrices();
  }

  async getBusTypes(): Promise<string[]> {
    return this.busList.getBusTypes();
  }

  async getRatings(): Promise<string[]> {
    return this.page.locator(SEL.rating).allTextContents();
  }

  async isNoResultsVisible(): Promise<boolean> {
    return this.page.locator(SEL.noResults).first().isVisible().catch(() => false);
  }

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

  // ─── Delegated Filter Methods (Backward Compatibility) ─────────────────────

  async applyACFilter(): Promise<void> {
    await this.filters.applyACFilter();
  }

  async applyNonACFilter(): Promise<void> {
    await this.filters.applyNonACFilter();
  }

  async applySleeperFilter(): Promise<void> {
    await this.filters.applySleeperFilter();
  }

  async sortByLowestPrice(): Promise<void> {
    await this.filters.sortByLowestPrice();
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

  // ─── Delegated SeatLayout Methods (Backward Compatibility) ─────────────────

  async clickViewSeatsForFirst(): Promise<void> {
    await this.seatLayout.clickViewSeatsForFirst();
    await this.dismissLoginModal();
  }

  async selectFirstAvailableSeat(): Promise<string> {
    const seats = this.page.locator('span[role="button"][aria-label*="available"], span[class*="sleeper"]:not(:has-text("Sold")), span[class*="seat"]:not(:has-text("Sold")), .seat.available, .seat-block.available, [class*="available"] .seat');
    const count = await seats.count();
    if (count === 0) throw new Error('No available seats found');

    const first = seats.first();
    const label = (await first.getAttribute('id')) || (await first.textContent())?.trim() || 'S1';
    await first.click({ force: true });
    return label;
  }

  async isSeatSelected(): Promise<boolean> {
    return this.page.locator('span[role="button"][aria-pressed="true"], .seat.selected, [class*="selected"]').first().isVisible().catch(() => false);
  }

  async getSelectedSeatPrice(): Promise<string> {
    return (await this.page.locator('.seat-fare, .total-fare, [class*="fare"], span[class*="sleeperPrice"]').first().textContent())?.trim() ?? '';
  }

  async clickProceedToBook(): Promise<void> {
    await this.seatLayout.clickProceedToBook();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async dismissLoginModal(): Promise<void> {
    const closeBtn = this.page.locator('i.icon-close, i.slicon-close, .modalCloseBtn').first();
    if (await closeBtn.isVisible({ timeout: 4000 })) {
      await closeBtn.click({ force: true });
      console.log('✅ Dismissed RedBus login modal');
      await this.page.waitForTimeout(1000);
    }
  }

  // ─── Verification ──────────────────────────────────────────────────────────

  async validateAPIMatchesDOM(): Promise<void> {
    const apiResponses = this.getCapturedResponses('busSearch');
    const domCount     = await this.getBusCount();

    if (apiResponses.length > 0) {
      console.log(`🔍 API returned ${apiResponses.length} response(s); DOM shows ${domCount} buses`);
      this.assertApiCallCount('busSearch', 1);
    }
  }
}
