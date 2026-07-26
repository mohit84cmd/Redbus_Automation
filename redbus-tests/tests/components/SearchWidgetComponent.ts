// =============================================================================
// tests/components/SearchWidgetComponent.ts
// Reusable Search Widget UI Component used across Home and Landing Pages
// =============================================================================

import { Page, Locator } from '@playwright/test';
import { NetworkHelper } from '../utils/networkHelper';

export class SearchWidgetComponent {
  readonly page: Page;
  readonly network: NetworkHelper;

  readonly sourceInput: Locator;
  readonly destInput: Locator;
  readonly dateInput: Locator;
  readonly searchButton: Locator;
  readonly suggestionList: Locator;

  constructor(page: Page, network?: NetworkHelper) {
    this.page = page;
    this.network = network || new NetworkHelper(page);

    this.sourceInput = page.locator('#src, input[placeholder*="from" i], .D_input input').first();
    this.destInput = page.locator('#dst, input[placeholder*="to" i]').first();
    this.dateInput = page.locator('.D_DatePick input, input[placeholder*="date" i]').first();
    this.searchButton = page.locator('.search_btn, button[type="submit"], button:has-text("Search Buses")').first();
    this.suggestionList = page.locator('ul.sc-dnqmqq li, ul.suggestions li, .suggestion-list li');
  }

  async enterSource(city: string): Promise<void> {
    await this.sourceInput.click();
    await this.sourceInput.fill('');
    await this.sourceInput.type(city, { delay: 80 });
    await this.network.waitForSuggestions(10_000).catch(() => {});
  }

  async enterDestination(city: string): Promise<void> {
    await this.destInput.click();
    await this.destInput.fill('');
    await this.destInput.type(city, { delay: 80 });
    await this.network.waitForSuggestions(10_000).catch(() => {});
  }

  async selectFirstSuggestion(): Promise<void> {
    await this.suggestionList.first().click();
  }

  async clickSearch(): Promise<void> {
    await this.searchButton.click();
  }
}
