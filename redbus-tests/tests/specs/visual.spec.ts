// =============================================================================
// visual.spec.ts
// Visual Regression Spec – Capture and verify visual integrity of key elements
// =============================================================================

import { test, expect } from '@playwright/test';
import { HomePage }     from '../pages/HomePage';
import { logger }         from '../utils/helpers';

test.describe('👁️  Visual Integrity & Regression', () => {

  test('TC-VIS-001 | Homepage visual snapshot validation', async ({ page }) => {
    logger.info('Performing visual regression validation...');
    const homePage = new HomePage(page);
    await homePage.navigate();

    // Verify visual integrity of the main search widget section
    const searchWidget = page.locator('.hero-section, .search-widget, .main-search, [class*="searchButton"], div[class*="dateInputWrapper"]').first();
    
    if (await searchWidget.isVisible({ timeout: 5000 }).catch(() => false)) {
      logger.info('Taking visual snapshot of search component...');
      await expect(searchWidget).toHaveScreenshot('search-widget-snapshot.png', {
        maxDiffPixelRatio: 0.2, // Allow minor variation in promo/banners or dynamically updated elements
        animations: 'allow',
      });
      logger.pass('Visual snapshot matches baseline successfully.');
    } else {
      // Fallback: take full page screenshot and test
      logger.info('Taking fallback full-page visual snapshot...');
      await expect(page).toHaveScreenshot('full-page-snapshot.png', {
        maxDiffPixelRatio: 0.2,
        animations: 'allow',
      });
      logger.pass('Fallback full page snapshot verified.');
    }
  });
});
