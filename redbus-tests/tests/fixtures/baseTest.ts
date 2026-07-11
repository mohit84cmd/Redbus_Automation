// =============================================================================
// tests/fixtures/baseTest.ts
// Custom Playwright fixture — extends `test` with pre-initialized page objects
// =============================================================================

import { test as base, Page } from '@playwright/test';
import { HomePage }           from '../pages/HomePage';
import { BusResultsPage }     from '../pages/BusResultsPage';
import { HotelPage }          from '../pages/HotelPage';
import { TrainPage }          from '../pages/TrainPage';

// ─── Fixture Type ─────────────────────────────────────────────────────────────

export type RedBusFixtures = {
  /** Pre-initialized HomePage (homepage + search widget) */
  homePage:       HomePage;
  /** Pre-initialized BusResultsPage (list, filters, seat selection) */
  busResultsPage: BusResultsPage;
  /** Pre-initialized HotelPage */
  hotelPage:      HotelPage;
  /** Pre-initialized TrainPage */
  trainPage:      TrainPage;
};

// =============================================================================
// Custom `test` export — import this in every spec instead of @playwright/test
// =============================================================================

export const test = base.extend<RedBusFixtures>({

  // ── HomePage ───────────────────────────────────────────────────────────────
  homePage: async ({ page }, use) => {
    const hp = new HomePage(page);
    await hp.navigate();
    await use(hp);
  },

  // ── BusResultsPage ─────────────────────────────────────────────────────────
  busResultsPage: async ({ page }, use) => {
    await use(new BusResultsPage(page));
  },

  // ── HotelPage ──────────────────────────────────────────────────────────────
  hotelPage: async ({ page }, use) => {
    await use(new HotelPage(page));
  },

  // ── TrainPage ──────────────────────────────────────────────────────────────
  trainPage: async ({ page }, use) => {
    await use(new TrainPage(page));
  },
});

export { expect } from '@playwright/test';
