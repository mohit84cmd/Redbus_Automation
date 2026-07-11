// =============================================================================
// HomePage.ts  – RedBus Homepage Page Object
// Uses XHR-aware wrappers from BasePage for all network operations
// =============================================================================

import { Page, expect } from '@playwright/test';
import { BasePage }     from './BasePage';
import { getFutureDate } from '../utils/testData';

// ─── Selectors ────────────────────────────────────────────────────────────────
const SEL = {
  // Header / Nav
  logo:          '.rb-header img, .header-logo img, img[alt*="redbus" i]',
  navBus:        'a[href*="bus"], .rb-nav a:has-text("Bus")',
  navHotels:     'a[href*="hotel" i], li:has-text("Hotels") a, .rb-nav a:has-text("Hotel")',
  navTrain:      'a[href*="rail" i], a[href*="train" i], .rb-nav a:has-text("Rail")',

  // Search Widget
  sourceInput:   '#srcinput, #src, input[placeholder*="from" i], input[id*="source" i]',
  destInput:     '#destinput, #dst, input[placeholder*="to" i], input[id*="dest" i]',
  dateInput:     'div[class*="dateInputWrapper"], .dateInputWrapper___c7fbb9, .D_DatePick input',
  searchBtn:     '.searchButtonWrapper___48550e, button[class*="searchButton"], .search_btn, button[type="submit"], button:has-text("Search buses")',

  // Autocomplete
  suggestionList: '.suggestion-item, [class*="suggestion-item"], li[class*="suggest"], ul.sc-dnqmqq li',
  suggestionItem: '.suggestion-item:first-child, [class*="suggestion-item"]:first-child',

  // Date Picker
  datePickerWidget: '.DayPicker, .calendar, .datepicker, div[class*="datePickerWrapper"], .datepicker___096844',
  datePickerDay:    '.date___c6296c:not(.disabled___4a6b7e), div[class*="calendarDate"]:not([class*="disabled"]), .DayPicker-Day:not(.DayPicker-Day--disabled), td.rdtDay:not(.rdtDisabled)',

  // Banners / Offers
  offersBanner:  '.offers-banner, .promo-banner, [class*="offer"]',
  heroSection:   '.hero-section, .search-widget, .main-search',

  // Footer
  footer:        'footer, .rb-footer, [class*="footer"]',
  footerLinks:   'footer a, .rb-footer a',

  // Misc
  accountBtn:    'button:has-text("Account"), [aria-label="Account"], .icon-account',
  loginBtn:      'span:has-text("Sign up"), button:has-text("Sign up"), button:has-text("Login"), .login-btn',
  helpBtn:       'a:has-text("Help"), .help-link, a[href*="help"]',
  appDownload:   '.app-download, [class*="app-download"]',
};

// =============================================================================
export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ===========================================================================
  // Navigation
  // ===========================================================================

  async navigate(): Promise<void> {
    await this.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissCookieBanner();
  }

  // ===========================================================================
  // UI Validation
  // ===========================================================================

  async isLogoVisible(): Promise<boolean> {
    return this.softAssertVisible(SEL.logo, 'RedBus Logo');
  }

  async isSearchWidgetVisible(): Promise<boolean> {
    return this.softAssertVisible(SEL.sourceInput, 'Source Input');
  }

  async isSearchButtonVisible(): Promise<boolean> {
    return this.softAssertVisible(SEL.searchBtn, 'Search Button');
  }

  async areNavLinksVisible(): Promise<boolean> {
    const bus    = await this.softAssertVisible(SEL.navBus,    'Nav: Bus');
    const hotel  = await this.softAssertVisible(SEL.navHotels, 'Nav: Hotels');
    return bus || hotel;   // at least one must exist
  }

  async isFooterVisible(): Promise<boolean> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    return this.softAssertVisible(SEL.footer, 'Footer');
  }

  async isLoginButtonVisible(): Promise<boolean> {
    const accountVisible = await this.softAssertVisible(SEL.accountBtn, 'Account Button');
    if (!accountVisible) return false;
    try {
      await this.page.locator(SEL.accountBtn).first().click();
      await this.page.waitForTimeout(500);
      const loginVisible = await this.softAssertVisible(SEL.loginBtn, 'Login/Sign up Option');
      return loginVisible;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // XHR-based Source/Destination input
  // ===========================================================================

  /**
   * Type into Source field and wait for autocomplete API response.
   *
   * OLD: await this.page.waitForSelector('ul.sc-dnqmqq li', { timeout: 10000 })
   * NEW: await homePage.typeSourceAndWaitForAPI('Mumbai')
   */
  async typeSourceAndWaitForAPI(city: string): Promise<void> {
    const startCount = this.getCapturedResponses('suggestions').length;
    const el = this.page.locator(SEL.sourceInput).first();
    await el.click({ force: true });
    await el.fill('');
    await el.type(city, { delay: 80 });

    // XHR wrapper — waits for network, NOT DOM
    await this.waitForSuggestionsAPI(city, 10_000, startCount);

    // DOM is now guaranteed ready
    await this.page.waitForSelector(SEL.suggestionList, {
      state: 'visible', timeout: 5_000,
    });
  }

  /**
   * Type into Destination field and wait for autocomplete API.
   */
  async typeDestinationAndWaitForAPI(city: string): Promise<void> {
    const startCount = this.getCapturedResponses('suggestions').length;
    const el = this.page.locator(SEL.destInput).first();
    await el.click({ force: true });
    await el.fill('');
    await el.type(city, { delay: 80 });

    await this.waitForSuggestionsAPI(city, 10_000, startCount);
    await this.page.waitForSelector(SEL.suggestionList, {
      state: 'visible', timeout: 5_000,
    });
  }

  /** Click the first suggestion in the dropdown */
  async selectFirstSuggestion(): Promise<void> {
    await this.page.locator(SEL.suggestionList).first().click();
    await this.page.waitForTimeout(300);  // animation settle
  }

  /** Get all visible suggestion texts */
  async getSuggestionTexts(): Promise<string[]> {
    return this.page.locator(SEL.suggestionList).allTextContents();
  }

  // ===========================================================================
  // Date Selection
  // ===========================================================================

  async openDatePicker(): Promise<void> {
    const dateEl = this.page.locator(SEL.dateInput).first();
    if (await dateEl.isVisible({ timeout: 3000 })) {
      await dateEl.click({ force: true });
      await this.page.waitForSelector(SEL.datePickerWidget, {
        state: 'visible', timeout: 5000,
      });
    }
  }

  /** Click the first available (non-disabled) day in the date picker */
  async selectFirstAvailableDate(): Promise<void> {
    const availableSelector = '.date___c6296c[class*="available"], [class*="calendarDate"]:not([class*="selected"]):not([class*="disabled"])';
    const firstAvailable = this.page.locator(availableSelector).first();
    
    await firstAvailable.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    
    if (await firstAvailable.isVisible()) {
      await firstAvailable.click({ force: true });
    } else {
      // Fallback: click index 1 (tomorrow) of the general list to avoid clicking already selected today's date
      await this.page.locator(SEL.datePickerDay).nth(1).click({ force: true });
    }
  }

  // ===========================================================================
  // Full Bus Search (XHR-aware)
  // ===========================================================================

  /**
   * Complete search flow using XHR validation at each step.
   */
  async searchBuses(source: string, destination: string): Promise<void> {
    // 1. Source
    await this.typeSourceAndWaitForAPI(source);
    await this.selectFirstSuggestion();

    // 2. Destination
    await this.typeDestinationAndWaitForAPI(destination);
    await this.selectFirstSuggestion();

    // 3. Date
    try {
      await this.openDatePicker();
      await this.selectFirstAvailableDate();
    } catch { /* date may already be pre-filled */ }

    // 4. Click Search
    const startCount = this.getCapturedResponses('busSearch').length;
    await this.page.locator(SEL.searchBtn).first().click({ force: true });

    // 5. Wait for results API (XHR wrapper)
    try {
      await this.waitForSearchResultsAPI(30_000, startCount);
    } catch {
      // Fallback: wait for URL change
      await this.page.waitForURL(/bus-tickets|SearchResult/i, { timeout: 30_000 });
    }
  }

  /**
   * Legacy DOM-based search (kept for comparison / fallback).
   */
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

  // ===========================================================================
  // Header Navigation
  // ===========================================================================

  async clickHotelsNav(): Promise<void> {
    await this.page.locator(SEL.navHotels).first().click();
    await this.page.waitForURL(/hotel/i, { timeout: 10_000 });
  }

  async clickTrainsNav(): Promise<void> {
    await this.page.locator(SEL.navTrain).first().click();
    await this.page.waitForURL(/rail|train/i, { timeout: 10_000 });
  }

  async clickLoginButton(): Promise<void> {
    await this.page.locator(SEL.accountBtn).first().click();
    await this.page.waitForTimeout(500);
    await this.page.locator(SEL.loginBtn).first().click();
  }

  // ===========================================================================
  // Meta / SEO
  // ===========================================================================

  async getMetaDescription(): Promise<string> {
    return this.page.$eval(
      'meta[name="description"]',
      (el: Element) => (el as HTMLMetaElement).content,
    ).catch(() => '');
  }

  async getH1Text(): Promise<string> {
    return this.page.locator('h1').first().textContent().then(t => t?.trim() ?? '');
  }
}
