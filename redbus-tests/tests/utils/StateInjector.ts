// =============================================================================
// StateInjector.ts
// Client-side LocalStorage & Session Data Injector
// =============================================================================

import { Page, BrowserContext } from '@playwright/test';

export interface UserSessionState {
  authToken: string;
  userId: string;
  userName: string;
  email: string;
  mobile: string;
}

export class StateInjector {

  /** Inject auth session tokens directly into LocalStorage via init script */
  static async injectUserSession(context: BrowserContext, session: UserSessionState): Promise<void> {
    await context.addInitScript((data) => {
      window.localStorage.setItem('auth_token', data.authToken);
      window.localStorage.setItem('user_id', data.userId);
      window.localStorage.setItem('user_name', data.userName);
      window.localStorage.setItem('user_email', data.email);
      window.localStorage.setItem('user_mobile', data.mobile);
      window.sessionStorage.setItem('session_active', 'true');
    }, session);
  }

  /** Set custom cookie state for geo-location or promo campaigns */
  static async injectPromoCookie(context: BrowserContext, promoCode = 'REDBUS200'): Promise<void> {
    await context.addCookies([
      {
        name: 'APPLIED_PROMO',
        value: promoCode,
        domain: '.redbus.in',
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      },
    ]);
  }
}
