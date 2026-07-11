# 🚌 RedBus Test Automation Framework

A robust, modern end-to-end automation suite for **[RedBus (redbus.in)](https://www.redbus.in)** built with **Playwright**, **TypeScript**, and following the **Page Object Model (POM)** pattern.

This test suite covers a comprehensive set of test cases, including functional validation, responsive web design (mobile/tablet layout assertions), accessibility audits, visual regression verification, and performance analysis.

---

## 🛠️ Tech Stack & Key Libraries

- **Test Runner & Browser Automation:** [Playwright](https://playwright.dev/)
- **Programming Language:** [TypeScript](https://www.typescriptlang.org/)
- **Core Automation Features:**
  - Parallel cross-browser execution capability.
  - Multi-viewport support (Desktop, Mobile, and Tablet profiles).
  - Interception of XHR/API responses to guarantee page load stability.
  - Snapshot-based visual regression checks.
  - Accessibility validation based on ARIA roles, semantics, and focus management.

---

## 📂 Repository Structure

The framework is structured as follows under the `redbus-tests` subfolder:

```
redbus-tests/
├── .github/workflows/          # CI/CD pipelines
│   └── playwright.yml          # GitHub Actions workflow configuration
├── tests/
│   ├── fixtures/
│   │   └── baseTest.ts         # Custom fixtures initializing pages automatically
│   ├── pages/                  # Page Object Models (POM) representing page behaviors
│   │   ├── BasePage.ts         # Base classes containing common wrappers and resilient waits
│   │   ├── HomePage.ts         # Selectors and interaction methods for homepage
│   │   ├── BusResultsPage.ts   # Locators and helper methods for listings, filters & seat layouts
│   │   ├── TrainPage.ts        # POM for RedRail/train bookings page
│   │   └── HotelPage.ts        # POM for RedBus hotel search page
│   ├── specs/                  # Test suites grouped by type
│   │   ├── 01-ui-validation.spec.ts  # Verification of branding, header, footer, links
│   │   ├── redbus.spec.ts            # Functional ticket search, AC filter, sorting, seat layout
│   │   ├── accessibility.spec.ts     # ARIA, focus state, HTML5 structure verification
│   │   ├── mobile.spec.ts            # Dynamic layout verification on smaller screen sizes
│   │   ├── performance.spec.ts       # Network performance metrics, time-to-first-byte
│   │   └── visual.spec.ts            # Screenshot comparison and visual consistency checks
│   └── utils/                  # Reusable utilities
│       ├── dateUtils.ts        # Dynamic date calculation utility helpers
│       ├── helpers.ts          # Custom screen capturers, custom logging, and assertions
│       ├── networkHelper.ts    # Network monitoring, API tracking, and response parsing
│       └── testData.ts         # Test inputs, search parameters, and constants
├── playwright.config.ts        # Global configuration (retries, viewports, timeout rules)
├── tsconfig.json               # TypeScript compilation details
└── package.json                # Project dependencies and details
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have **Node.js (version 18+ or LTS)** installed on your machine.

### Installation

1. Navigate to the `redbus-tests` directory:
   ```bash
   cd redbus-tests
   ```

2. Install the package dependencies:
   ```bash
   npm install
   ```

3. Download the Playwright browser binaries and dependencies:
   ```bash
   npx playwright install --with-deps
   ```

---

## 🧪 Running Tests

All commands should be executed from within the `redbus-tests` folder.

### Run All Test Suites
Runs the entire suite in headless mode across all configured projects (Desktop, Mobile, etc.):
```bash
npx playwright test
```

### Run Specific Test Spec
Run only a single test file, e.g., Functional booking specs:
```bash
npx playwright test tests/specs/redbus.spec.ts
```

### Run in Headed (UI) Mode
See the actual browser execution in real-time:
```bash
npx playwright test --headed
```

### Run on a Specific Browser/Profile
Run tests using only a specific profile configured in `playwright.config.ts` (e.g. Chromium, Mobile Safari):
```bash
npx playwright test --project=chromium
npx playwright test --project=mobile-safari
```

### Show Last Test Run Report
View the generated HTML report:
```bash
npx playwright show-report
```

---

## 💡 Key Features of the Framework

1. **Robust XHR & Network Synchronization:** Uses custom API monitors (in `BasePage.ts` and `networkHelper.ts`) to wait for critical asynchronous network requests to complete before interacting with search results, avoiding flaky sleep loops.
2. **Sequential Workspace Config:** Configured with `fullyParallel: false` and a limited worker limit to respect RedBus's rate-limiting, preventing Cloudflare blocks during automated test runs.
3. **Resilient Locators:** Dynamic selectors targeting semantic elements (e.g., placeholder keywords, ARIA roles, or partial classes) to ensure test stability when minor UI changes occur.
4. **Comprehensive Custom Logs:** Embedded custom logger in `helpers.ts` outputs detailed workflow logs for every navigation step, element search, and assertion verification.
5. **Visual Comparison & Snapshots:** Tracks layout consistency and UI styling using Playwright's native screenshot diff tools, stored under `visual.spec.ts-snapshots/`.

---

## ⚙️ CI/CD Integration

The repository comes configured with a GitHub Actions workflow in `.github/workflows/playwright.yml`. On every push and pull request to the `main` or `master` branches, the workflow will:
- Check out the codebase.
- Install dependencies.
- Install the required Playwright browser versions.
- Execute all tests.
- Upload test results and reports as job artifacts (retained for 30 days).
