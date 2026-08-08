// =============================================================================
// playwright.config.ts — Enterprise Execution & Scaling Configuration
// Implements: Sharding → Parallelism → Dynamic Workers → Report Merging → Retry Strategy → Resource Management
// =============================================================================

import { defineConfig, devices } from '@playwright/test';
import * as os from 'os';

const isCI = !!process.env.CI;
const cpuCount = os.cpus().length;

export default defineConfig({
  // ── 1. Test Discovery ───────────────────────────────────────────────────────
  testDir: './tests/specs',
  testMatch: ['**/*.spec.ts'],

  // ── 2. Parallelism ──────────────────────────────────────────────────────────
  // Enable parallel execution for tests within files
  fullyParallel: true,

  // ── 3. Dynamic Workers (Resource Management) ────────────────────────────────
  // Automatically size workers based on available CPU cores and environment
  workers: isCI 
    ? Math.max(2, Math.floor(cpuCount / 2)) 
    : '50%',

  // ── 4. Retry Strategy ───────────────────────────────────────────────────────
  // Retry failing tests on CI to handle network flakiness, 0 retries locally for fast feedback
  retries: isCI ? 2 : 0,
  forbidOnly: isCI,

  // ── 5. Timeouts & Resource Controls ─────────────────────────────────────────
  timeout: 90_000,               // 90s per test execution
  expect: { timeout: 10_000 },   // 10s per assertion

  // ── 6. Report Merging & Multi-Reporter Setup ────────────────────────────────
  // In CI, blob reporter collects sharded results for report merging; locally uses standard HTML/List
  reporter: isCI
    ? [
        ['blob', { outputDir: 'blob-report' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['github'],
      ]
    : [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
      ],

  // ── 7. Shared Execution & Resource Management ──────────────────────────────
  use: {
    baseURL: 'https://www.redbus.in',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Resource Management & Debugging Artifacts
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    trace: 'retain-on-failure',

    // Timeouts
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    // Browser Flags for Memory & Resource Efficiency
    launchOptions: {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage', // Overcome limited shared memory space in Docker/CI
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
      ],
    },

    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/124.0.0.0 Safari/537.36',
    },
  },

  // ── Output Directory ───────────────────────────────────────────────────────
  outputDir: 'test-results/',

  // ── Projects (Cross-Browser Matrix) ────────────────────────────────────────
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0',
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: ['**/mobile.spec.ts'],
    },
  ],
});

