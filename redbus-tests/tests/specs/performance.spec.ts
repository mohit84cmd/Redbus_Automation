// =============================================================================
// performance.spec.ts
// Performance Metrics Spec – Collect page load times and API response latencies
// =============================================================================

import { test, expect } from '@playwright/test';
import { HomePage }     from '../pages/HomePage';
import { logger }         from '../utils/helpers';

test.describe('⚡ Performance & Timing Metrics', () => {

  test('TC-PERF-001 | Collect homepage load times and slow API calls', async ({ page }) => {
    logger.info('Running performance validation...');
    const homePage = new HomePage(page);
    
    // Time the load
    const startTime = Date.now();
    await homePage.navigate();
    const loadDuration = Date.now() - startTime;
    
    logger.pass(`Page load took ${loadDuration}ms`);
    expect(loadDuration).toBeLessThan(30000); // Should be loaded under 30s

    // Get metrics from performance timing API
    const metrics = await homePage.getNetworkMetrics();
    logger.info(`DOMContentLoaded timing: ${metrics.domContentLoaded}ms`);
    logger.info(`Total requests intercepted: ${metrics.totalRequests}`);
    logger.info(`Failed requests: ${metrics.failedRequests}`);
    logger.info(`Slowest API call: ${metrics.slowestApiMs}ms`);

    // Log the API table
    await homePage.debugNetworkCalls();
  });
});
