import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

const SEL = {
  busItem:        'li[class*="tupleWrapper"], .tupleWrapper___0ef934, .bus-item, .travels, [class*="bus-item"], .result-item',
  viewSeatsBtn:   'button:has-text("View seats"), button:has-text("View Seats"), .viewSeatsBtn___6aefb2, [class*="viewSeatsBtn"]',
  seatLayout:     '.seat-container, .layout-block, [class*="seat-layout"], .canvaswrapper___86zip, .deckWrapper___y3hHf',
  seatAvailable:  'span[role="button"][aria-label*="available"], span[class*="sleeper"]:not(:has-text("Sold")), span[class*="seat"]:not(:has-text("Sold")), .seat.available, .seat-block.available, [class*="available"] .seat',
  proceedBtn:     'button:has-text("Proceed to Book"), button:has-text("Book Now"), button:has-text("Proceed to book")',
  loginCloseBtn:  'i.icon-close, i.slicon-close, .modalCloseBtn, i[class*="close"]',
};

export class SeatLayoutSection extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Scan through the available bus cards and click "View seats" on the first one
   * that opens the seat layout without forcing a mandatory login wall.
   */
  async clickViewSeatsForFirst(): Promise<void> {
    const cards = await this.page.locator(SEL.busItem).all();
    console.log(`🔍 Found ${cards.length} bus cards to attempt seat layout opening...`);
    
    // Try first 10 buses in the list
    for (let i = 0; i < Math.min(cards.length, 10); i++) {
      const card = cards[i];
      const viewSeatsBtn = card.locator(SEL.viewSeatsBtn).first();
      
      if (await viewSeatsBtn.isVisible().catch(() => false)) {
        console.log(`👉 Attempting bus #${i + 1} View seats click...`);
        
        try {
          await viewSeatsBtn.scrollIntoViewIfNeeded();
          // Offset scroll up by 150px to ensure the button is not hidden under sticky headers
          await this.page.evaluate(() => window.scrollBy(0, -150));
          await this.page.waitForTimeout(300);
          await viewSeatsBtn.click({ timeout: 5000 });
        } catch (e) {
          console.warn(`⚠️ Click failed on bus #${i + 1}: ${e instanceof Error ? e.message : e}`);
          continue; // Try next bus
        }
        
        // Wait to check if a login modal popped up
        const closeBtn = this.page.locator(SEL.loginCloseBtn).first();
        if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`⚠️ Bus #${i + 1} prompted login modal. Dismissing and skipping...`);
          await closeBtn.click({ force: true }).catch(() => {});
          await this.page.waitForTimeout(800);
          continue; // Try next bus
        }
        
        // Wait to see if the seat layout DOM appeared
        const opened = await this.page.waitForSelector(SEL.seatLayout, {
          state: 'visible',
          timeout: 4000,
        }).then(() => true).catch(() => false);
        
        if (opened) {
          console.log(`✅ Successfully opened seat layout for bus #${i + 1}!`);
          return; // Success!
        }
      }
    }
    
    // Fallback: if all of them failed, do a standard click on the first one and wait
    console.warn('⚠️ All dynamic bus checks failed or prompted login. Falling back to first bus click.');
    const fallbackBtn = this.page.locator(SEL.viewSeatsBtn).first();
    await fallbackBtn.scrollIntoViewIfNeeded().catch(() => {});
    await fallbackBtn.click({ force: true }).catch(() => {});
    await this.page.waitForSelector(SEL.seatLayout, { state: 'visible', timeout: 5000 }).catch(() => {});
  }

  async selectAvailableSeat(): Promise<void> {
    const seat = this.page.locator(SEL.seatAvailable).first();
    if (await seat.isVisible({ timeout: 5000 })) {
      await seat.click({ force: true });
      await this.page.waitForTimeout(500);
    }
  }

  async clickProceedToBook(): Promise<void> {
    const btn = this.page.locator(SEL.proceedBtn).first();
    await btn.click({ force: true });
  }
}
