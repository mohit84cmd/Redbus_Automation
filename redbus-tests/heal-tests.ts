import * as fs from 'fs';
import * as path from 'path';

const REPORT_PATH = path.join(__dirname, 'test-results', 'results.json');

export interface FailureCategory {
  type: string;
  badge: string;
  description: string;
  probableCauses: string[];
  suggestedFixes: string[];
  codeDiffHint?: string;
}

export interface FailedTestDetails {
  title: string;
  file: string;
  line: number;
  column: number;
  projectName: string;
  error: any;
  stdout: any[];
  category?: FailureCategory;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AI Failure Classifier
// ─────────────────────────────────────────────────────────────────────────────
export function classifyFailure(errorMessage: string, stackTrace: string): FailureCategory {
  const err = (errorMessage + ' ' + stackTrace).toLowerCase();

  // Category 1: Locator & Selector Timeout
  if (err.includes('waiting for locator') || err.includes('timeout') && err.includes('locator')) {
    return {
      type: 'LOCATOR_TIMEOUT',
      badge: '🔍 LOCATOR / SELECTOR TIMEOUT',
      description: 'The target DOM element was not found within the action/navigation timeout period.',
      probableCauses: [
        'Dynamic CSS class names changed on RedBus production HTML.',
        'Element is rendered asynchronously via XHR request that has not settled.',
        'Element is hidden inside an iframe or shadow DOM.',
      ],
      suggestedFixes: [
        'Replace brittle CSS selectors with user-facing aria locators (page.getByRole, page.getByText, page.getByLabel).',
        'Use network interception wrapper: await networkHelper.waitForAPI("suggestions") prior to interacting.',
        'Increase locator timeout explicitly: page.locator(sel).click({ timeout: 15000 }).',
      ],
      codeDiffHint: `- await page.click('.sc-dnqmqq li:first-child')\n+ await networkHelper.waitForSuggestions();\n+ await page.getByRole('option').first().click();`,
    };
  }

  // Category 2: Visual Regression Mismatch
  if (err.includes('screenshot') || err.includes('snapshot') || err.includes('pixel ratio')) {
    return {
      type: 'VISUAL_DIFF_MISMATCH',
      badge: '🎨 VISUAL REGRESSION MISMATCH',
      description: 'The rendered page layout differs visually from the stored baseline snapshot.',
      probableCauses: [
        'Banner graphics, advertisements, or dynamic promo counters changed.',
        'Screen resolution or font rendering differs across OS environments.',
      ],
      suggestedFixes: [
        'Mask dynamic elements during visual snapshot: expect(page).toHaveScreenshot({ mask: [page.locator(".promo-banner")] }).',
        'Update baseline snapshots if changes are intentional.',
      ],
      codeDiffHint: `npx playwright test --update-snapshots`,
    };
  }

  // Category 3: Assertion Mismatch
  if (err.includes('expect(') || err.includes('received') || err.includes('tobetruthy')) {
    return {
      type: 'ASSERTION_FAILURE',
      badge: '❌ ASSERTION MISMATCH',
      description: 'The actual value returned by the application did not meet expected criteria.',
      probableCauses: [
        'Data mismatch from RedBus search results API (e.g. 0 buses found for specific route/date).',
        'Stale or incorrect date calculation in dateUtils.',
      ],
      suggestedFixes: [
        'Verify test date offset in dateUtils.ts to ensure future date is valid.',
        'Use soft assertions (expect.soft) or handle empty result fallbacks.',
      ],
      codeDiffHint: `- expect(busCount).toBeGreaterThan(0);\n+ expect(busCount).toBeGreaterThanOrEqual(0); // handle rate-limited route gracefully`,
    };
  }

  // Category 4: Network & Rate Limiting (HTTP 429 / 5xx)
  if (err.includes('net::') || err.includes('429') || err.includes('500') || err.includes('503') || err.includes('fetch')) {
    return {
      type: 'NETWORK_RATE_LIMIT',
      badge: '🌐 NETWORK / RATE LIMIT ERROR',
      description: 'The server responded with an HTTP error code or blocked requests.',
      probableCauses: [
        'RedBus bot protection / Cloudflare rate-limiting triggered due to frequent requests.',
        'Network disconnection or DNS lookup failure.',
      ],
      suggestedFixes: [
        'Enable user-agent rotation & custom HTTP headers in playwright.config.ts.',
        'Use route mocking (page.route) to mock search responses offline.',
      ],
      codeDiffHint: `await networkHelper.setMock('busSearch', MOCK_BUS_RESULTS);`,
    };
  }

  // Fallback: General Uncaught Error
  return {
    type: 'GENERAL_ERROR',
    badge: '💥 UNCAUGHT EXCEPTION / GENERAL ERROR',
    description: 'An unexpected runtime or JavaScript error occurred during test execution.',
    probableCauses: [
      'Uncaught TypeError on client page.',
      'Unhandled promise rejection in spec file.',
    ],
    suggestedFixes: [
      'Add page.on("pageerror", handler) listener to capture and log client exception.',
      'Wrap code block in try-catch or verify page state before action.',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Report Parser
// ─────────────────────────────────────────────────────────────────────────────
function findFailedTests(suites: any[]): FailedTestDetails[] {
  const failures: FailedTestDetails[] = [];

  function traverse(node: any) {
    if (node.specs) {
      for (const spec of node.specs) {
        if (spec.tests) {
          for (const test of spec.tests) {
            const hasUnexpected =
              test.status === 'unexpected' ||
              test.results?.some(
                (r: any) => r.status === 'failed' || r.status === 'timedOut',
              );
            if (hasUnexpected) {
              const err = test.results?.[0]?.errors?.[0] || null;
              const stack = err?.stack || '';
              const category = classifyFailure(err?.message || '', stack);

              failures.push({
                title: spec.title,
                file: spec.file,
                line: spec.line,
                column: spec.column,
                projectName: test.projectName || test.projectId,
                error: err,
                stdout: test.results?.[0]?.stdout || [],
                category,
              });
            }
          }
        }
      }
    }
    if (node.suites) {
      for (const subSuite of node.suites) {
        traverse(subSuite);
      }
    }
  }

  for (const suite of suites) {
    traverse(suite);
  }
  return failures;
}

function getCodeSnippet(filePath: string, lineNum: number): string {
  let targetPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(__dirname, 'tests/specs', filePath);

  if (!fs.existsSync(targetPath)) {
    targetPath = path.join(__dirname, filePath);
    if (!fs.existsSync(targetPath)) {
      return `   [Code file not found at ${filePath}]`;
    }
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    const lines = content.split('\n');
    const start = Math.max(0, lineNum - 3);
    const end = Math.min(lines.length, lineNum + 2);

    let snippet = '';
    for (let i = start; i < end; i++) {
      const isTarget = i + 1 === lineNum;
      snippet += `   ${isTarget ? '➔' : ' '} ${String(i + 1).padStart(3)}: ${lines[i]}\n`;
    }
    return snippet;
  } catch (err: any) {
    return `   [Error reading code snippet: ${err.message}]`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Execution Pipeline
// ─────────────────────────────────────────────────────────────────────────────
function main() {
  console.log(
    '\x1b[36m%s\x1b[0m',
    '🤖 Starting AI Playwright Failure Analyzer & Self-Healing Engine...\n',
  );

  if (!fs.existsSync(REPORT_PATH)) {
    console.error(
      '\x1b[31m%s\x1b[0m',
      `❌ Playwright report file not found at: ${REPORT_PATH}`,
    );
    console.log(
      'Run your tests first: \x1b[33mnpx playwright test\x1b[0m\n',
    );
    process.exit(1);
  }

  try {
    const reportData = fs.readFileSync(REPORT_PATH, 'utf-8');
    const report = JSON.parse(reportData);

    if (!report.suites || report.suites.length === 0) {
      console.log('\x1b[32m%s\x1b[0m', '✅ No test suites found in report.');
      return;
    }

    const failures = findFailedTests(report.suites);

    if (failures.length === 0) {
      console.log('\x1b[32m%s\x1b[0m', '🎉 All tests passed cleanly! No healing required.');
      return;
    }

    console.log(
      '\x1b[33m%s\x1b[0m',
      `⚠️  Found ${failures.length} failed test run(s). Analyzing failures & generating fixes:\n`,
    );

    failures.forEach((fail, idx) => {
      const cat = fail.category!;
      console.log(`\x1b[35m===========================================================================\x1b[0m`);
      console.log(`❌ \x1b[31mFAILURE #${idx + 1}\x1b[0m | ${cat.badge}`);
      console.log(`\x1b[35m===========================================================================\x1b[0m`);
      console.log(`📍 \x1b[1mTest Case\x1b[0m    : ${fail.title}`);
      console.log(`🖥️  \x1b[1mBrowser\x1b[0m      : ${fail.projectName}`);
      console.log(`📁 \x1b[1mFile Location\x1b[0m: ${fail.file}:${fail.line}`);
      console.log(`ℹ️  \x1b[1mDescription\x1b[0m  : ${cat.description}`);

      console.log(`\n🔍 \x1b[1mFailing Code Context\x1b[0m:`);
      console.log(getCodeSnippet(fail.file, fail.line));

      if (fail.error?.message) {
        console.log(`📝 \x1b[1mError Trace\x1b[0m:`);
        console.log(`   \x1b[31m${fail.error.message.split('\n')[0]}\x1b[0m`);
      }

      console.log(`\n💡 \x1b[1mProbable Causes\x1b[0m:`);
      cat.probableCauses.forEach((cause) => console.log(`   • ${cause}`));

      console.log(`\n🛠️  \x1b[32mSuggested Fixes\x1b[0m:`);
      cat.suggestedFixes.forEach((fix) => console.log(`   ✅ ${fix}`));

      if (cat.codeDiffHint) {
        console.log(`\n📝 \x1b[1mRecommended Code Fix (Diff)\x1b[0m:`);
        console.log(`\x1b[36m${cat.codeDiffHint}\x1b[0m`);
      }

      console.log(`\n🚀 \x1b[1mRe-run Target Command\x1b[0m:`);
      console.log(
        `   \x1b[34mnpx playwright test tests/specs/${path.basename(
          fail.file,
        )} --project=${fail.projectName} --headed\x1b[0m\n`,
      );
    });
  } catch (err: any) {
    console.error('\x1b[31m%s\x1b[0m', `❌ Error running analyzer: ${err.message}`);
    process.exit(1);
  }
}

main();

