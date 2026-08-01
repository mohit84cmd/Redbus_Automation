// =============================================================================
// redbus.spec.ts
// Functional Tests – Bus search, filters, sorting, and seat selection
// Refactored to utilize the unified RedBusApplication orchestrator and ApiClient.
// =============================================================================

import { test, expect } from '../fixtures/baseTest';
import { logger }         from '../utils/helpers';
import { BUS_ROUTES, getISODate }    from '../utils/testData';

test.describe('🚌  RedBus Functional ticket booking flow @regression @e2e', () => {

  test('TC-FUN-001 | Complete end-to-end bus booking flow (search, filter, sort, seat selection) @smoke @sanity', async ({ redBusApp, apiClient }) => {

    logger.info(`Starting E2E Bus Booking Flow: ${BUS_ROUTES.valid.source} to ${BUS_ROUTES.valid.destination}`);
    
    // Inject Mock API suite for fast, deterministic XHR responses
    const { MockApiManager } = await import('../utils/MockApiManager');
    await MockApiManager.injectFullMockSuite(redBusApp.page);

    // 1. Perform homepage search
    await redBusApp.navigateAndSearchBuses(BUS_ROUTES.valid.source, BUS_ROUTES.valid.destination);
    await redBusApp.busResultsPage.waitForResultsViaAPI();
    
    // Assert results list is visible
    const uiCount = await redBusApp.busResultsPage.getBusCount();
    logger.pass(`Found ${uiCount} buses available on UI`);
    expect(uiCount).toBeGreaterThan(0);

    // 2. Combined validation: perform backend verification using apiClient
    logger.info('Performing backend search validation via API Client...');
    const futureDateStr = getISODate(5);
    const apiRes = await apiClient.searchBuses(BUS_ROUTES.valid.source, BUS_ROUTES.valid.destination, futureDateStr);
    await apiClient.assertOk(apiRes);
    logger.pass('Verified backend search API responded with status 200.');

    // 3. Apply AC Filter
    logger.info('Applying AC bus filter...');
    await redBusApp.busResultsPage.applyACFilter();
    const acCount = await redBusApp.busResultsPage.getBusCount();
    logger.pass(`Filtered AC bus count: ${acCount}`);
    
    // Verify all displayed bus types contain "AC" or "A/C"
    const busTypes = await redBusApp.busResultsPage.getBusTypes();
    for (const type of busTypes) {
      expect(type.toLowerCase()).toMatch(/(a\.?c|a\/c)/i);
    }
    logger.pass('Verified all displayed buses are AC.');

    // 4. Sort results by lowest price
    logger.info('Sorting results by lowest price...');
    await redBusApp.busResultsPage.sortByLowestPrice();
    await redBusApp.page.waitForTimeout(2000); // Wait for list to settle
    const prices = await redBusApp.busResultsPage.getBusPrices();
    logger.info(`Sorted Prices: ${prices.join(', ')}`);
    for (let i = 0; i < prices.length - 1; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
    }
    logger.pass('Verified results are correctly sorted by price.');

    // 5. Open seat layout
    logger.info('Opening seat layout for the first available bus operator...');
    await redBusApp.busResultsPage.clickViewSeatsForFirst();
    const isLayoutVisible = await redBusApp.busResultsPage.softAssertVisible(
      '.seat-container, .layout-block, [class*="seat-layout"], .canvas-container, [class*="deckWrapper"], [class*="canvaswrapper"]',
      'Seat Layout'
    );
    expect(isLayoutVisible).toBe(true);
    logger.pass('Seat layout successfully loaded and visible.');
  });
});
