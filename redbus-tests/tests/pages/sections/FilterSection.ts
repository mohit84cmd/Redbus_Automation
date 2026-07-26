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
    // Matches "AC (458)" but not "NONAC" using word boundary regex
    const btn = this.page.getByRole('checkbox', { name: /\bAC\b/i }).first();
    const startCount = this.getCapturedResponses('busSearch').length;
    await btn.click({ force: true });
    
    // Synchronize via API response or fallback delay
    try {
      await this.waitForSearchResultsAPI(10_000, startCount);
    } catch {
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Apply Non-AC bus filter.
   */
  async applyNonACFilter(): Promise<void> {
    const btn = this.page.getByRole('checkbox', { name: /NONAC|NON-AC|NON A\/C/i }).first();
    const startCount = this.getCapturedResponses('busSearch').length;
    await btn.click({ force: true });
    
    try {
      await this.waitForSearchResultsAPI(10_000, startCount);
    } catch {
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Apply Sleeper bus filter.
   */
  async applySleeperFilter(): Promise<void> {
    const btn = this.page.getByRole('checkbox', { name: /SLEEPER/i }).first();
    const startCount = this.getCapturedResponses('busSearch').length;
    await btn.click({ force: true });
    
    try {
      await this.waitForSearchResultsAPI(10_000, startCount);
    } catch {
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Sort by lowest price using accessible text label.
   */
  async sortByLowestPrice(): Promise<void> {
    // Locate sorting option by text label "Price"
    const btn = this.page.getByText('Price', { exact: true }).first();
    await btn.click({ force: true });
    await this.page.waitForTimeout(1500); // Wait for list to sort
  }
}
