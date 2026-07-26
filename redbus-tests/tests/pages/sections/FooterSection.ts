import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

const SEL = {
  footer:      'footer, .rb-footer, [class*="footer"]',
  footerLinks: 'footer a, .rb-footer a',
};

export class FooterSection extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async isFooterVisible(): Promise<boolean> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    return this.softAssertVisible(SEL.footer, 'Footer');
  }

  async getFooterLinksCount(): Promise<number> {
    return this.page.locator(SEL.footerLinks).count();
  }
}
