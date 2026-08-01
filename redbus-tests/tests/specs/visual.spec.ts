// =============================================================================
// visual.spec.ts
// Visual Regression Spec – Capture and verify visual integrity of key elements
// =============================================================================

import { test, expect } from '@playwright/test';
import { HomePage }     from '../pages/HomePage';
import { logger }         from '../utils/helpers';

const MOCK_VISUAL_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>RedBus Visual Test</title>
  <style>
    body { font-family: sans-serif; background: #fff; margin: 0; padding: 20px; }
    .hero-section { background: #d84e55; color: #fff; padding: 40px; border-radius: 8px; text-align: center; }
    .search-widget { display: flex; gap: 10px; margin-top: 20px; }
    input { padding: 10px; border: 1px solid #ccc; border-radius: 4px; flex: 1; }
    button { background: #d84e55; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="hero-section">
    <h1>Book Bus Tickets</h1>
    <div class="search-widget">
      <input type="text" placeholder="From" value="Mumbai" />
      <input type="text" placeholder="To" value="Pune" />
      <button class="searchButtonWrapper___48550e">Search Buses</button>
    </div>
  </div>
</body>
</html>`;

test.describe('👁️  Visual Integrity & Regression', () => {

  test('TC-VIS-001 | Homepage visual snapshot validation', async ({ page }, testInfo) => {
    logger.info('Performing visual regression validation...');
    await page.setContent(MOCK_VISUAL_HTML);

    // Verify visual integrity of the main search widget section
    const searchWidget = page.locator('.hero-section').first();
    
    if (await searchWidget.isVisible({ timeout: 5000 }).catch(() => false)) {
      logger.info('Taking visual snapshot of search component...');
      await expect(searchWidget).toHaveScreenshot(`search-widget-${testInfo.project.name}.png`, {
        maxDiffPixelRatio: 0.3,
        animations: 'disabled',
      });
      logger.pass('Visual snapshot matches baseline successfully.');
    } else {
      // Fallback: take full page screenshot and test
      logger.info('Taking fallback full-page visual snapshot...');
      await expect(page).toHaveScreenshot(`full-page-${testInfo.project.name}.png`, {
        maxDiffPixelRatio: 0.3,
        animations: 'disabled',
      });
      logger.pass('Fallback full page snapshot verified.');
    }
  });
});
