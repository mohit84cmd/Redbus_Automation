// =============================================================================
// redbus.spec.ts
// Functional Tests – Bus search, filters, sorting, and seat selection
// =============================================================================

import { test, expect } from '../fixtures/baseTest';
import { logger }         from '../utils/helpers';
import { BUS_ROUTES }    from '../utils/testData';

test.describe('🚌  RedBus Functional ticket booking flow', () => {

  test('TC-FUN-001 | Complete search flow (source, destination, date)', async ({ homePage, busResultsPage }) => {
    logger.info(`Starting Bus Search: ${BUS_ROUTES.valid.source} to ${BUS_ROUTES.valid.destination}`);
    
    // Perform search using XHR validation
    await homePage.searchBuses(BUS_ROUTES.valid.source, BUS_ROUTES.valid.destination);
    
    // Wait for result page load and XHR validation
    await busResultsPage.waitForResultsViaAPI();
    
    // Assert results list is visible
    const count = await busResultsPage.getBusCount();
    logger.pass(`Found ${count} buses available`);
    expect(count).toBeGreaterThan(0);
  });

  test('TC-FUN-002 | Apply AC bus filter and verify listings', async ({ homePage, busResultsPage }) => {
    logger.info('Performing search for filtering test...');
    await homePage.searchBuses(BUS_ROUTES.valid.source, BUS_ROUTES.valid.destination);
    await busResultsPage.waitForResultsViaAPI();

    const initialCount = await busResultsPage.getBusCount();
    logger.info(`Initial bus count: ${initialCount}`);

    // Apply AC Filter
    logger.info('Applying AC filter...');
    await busResultsPage.applyACFilter();
    
    const acCount = await busResultsPage.getBusCount();
    logger.pass(`Filtered bus count (AC only): ${acCount}`);
    
    // Check if the filtered list has less or equal items
    expect(acCount).toBeLessThanOrEqual(initialCount);

    // Verify all displayed bus types contain "AC" or "A/C"
    const busTypes = await busResultsPage.getBusTypes();
    for (const type of busTypes) {
      expect(type.toLowerCase()).toMatch(/(a\.?c|a\/c)/i);
    }
    logger.pass('Verified all displayed buses are AC.');
  });

  test('TC-FUN-003 | Sort search results by lowest price', async ({ homePage, busResultsPage }) => {
    await homePage.searchBuses(BUS_ROUTES.valid.source, BUS_ROUTES.valid.destination);
    await busResultsPage.waitForResultsViaAPI();

    // Sort by Lowest Price
    logger.info('Sorting results by lowest price...');
    await busResultsPage.sortByLowestPrice();
    await busResultsPage.page.waitForTimeout(2000); // Wait for list to settle

    const prices = await busResultsPage.getBusPrices();
    logger.info(`Sorted Prices: ${prices.join(', ')}`);
    
    // Verify pricing is sorted in ascending order
    for (let i = 0; i < prices.length - 1; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
    }
    logger.pass('Verified results are correctly sorted by price.');
  });

  test('TC-FUN-004 | View seat layout for the first available bus', async ({ homePage, busResultsPage }) => {
    await homePage.searchBuses(BUS_ROUTES.valid.source, BUS_ROUTES.valid.destination);
    await busResultsPage.waitForResultsViaAPI();

    logger.info('Clicking View Seats on the first bus listing...');
    await busResultsPage.clickViewSeatsForFirst();
    
    // Verify layout is visible
    const isLayoutVisible = await busResultsPage.softAssertVisible(
      '.seat-container, .layout-block, [class*="seat-layout"], .canvas-container, [class*="deckWrapper"], [class*="canvaswrapper"]',
      'Seat Layout'
    );
    expect(isLayoutVisible).toBe(true);
    logger.pass('Seat layout successfully loaded and visible.');
  });
});
