// =============================================================================
// tests/components/FilterPanelComponent.ts
// Reusable Filter Panel Component for bus results filtering
// =============================================================================

import { Page, Locator } from '@playwright/test';
import { NetworkHelper } from '../utils/networkHelper';

export class FilterPanelComponent {
  readonly page: Page;
  readonly network: NetworkHelper;

  readonly acCheckbox: Locator;
  readonly nonAcCheckbox: Locator;
  readonly sleeperCheckbox: Locator;
  readonly clearFiltersBtn: Locator;

  constructor(page: Page, network?: NetworkHelper) {
    this.page = page;
    this.network = network || new NetworkHelper(page);

    this.acCheckbox = page.locator('label:has-text("AC"), input[value="AC"]').first();
    this.nonAcCheckbox = page.locator('label:has-text("Non A/C"), input[value*="Non"]').first();
    this.sleeperCheckbox = page.locator('label:has-text("Sleeper"), input[value="Sleeper"]').first();
    this.clearFiltersBtn = page.locator('button:has-text("Clear"), .clear-filter').first();
  }

  async filterByAC(): Promise<void> {
    await this.acCheckbox.click();
    await this.network.waitForBusResults(15_000).catch(() => {});
  }

  async filterBySleeper(): Promise<void> {
    await this.sleeperCheckbox.click();
    await this.network.waitForBusResults(15_000).catch(() => {});
  }

  async clearAll(): Promise<void> {
    if (await this.clearFiltersBtn.isVisible({ timeout: 2000 })) {
      await this.clearFiltersBtn.click();
      await this.network.waitForBusResults(10_000).catch(() => {});
    }
  }
}
