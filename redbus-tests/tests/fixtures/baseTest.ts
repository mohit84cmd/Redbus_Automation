// =============================================================================
// tests/fixtures/baseTest.ts
// Custom Playwright fixture — extends `test` with pre-initialized page and app objects
// =============================================================================

import { test as base, Page } from '@playwright/test';
import { RedBusApplication } from '../pages/RedBusApplication';
import { ApiClient }         from '../utils/apiClient';
import { HomePage }           from '../pages/HomePage';
import { BusResultsPage }     from '../pages/BusResultsPage';
import { HotelPage }          from '../pages/HotelPage';
import { TrainPage }          from '../pages/TrainPage';
import { BrowserFactory }    from '../utils/browserFactory';

// ─── Fixture Type ─────────────────────────────────────────────────────────────

export type RedBusFixtures = {
  /** Unified RedBusApplication orchestrator */
  redBusApp:      RedBusApplication;
  /** Pre-initialized ApiClient for backend validation */
  apiClient:      ApiClient;
  /** Pre-initialized HomePage */
  homePage:       HomePage;
  /** Pre-initialized BusResultsPage */
  busResultsPage: BusResultsPage;
  /** Pre-initialized HotelPage */
  hotelPage:      HotelPage;
  /** Pre-initialized TrainPage */
  trainPage:      TrainPage;
};

// =============================================================================
// Custom `test` export — extends base playwright test
// =============================================================================

export const test = base.extend<RedBusFixtures>({

  // ── Browser Override via Factory ───────────────────────────────────────────
  browser: async ({ browserName }, use) => {
    const browserInstance = await BrowserFactory.getBrowser(
      browserName as 'chromium' | 'firefox' | 'webkit'
    );
    await use(browserInstance);
    await browserInstance.close();
  },
  // ── Page Fixture Auto-Mocking ───────────────────────────────────────────────
  page: async ({ page }, use) => {
    const { MockApiManager } = await import('../utils/MockApiManager');
    await MockApiManager.injectFullMockSuite(page);
    await use(page);
  },
  // ── RedBusApplication Orchestrator ─────────────────────────────────────────
  redBusApp: async ({ page, request }, use) => {
    const { MockApiManager } = await import('../utils/MockApiManager');
    await MockApiManager.injectFullMockSuite(page);
    const app = new RedBusApplication(page, request);
    await use(app);
  },

  // ── ApiClient ──────────────────────────────────────────────────────────────
  apiClient: async ({ redBusApp }, use) => {
    await use(redBusApp.apiClient);
  },

  // ── HomePage ───────────────────────────────────────────────────────────────
  homePage: async ({ redBusApp }, use) => {
    await redBusApp.homePage.navigate();
    await use(redBusApp.homePage);
  },

  // ── BusResultsPage ─────────────────────────────────────────────────────────
  busResultsPage: async ({ redBusApp }, use) => {
    await use(redBusApp.busResultsPage);
  },

  // ── HotelPage ──────────────────────────────────────────────────────────────
  hotelPage: async ({ redBusApp }, use) => {
    await use(redBusApp.hotelPage);
  },

  // ── TrainPage ──────────────────────────────────────────────────────────────
  trainPage: async ({ redBusApp }, use) => {
    await use(redBusApp.trainPage);
  },
});

export { expect } from '@playwright/test';
