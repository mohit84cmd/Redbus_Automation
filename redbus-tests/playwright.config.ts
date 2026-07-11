// =============================================================================
// playwright.config.ts  — Root configuration
// Defines browsers, baseURL, retries, reporters, and project matrix
// =============================================================================

import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

export default defineConfig({
  // ── Test Discovery ──────────────────────────────────────────────────────────
  testDir: './tests/specs',
  testMatch: ['**/*.spec.ts'],

  // ── Execution ───────────────────────────────────────────────────────────────
  fullyParallel: false,           // keep sequential – RedBus rate-limits
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 2 : 1,
  forbidOnly: !!process.env.CI,

  // ── Global Timeouts ─────────────────────────────────────────────────────────
  timeout: 120_000,               // per-test
  expect: { timeout: 15_000 },

  // ── Reporters ───────────────────────────────────────────────────────────────
  reporter: [
    ['list'],
    ['html',  { outputFolder: 'playwright-report', open: 'never' }],
    ['json',  { outputFile:   'test-results/results.json' }],
    ['junit', { outputFile:   'test-results/junit.xml' }],
  ],

  // ── Shared Use Options ──────────────────────────────────────────────────────
  use: {
    baseURL:            'https://www.redbus.in',
    headless:           true,
    viewport:           { width: 1280, height: 720 },
    ignoreHTTPSErrors:  true,
    screenshot:         'only-on-failure',
    video:              'retain-on-failure',
    trace:              'retain-on-failure',
    actionTimeout:      30_000,
    navigationTimeout:  60_000,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/124.0.0.0 Safari/537.36',
    },
  },

  // ── Output ──────────────────────────────────────────────────────────────────
  outputDir: 'test-results/',

  // ── Projects (browsers / viewports) ─────────────────────────────────────────
  projects: [
    // ── Desktop ──────────────────────────────────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // ── Mobile ────────────────────────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: ['**/mobile.spec.ts'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      testMatch: ['**/mobile.spec.ts'],
    },

    // ── Tablet ────────────────────────────────────────────────────────────────
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
      testMatch: ['**/mobile.spec.ts'],
    },

    // ── Performance (Chromium only, no retries) ───────────────────────────────
    {
      name: 'performance',
      use: { ...devices['Desktop Chrome'], headless: true },
      testMatch: ['**/performance.spec.ts'],
      retries: 0,
    },
  ],
});
