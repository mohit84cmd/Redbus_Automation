// =============================================================================
// MockApiManager.ts
// Network Data Interception & Mock API Injection Manager
// =============================================================================

import { Page, BrowserContext, Route } from '@playwright/test';
import { MOCK_BUS_RESULTS, MOCK_SEAT_LAYOUT, MOCK_SUGGESTIONS } from '../fixtures/mockData';

export class MockApiManager {

  /** Inject offline autocomplete suggestions mock API into context or page */
  static async injectAutocompleteMock(target: Page | BrowserContext, customSuggestions?: any): Promise<void> {
    const payload = customSuggestions ?? MOCK_SUGGESTIONS;
    await target.route('**/autocomplete*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });
  }

  /** Inject offline bus search results API mock */
  static async injectBusSearchResultsMock(target: Page | BrowserContext, customResults?: any): Promise<void> {
    const payload = customResults ?? MOCK_BUS_RESULTS;
    await target.route('**/search*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });
  }

  /** Inject seat layout API mock */
  static async injectSeatLayoutMock(target: Page | BrowserContext, customLayout?: any): Promise<void> {
    const payload = customLayout ?? MOCK_SEAT_LAYOUT;
    await target.route('**/seatlayout*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });
  }

  /** Unified method to inject complete offline mock suite */
  static async injectFullMockSuite(target: Page | BrowserContext): Promise<void> {
    await this.injectAutocompleteMock(target);
    await this.injectBusSearchResultsMock(target);
    await this.injectSeatLayoutMock(target);
  }
}
