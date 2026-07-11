// =============================================================================
// HotelPage.ts – RedBus Hotels Page Object
// =============================================================================

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

const SEL = {
  cityInput:      'input[placeholder*="city" i], input[placeholder*="hotel" i], #cityInput, .city-input input',
  checkInInput:   'input[placeholder*="check in" i], input[placeholder*="Check-In" i], .check-in input',
  checkOutInput:  'input[placeholder*="check out" i], input[placeholder*="Check-Out" i]',
  guestInput:     'input[placeholder*="guest" i], .guests input, #guests',
  searchBtn:      'button:has-text("Search"), button:has-text("Search Hotels"), .hotel-search-btn',

  suggestionList: 'ul li, .autocomplete-list li, [class*="suggestions"] li',

  // Results
  hotelCard:      '.hotel-card, [class*="hotel-card"], .property-card, .result-item',
  hotelName:      '.hotel-name, [class*="hotel-name"], h2, h3',
  hotelPrice:     '.price, .fare, [class*="price"]',
  hotelRating:    '.rating, [class*="rating"]',
  hotelLocation:  '.location, [class*="location"], .address',

  // Filters
  priceFilter:    '[class*="price-filter"]',
  starFilter:     '[class*="star"] input, .star-rating-filter input',
  amenityFilter:  '[class*="amenity"] input',
};

// =============================================================================
export class HotelPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.goto('/hotels');
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissCookieBanner();
  }

  // ─── XHR-aware city input ──────────────────────────────────────────────────

  async typeCityAndWaitForAPI(city: string): Promise<void> {
    const el = this.page.locator(SEL.cityInput).first();
    await el.click({ clickCount: 3 });
    await el.fill(city);

    // XHR wrapper
    await this.waitForSuggestionsAPI(city, 10_000);
    await this.page.waitForSelector(SEL.suggestionList, { state: 'visible', timeout: 5_000 });
  }

  async selectFirstCitySuggestion(): Promise<void> {
    await this.page.locator(SEL.suggestionList).first().click();
  }

  // ─── Date helpers ──────────────────────────────────────────────────────────

  async setCheckInDate(): Promise<void> {
    try {
      await this.page.locator(SEL.checkInInput).first().click();
      await this.page.waitForTimeout(500);
      // Pick a day that's about 3 days from now
      const days = this.page.locator('.DayPicker-Day:not(.DayPicker-Day--disabled), td.rdtDay:not(.rdtDisabled)');
      await days.nth(2).click();
    } catch { /* pre-filled */ }
  }

  async setCheckOutDate(): Promise<void> {
    try {
      await this.page.locator(SEL.checkOutInput).first().click();
      await this.page.waitForTimeout(500);
      const days = this.page.locator('.DayPicker-Day:not(.DayPicker-Day--disabled), td.rdtDay:not(.rdtDisabled)');
      await days.nth(4).click();
    } catch { /* pre-filled */ }
  }

  // ─── Search ────────────────────────────────────────────────────────────────

  async searchHotels(city: string): Promise<void> {
    await this.typeCityAndWaitForAPI(city);
    await this.selectFirstCitySuggestion();
    await this.setCheckInDate();
    await this.setCheckOutDate();

    await this.page.locator(SEL.searchBtn).first().click();

    // XHR wrapper for hotel results
    try {
      await this.waitForHotelResultsAPI(30_000);
      console.log('✅ Hotel results loaded via XHR');
    } catch {
      await this.page.waitForURL(/hotel/i, { timeout: 30_000 });
    }
  }

  // ─── Result Assertions ─────────────────────────────────────────────────────

  async getHotelCount(): Promise<number> {
    return this.page.locator(SEL.hotelCard).count();
  }

  async getHotelNames(): Promise<string[]> {
    return this.page.locator(SEL.hotelName).allTextContents();
  }

  async getHotelPrices(): Promise<number[]> {
    const texts = await this.page.locator(SEL.hotelPrice).allTextContents();
    return texts
      .map(t => parseInt(t.replace(/[^0-9]/g, ''), 10))
      .filter(n => !isNaN(n));
  }

  async applyStarFilter(stars: number): Promise<void> {
    const label = this.page.locator(`label:has-text("${stars} Star")`).first();
    if (await label.isVisible({ timeout: 3000 })) {
      await label.click();
      await this.waitForHotelResultsAPI(10_000).catch(() =>
        this.page.waitForTimeout(2000),
      );
    }
  }

  async isHotelPageLoaded(): Promise<boolean> {
    return this.softAssertVisible(SEL.cityInput, 'Hotel City Input');
  }
}
