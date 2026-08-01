import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

const SEL = {
  logo:       '.rb-header img, .header-logo img, img[alt*="redbus" i]',
  navBus:     'a[href*="bus"], .rb-nav a:has-text("Bus")',
  navHotels:  'a[href*="hotel" i], li:has-text("Hotels") a, .rb-nav a:has-text("Hotel")',
  navTrain:   'a[href*="rail" i], a[href*="train" i], .rb-nav a:has-text("Rail")',
  accountBtn: 'button:has-text("Account"), [aria-label="Account"], .icon-account, #account_dd, .login-btn',
  loginBtn:   'span:has-text("Sign up"), button:has-text("Sign up"), button:has-text("Login"), .login-btn',
};

export class HeaderSection extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async isLogoVisible(): Promise<boolean> {
    return this.softAssertVisible(SEL.logo, 'RedBus Logo');
  }

  async areNavLinksVisible(): Promise<boolean> {
    const bus    = await this.softAssertVisible(SEL.navBus,    'Nav: Bus');
    const hotel  = await this.softAssertVisible(SEL.navHotels, 'Nav: Hotels');
    return bus || hotel;
  }

  async clickHotelsNav(): Promise<void> {
    await this.page.locator(SEL.navHotels).first().click();
    await this.page.waitForURL(/hotel/i, { timeout: 10_000 });
  }

  async clickTrainsNav(): Promise<void> {
    await this.page.locator(SEL.navTrain).first().click();
    await this.page.waitForURL(/rail|train/i, { timeout: 10_000 });
  }

  async clickLoginButton(): Promise<void> {
    await this.page.locator(SEL.accountBtn).first().click();
    await this.page.waitForTimeout(500);
    await this.page.locator(SEL.loginBtn).first().click();
  }

  async isLoginButtonVisible(): Promise<boolean> {
    const accountVisible = await this.softAssertVisible(SEL.accountBtn, 'Account Button');
    if (!accountVisible) return false;
    try {
      await this.page.locator(SEL.accountBtn).first().click();
      await this.page.waitForTimeout(500);
      const loginVisible = await this.softAssertVisible(SEL.loginBtn, 'Login/Sign up Option');
      return loginVisible;
    } catch {
      return false;
    }
  }
}
