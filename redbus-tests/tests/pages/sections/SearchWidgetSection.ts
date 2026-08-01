import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

const SEL = {
  sourceInput:   '#src, #srcinput, .D_input input, div[class*="src"] input, div[class*="search"] input, input[placeholder*="from" i], input[id*="source" i], [class*="srcInput"]',
  destInput:     '#dest, #dst, #destinput, div[class*="dest"] input, div[class*="dst"] input, input[placeholder*="to" i], input[id*="dest" i], [class*="destInput"]',
  dateInput:     'div[class*="dateInputWrapper"], .dateInputWrapper___c7fbb9, .D_DatePick input',
  searchBtn:     '.searchButtonWrapper___48550e, button[class*="searchButton"], .search_btn, button[type="submit"], button:has-text("Search buses")',
  suggestionList: '.suggestion-item, [class*="suggestion-item"], li[class*="suggest"], ul.sc-dnqmqq li',
  datePickerWidget: '.DayPicker, .calendar, .datepicker, div[class*="datePickerWrapper"], .datepicker___096844',
  datePickerDay:    '.date___c6296c:not(.disabled___4a6b7e), div[class*="calendarDate"]:not([class*="disabled"]), .DayPicker-Day:not(.DayPicker-Day--disabled), td.rdtDay:not(.rdtDisabled)',
};

export class SearchWidgetSection extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async isSearchWidgetVisible(): Promise<boolean> {
    return this.softAssertVisible(SEL.sourceInput, 'Source Input');
  }

  async isSearchButtonVisible(): Promise<boolean> {
    return this.softAssertVisible(SEL.searchBtn, 'Search Button');
  }

  async typeSourceAndWaitForAPI(city: string): Promise<void> {
    const startCount = this.getCapturedResponses('suggestions').length;
    const el = this.page.locator(SEL.sourceInput).first();
    await el.waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {});
    await el.click({ force: true }).catch(async () => {
      await this.page.locator('div[class*="src"], div[class*="source"], .D_input').first().click({ force: true }).catch(() => {});
    });
    await el.fill('').catch(() => {});
    await el.type(city, { delay: 80 }).catch(() => {});

    await this.waitForSuggestionsAPI(city, 8_000, startCount).catch(() => {});

    await this.page.waitForSelector(SEL.suggestionList, {
      state: 'visible', timeout: 5_000,
    }).catch(() => {});
  }

  async typeDestinationAndWaitForAPI(city: string): Promise<void> {
    const startCount = this.getCapturedResponses('suggestions').length;
    const el = this.page.locator(SEL.destInput).first();
    await el.waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {});
    await el.click({ force: true }).catch(async () => {
      await this.page.locator('div[class*="dest"], div[class*="dst"], .D_input').first().click({ force: true }).catch(() => {});
    });
    await el.fill('').catch(() => {});
    await el.type(city, { delay: 80 }).catch(() => {});

    await this.waitForSuggestionsAPI(city, 8_000, startCount).catch(() => {});
    await this.page.waitForSelector(SEL.suggestionList, {
      state: 'visible', timeout: 5_000,
    }).catch(() => {});
  }

  async selectFirstSuggestion(): Promise<void> {
    await this.page.locator(SEL.suggestionList).first().click();
    await this.page.waitForTimeout(300);  // animation settle
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

    const startCount = this.getCapturedResponses('busSearch').length;
    await this.page.locator(SEL.searchBtn).first().click({ force: true });

    try {
      await this.waitForSearchResultsAPI(30_000, startCount);
    } catch {
      await this.page.waitForURL(/bus-tickets|SearchResult|search/i, { timeout: 30_000, waitUntil: 'domcontentloaded' }).catch(() => {});
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
