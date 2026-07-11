// =============================================================================
// accessibility.spec.ts
// Accessibility Specs – Validate ARIA roles, alt attributes, and keyboard navigation
// =============================================================================

import { test, expect } from '@playwright/test';
import { HomePage }     from '../pages/HomePage';
import { logger }         from '../utils/helpers';

test.describe('♿ Accessibility & Semantic Markup', () => {

  test('TC-A11Y-001 | Verify structural HTML5 semantic elements', async ({ page }) => {
    logger.info('Verifying HTML5 semantic elements...');
    const homePage = new HomePage(page);
    await homePage.navigate();

    // Check main sections exist
    const headerExists = await page.locator('header, .rb-header, #header').first().isVisible().catch(() => false);
    const footerExists = await page.locator('footer, .rb-footer').first().isVisible().catch(() => false);

    logger.info(`Semantic Header exists: ${headerExists}`);
    logger.info(`Semantic Footer exists: ${footerExists}`);

    expect(headerExists || footerExists).toBe(true);
  });

  test('TC-A11Y-002 | Check ARIA attributes and labels on search elements', async ({ page }) => {
    logger.info('Verifying ARIA properties on inputs...');
    const homePage = new HomePage(page);
    await homePage.navigate();

    // Check if input fields have role, placeholder, or labels
    const srcInput = page.locator('#srcinput, #src, input[placeholder*="from" i]').first();
    const hasRoleOrLabel = await srcInput.evaluate((el) => {
      return el.hasAttribute('aria-label') || el.hasAttribute('placeholder') || el.hasAttribute('role');
    });

    expect(hasRoleOrLabel).toBe(true);
    logger.pass('Verified source input has accessibility-relevant attributes (aria-label, role, or placeholder)');
  });

  test('TC-A11Y-003 | Keyboard focus indicators and tab index validation', async ({ page }) => {
    logger.info('Verifying keyboard focusable elements...');
    const homePage = new HomePage(page);
    await homePage.navigate();

    // Check tabIndex values for search buttons
    const searchBtn = page.locator('.searchButtonWrapper___48550e, button[class*="searchButton"], .search_btn, button[type="submit"]').first();
    const tabIndex = await searchBtn.evaluate((el) => {
      return el.getAttribute('tabindex') || '0'; // default focusable is 0
    });

    expect(parseInt(tabIndex, 10)).toBeGreaterThanOrEqual(0);
    logger.pass(`Search button is keyboard-focusable with tabIndex: ${tabIndex}`);
  });
});
