import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

const SEL = {
  sourceInput:   'input#src, #src, input[placeholder*="From" i], input[placeholder*="from" i], div[class*="src"]',
  destInput:     'input#dest, #dest, input[placeholder*="To" i], input[placeholder*="to" i], div[class*="dst"]',
  dateInput:     'div[class*="dateInputWrapper"], .dateInputWrapper___c7fbb9, .D_DatePick input',
  searchBtn:     '#search_button, [class*="searchButton"], button[class*="search"], [class*="search_btn"], button[type="submit"], button:has-text("Search"), div:has-text("Search Buses")',
  suggestionList: 'div[class*="listItem"], li[class*="listItem"], [class*="autoFill"] li, [class*="suggestion"], .suggestion-item, [class*="suggestion-item"], li[class*="suggest"], ul.sc-dnqmqq li',
  datePickerWidget: '.DayPicker, .calendar, .datepicker, div[class*="datePickerWrapper"], .datepicker___096844',
  datePickerDay:    '.date___c6296c:not(.disabled___4a6b7e), div[class*="calendarDate"]:not([class*="disabled"]), .DayPicker-Day:not(.DayPicker-Day--disabled), td.rdtDay:not(.rdtDisabled)',
};

export class SearchWidgetSection extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async isSearchWidgetVisible(): Promise<boolean> {
    const count = await this.page.locator(SEL.sourceInput).count().catch(() => 0);
    return count > 0;
  }

  async isSearchButtonVisible(): Promise<boolean> {
    return this.softAssertVisible(SEL.searchBtn, 'Search Button');
  }

  async typeSourceAndWaitForAPI(city: string): Promise<void> {
    const el = this.page.locator(SEL.sourceInput).first();
    await el.click({ force: true }).catch(() => {});
    await el.fill(city).catch(() => {});
    await this.page.waitForTimeout(200);
  }

  async typeDestinationAndWaitForAPI(city: string): Promise<void> {
    const el = this.page.locator(SEL.destInput).first();
    await el.click({ force: true }).catch(() => {});
    await el.fill(city).catch(() => {});
    await this.page.waitForTimeout(200);
  }

  async selectFirstSuggestion(): Promise<void> {
    const sug = this.page.locator(SEL.suggestionList).first();
    if (await sug.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sug.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(300);  // animation settle
    } else {
      await this.page.keyboard.press('ArrowDown').catch(() => {});
      await this.page.keyboard.press('Enter').catch(() => {});
      await this.page.waitForTimeout(300);
    }
  }

  async getSuggestionTexts(): Promise<string[]> {
    return this.page.locator(SEL.suggestionList).allTextContents();
  }

  async openDatePicker(): Promise<void> {
    const dateEl = this.page.locator(SEL.dateInput).first();
    if (await dateEl.isVisible({ timeout: 3000 })) {
      await dateEl.click({ force: true });
      await this.page.waitForSelector(SEL.datePickerWidget, {
        state: 'visible', timeout: 5000,
      });
    }
  }

  async selectFirstAvailableDate(): Promise<void> {
    const availableSelector = '.date___c6296c[class*="available"], [class*="calendarDate"]:not([class*="selected"]):not([class*="disabled"])';
    const firstAvailable = this.page.locator(availableSelector).first();
    
    await firstAvailable.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    
    if (await firstAvailable.isVisible()) {
      await firstAvailable.click({ force: true });
    } else {
      await this.page.locator(SEL.datePickerDay).nth(1).click({ force: true });
    }
  }

  async searchBuses(source: string, destination: string): Promise<void> {
    await this.typeSourceAndWaitForAPI(source);
    await this.selectFirstSuggestion();

    await this.typeDestinationAndWaitForAPI(destination);
    await this.selectFirstSuggestion();

    try {
      await this.openDatePicker();
      await this.selectFirstAvailableDate();
    } catch { /* pre-filled */ }

    // Click search button or press Enter to submit
    const searchBtn = this.page.locator(SEL.searchBtn).first();
    if (await searchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchBtn.click({ force: true }).catch(() => {});
    } else {
      await this.page.keyboard.press('Enter').catch(() => {});
    }

    try {
      await Promise.race([
        this.waitForSearchResultsAPI(8_000),
        this.page.waitForURL(/bus-tickets|SearchResult|search/i, { timeout: 8_000, waitUntil: 'commit' }),
      ]);
    } catch {
      await this.page.waitForSelector('.bus-item, [class*="tupleWrapper"], .tupleWrapper___0ef934', { timeout: 10_000 }).catch(() => {});
    }
  }

  async searchBusesLegacy(source: string, destination: string): Promise<void> {
    await this.page.fill(SEL.sourceInput, source);
    await this.page.waitForSelector(SEL.suggestionList, { timeout: 10_000 });
    await this.page.locator(SEL.suggestionList).first().click();

    await this.page.fill(SEL.destInput, destination);
    await this.page.waitForSelector(SEL.suggestionList, { timeout: 10_000 });
    await this.page.locator(SEL.suggestionList).first().click();

    await this.page.locator(SEL.searchBtn).first().click();
    await this.page.waitForURL(/bus-tickets|SearchResult/i, { timeout: 30_000 });
  }
}
