import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

const SEL = {
  busItem:        'div[class*="tupleWrapper"], li[class*="tupleWrapper"], [class*="tupleWrapper"], [class*="busCard"], [class*="bus-item"], .tupleWrapper___0ef934, .bus-item, .travels, .result-item',
  busCount:       '[class*="busesFoundText"], .busesFoundText__ind-search-styles-module-scss-PHVGD, .buses_count, .result-count, .total-results',
  busName:        '.travelsName___b53e90, [class*="travelsName"], .travels, .bus-name, [class*="operator"], .companyName',
  price:          '.finalFare___63a23a, [class*="finalFare"], .fare, .seat-fare',
  busType:        '.busType___0372b0, [class*="busType"]',
};

export class BusListSection extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async getBusCount(): Promise<number> {
    const textEl = this.page.locator(SEL.busCount).first();
    if (await textEl.isVisible({ timeout: 5000 }).catch(() => false)) {
      const txt = await textEl.textContent();
      const match = txt?.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }
    // Fallback: count listings directly
    return this.page.locator(SEL.busItem).count();
  }

  async getBusNames(): Promise<string[]> {
    return this.page.locator(SEL.busName).allTextContents();
  }

  async getBusPrices(): Promise<number[]> {
    const items = await this.page.locator(SEL.busItem).all();
    const prices: number[] = [];
    for (const item of items) {
      const priceLocator = item.locator(SEL.price).first();
      const txt = await priceLocator.textContent().catch(() => '');
      if (txt) {
        const clean = txt.replace(/[^\d]/g, '');
        const val = parseInt(clean, 10);
        if (!isNaN(val)) prices.push(val);
      }
    }
    return prices;
  }

  async getBusTypes(): Promise<string[]> {
    return this.page.locator(SEL.busType).allTextContents();
  }
}
