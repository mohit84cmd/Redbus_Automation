// =============================================================================
// TrainPage.ts – RedBus RedRail / Train Page Object
// =============================================================================

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

const SEL = {
  fromInput:     'input[placeholder*="from" i], input[placeholder*="Origin" i], #trainFrom',
  toInput:       'input[placeholder*="to" i], input[placeholder*="Destination" i], #trainTo',
  dateInput:     'input[placeholder*="date" i], .journey-date input',
  searchBtn:     'button:has-text("Search"), button:has-text("Search Trains"), .train-search-btn',

  suggestionList:'ul li, [class*="suggestion"] li, .autocomplete li',

  // Results
  trainCard:     '.train-item, [class*="train-card"], .train-result',
  trainName:     '.train-name, [class*="train-name"], .name',
  trainNumber:   '.train-number, [class*="train-number"]',
  departure:     '.departure-time, [class*="departure"]',
  arrival:       '.arrival-time, [class*="arrival"]',
  price:         '.fare, .price, [class*="price"]',
  quota:         '.quota, [class*="quota"]',
  availability:  '.available, [class*="availability"]',

  // Class filter
  classFilter:   '[class*="class"] input, .travel-class select',
  quotaFilter:   '[class*="quota"] select, .quota-select',
};

// =============================================================================
export class TrainPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.goto('/redRail');
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissCookieBanner();
  }

  // ─── XHR-aware station input ───────────────────────────────────────────────

  async typeFromStationWithAPI(station: string): Promise<void> {
    const el = this.page.locator(SEL.fromInput).first();
    await el.click({ clickCount: 3 });
    await el.fill(station);

    await this.waitForSuggestionsAPI(station, 10_000);
    await this.page.waitForSelector(SEL.suggestionList, { state: 'visible', timeout: 5_000 });
  }

  async typeToStationWithAPI(station: string): Promise<void> {
    const el = this.page.locator(SEL.toInput).first();
    await el.click({ clickCount: 3 });
    await el.fill(station);

    await this.waitForSuggestionsAPI(station, 10_000);
    await this.page.waitForSelector(SEL.suggestionList, { state: 'visible', timeout: 5_000 });
  }

  async selectFirstSuggestion(): Promise<void> {
    await this.page.locator(SEL.suggestionList).first().click();
    await this.page.waitForTimeout(300);
  }

  async searchTrains(from: string, to: string): Promise<void> {
    await this.typeFromStationWithAPI(from);
    await this.selectFirstSuggestion();

    await this.typeToStationWithAPI(to);
    await this.selectFirstSuggestion();

    // Date
    try {
      await this.page.locator(SEL.dateInput).first().click();
      await this.page.waitForTimeout(500);
      await this.page.locator('.DayPicker-Day:not(.DayPicker-Day--disabled)').first().click();
    } catch { /* pre-filled */ }

    await this.page.locator(SEL.searchBtn).first().click();

    // XHR wrapper for train results
    try {
      await this.waitForTrainResultsAPI(30_000);
      console.log('✅ Train results loaded via XHR');
    } catch {
      await this.page.waitForURL(/rail|train/i, { timeout: 30_000 });
    }
  }

  // ─── Result helpers ────────────────────────────────────────────────────────

  async getTrainCount(): Promise<number> {
    return this.page.locator(SEL.trainCard).count();
  }

  async getTrainNames(): Promise<string[]> {
    return this.page.locator(SEL.trainName).allTextContents();
  }

  async getTrainNumbers(): Promise<string[]> {
    return this.page.locator(SEL.trainNumber).allTextContents();
  }

  async isTrainPageLoaded(): Promise<boolean> {
    return this.softAssertVisible(SEL.fromInput, 'Train From Input');
  }
}
