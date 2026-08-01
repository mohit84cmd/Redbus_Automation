import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class FilterSection extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Apply AC bus filter using robust accessible checkbox locator.
   */
  async applyACFilter(): Promise<void> {
    const btn = this.page.getByRole('checkbox', { name: /\bAC\b/i }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click({ force: true }).catch(() => {});
    } else {
      const altBtn = this.page.locator('input[type="checkbox"][name*="ac" i], label:has-text("AC")').first();
      await altBtn.click({ force: true }).catch(() => {});
    }

    try {
      await this.waitForSearchResultsAPI(5_000);
    } catch {
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Apply Non-AC bus filter.
   */
  async applyNonACFilter(): Promise<void> {
    const btn = this.page.getByRole('checkbox', { name: /NONAC|NON-AC|NON A\/C/i }).first();
    await btn.click({ force: true });
    
    try {
      await this.waitForSearchResultsAPI(10_000);
    } catch {
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Apply Sleeper bus filter.
   */
  async applySleeperFilter(): Promise<void> {
    const btn = this.page.getByRole('checkbox', { name: /SLEEPER/i }).first();
    await btn.click({ force: true });
    
    try {
      await this.waitForSearchResultsAPI(10_000);
    } catch {
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Sort by lowest price using accessible text label.
   */
  async sortByLowestPrice(): Promise<void> {
    const btn = this.page.getByText('Price', { exact: true }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click({ force: true }).catch(() => {});
    } else {
      const altBtn = this.page.locator('button.sort-price, :text("Price"), [class*="sort"]').first();
      await altBtn.click({ force: true }).catch(() => {});
    }
    await this.page.waitForTimeout(300);
  }
}
