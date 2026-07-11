// ─────────────────────────────────────────────────────────────────────────────
// Reusable Helper / Utility Functions – RedBus Playwright Suite
// ─────────────────────────────────────────────────────────────────────────────

import { Page, expect, BrowserContext } from '@playwright/test';
import * as fs   from 'fs';
import * as path from 'path';

// ─────────────────────────────── Screenshot Helpers ──────────────────────────

/** Capture a named screenshot into the screenshots/ directory */
export async function captureScreenshot(page: Page, name: string): Promise<string> {
  const dir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filePath}`);
  return filePath;
}

/** Capture a screenshot of a specific element */
export async function captureElementScreenshot(
  page: Page, selector: string, name: string,
): Promise<string> {
  const dir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}-element-${Date.now()}.png`);
  const el = page.locator(selector).first();
  await el.screenshot({ path: filePath });
  return filePath;
}

// ────────────────────────────── Wait Strategies ───────────────────────────────

/** Wait until the network is idle (no requests for 500 ms) */
export async function waitForNetworkIdle(page: Page, timeout = 30_000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/** Wait for a selector, with a friendly timeout message */
export async function waitForElement(
  page: Page, selector: string, timeout = 15_000,
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/** Wait for URL to contain a substring */
export async function waitForUrlContains(
  page: Page, urlPart: string, timeout = 30_000,
): Promise<void> {
  await page.waitForURL(`**/*${urlPart}*`, { timeout });
}

/** Retry an async action up to `retries` times with a delay */
export async function retryAction<T>(
  action: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await action();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`⚠️  Attempt ${attempt} failed, retrying in ${delayMs}ms…`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('retryAction: exhausted retries');
}

// ─────────────────────────────── Cookie / Dialog ─────────────────────────────

/** Dismiss any cookie consent banner that may appear */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept All")',
    'button:has-text("Got it")',
    'button:has-text("OK")',
    '[id*="cookie"] button',
    '[class*="cookie"] button',
  ];
  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        console.log(`🍪 Cookie banner dismissed via: ${sel}`);
        return;
      }
    } catch { /* not present */ }
  }
}

/** Auto-accept browser dialogs (alert/confirm/prompt) */
export function acceptDialogs(page: Page): void {
  page.on('dialog', async dialog => {
    console.log(`💬 Dialog [${dialog.type()}]: ${dialog.message()}`);
    await dialog.accept();
  });
}

// ──────────────────────────── Performance Helpers ────────────────────────────

export interface PerformanceMetrics {
  domContentLoadedMs: number;
  loadEventMs:        number;
  firstPaintMs:       number;
  lcp:                number | null;
}

/** Collect Web Vitals-like metrics via Navigation Timing API */
export async function getPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  const metrics = await page.evaluate((): PerformanceMetrics => {
    const nav  = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByName('first-paint')[0];
    const lcp   = performance.getEntriesByType('largest-contentful-paint');
    return {
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loadEventMs:        Math.round(nav.loadEventEnd - nav.startTime),
      firstPaintMs:       paint ? Math.round(paint.startTime) : 0,
      lcp: lcp.length ? Math.round((lcp[lcp.length - 1] as any).startTime) : null,
    };
  });
  return metrics;
}

// ────────────────────────────── Scroll Helpers ───────────────────────────────

/** Slowly scroll to the bottom of the page */
export async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>(resolve => {
      let scrolled = 0;
      const step = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        scrolled += step;
        if (scrolled >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/** Scroll to a specific element */
export async function scrollToElement(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
}

// ──────────────────────────── Input / Form Helpers ───────────────────────────

/** Clear an input and type text with a human-like delay */
export async function clearAndType(
  page: Page, selector: string, text: string, delay = 50,
): Promise<void> {
  const el = page.locator(selector).first();
  await el.click({ clickCount: 3 });
  await el.fill(text);
}

/** Select a suggestion from an autocomplete dropdown */
export async function selectAutocompleteSuggestion(
  page: Page,
  inputSelector: string,
  text: string,
  suggestionSelector: string,
): Promise<void> {
  await clearAndType(page, inputSelector, text);
  await page.waitForSelector(suggestionSelector, { state: 'visible', timeout: 10_000 });
  await page.locator(suggestionSelector).first().click();
}

// ────────────────────────────── Assertion Helpers ────────────────────────────

/** Assert page title contains a substring (case-insensitive) */
export async function assertTitleContains(page: Page, text: string): Promise<void> {
  const title = await page.title();
  expect(title.toLowerCase()).toContain(text.toLowerCase());
}

/** Assert an element is visible */
export async function assertVisible(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector).first()).toBeVisible();
}

/** Assert element text contains expected string */
export async function assertTextContains(
  page: Page, selector: string, text: string,
): Promise<void> {
  await expect(page.locator(selector).first()).toContainText(text, { ignoreCase: true });
}

// ────────────────────────────── Misc Utilities ───────────────────────────────

/** Generate a random future date string (DD-MMM-YYYY) */
export function randomFutureDate(minDays = 3, maxDays = 30): string {
  const offset = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

/** Simple logger */
export const logger = {
  info:  (msg: string) => console.log(`ℹ️  ${msg}`),
  warn:  (msg: string) => console.warn(`⚠️  ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
  pass:  (msg: string) => console.log(`✅ ${msg}`),
};

/** Save JSON data to a file */
export function saveJSON(filename: string, data: unknown): void {
  const dir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
}
