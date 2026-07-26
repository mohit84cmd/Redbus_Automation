// =============================================================================
// HomePage.ts  – RedBus Homepage Page Object
// Refactored to delegate selectors and elements to dedicated Section objects.
// =============================================================================

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { HeaderSection } from './sections/HeaderSection';
import { SearchWidgetSection } from './sections/SearchWidgetSection';
import { FooterSection } from './sections/FooterSection';

export class HomePage extends BasePage {
  readonly header: HeaderSection;
  readonly searchWidget: SearchWidgetSection;
  readonly footer: FooterSection;

  constructor(page: Page) {
    super(page);
    this.header = new HeaderSection(page);
    this.searchWidget = new SearchWidgetSection(page);
    this.footer = new FooterSection(page);
  }

  async navigate(): Promise<void> {
    await this.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissCookieBanner();
  }

  // ─── Delegated Header Methods (Backward Compatibility) ─────────────────────

  async isLogoVisible(): Promise<boolean> {
    return this.header.isLogoVisible();
  }

  async areNavLinksVisible(): Promise<boolean> {
    return this.header.areNavLinksVisible();
  }

  async clickHotelsNav(): Promise<void> {
    await this.header.clickHotelsNav();
  }

  async clickTrainsNav(): Promise<void> {
    await this.header.clickTrainsNav();
  }

  async clickLoginButton(): Promise<void> {
    await this.header.clickLoginButton();
  }

  async isLoginButtonVisible(): Promise<boolean> {
    return this.header.isLoginButtonVisible();
  }

  // ─── Delegated SearchWidget Methods (Backward Compatibility) ───────────────

  async isSearchWidgetVisible(): Promise<boolean> {
    return this.searchWidget.isSearchWidgetVisible();
  }

  async isSearchButtonVisible(): Promise<boolean> {
    return this.searchWidget.isSearchButtonVisible();
  }

  async typeSourceAndWaitForAPI(city: string): Promise<void> {
    await this.searchWidget.typeSourceAndWaitForAPI(city);
  }

  async typeDestinationAndWaitForAPI(city: string): Promise<void> {
    await this.searchWidget.typeDestinationAndWaitForAPI(city);
  }

  async selectFirstSuggestion(): Promise<void> {
    await this.searchWidget.selectFirstSuggestion();
  }

  async getSuggestionTexts(): Promise<string[]> {
    return this.searchWidget.getSuggestionTexts();
  }

  async openDatePicker(): Promise<void> {
    await this.searchWidget.openDatePicker();
  }

  async selectFirstAvailableDate(): Promise<void> {
    await this.searchWidget.selectFirstAvailableDate();
  }

  async searchBuses(source: string, destination: string): Promise<void> {
    await this.searchWidget.searchBuses(source, destination);
  }

  async searchBusesLegacy(source: string, destination: string): Promise<void> {
    await this.searchWidget.searchBusesLegacy(source, destination);
  }

  // ─── Delegated Footer Methods (Backward Compatibility) ─────────────────────

  async isFooterVisible(): Promise<boolean> {
    return this.footer.isFooterVisible();
  }

  // ─── Meta / SEO ────────────────────────────────────────────────────────────

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
