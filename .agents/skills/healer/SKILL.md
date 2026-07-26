---
name: healer
description: Automates diagnosing and self-healing failing Playwright tests, particularly locator timeouts, structural changes, or visual diffs in the RedBus automation workspace.
---

# 🩺 Playwright Test Self-Healing Skill

Use this skill when a user asks to diagnose or fix a failing test, or when a test fails during automated validation runs in the RedBus Automation workspace.

## 📋 Healing Workflow

### 1. Locate the Failure Reports
First, look at the recent test execution artifacts:
- **JSON Report:** [results.json](file:///Users/mohit/Gemini_Anitigravity/redbus-tests/test-results/results.json)
- **HTML Report:** `redbus-tests/playwright-report/index.html` (if generated)

### 2. Identify the Failing Tests
Parse `results.json` to find all specs that did not pass:
- Look for tests where `expectedStatus` is `"passed"` but the actual `status` of the result run is `"failed"` or `"unexpected"`.
- Retrieve the exact error message and stack trace (`errors` list in the test result).

### 3. Trace to the Source Code
Identify the code file path, line number, and column:
- Use the `file` and `line` properties in the failing spec block.
- Navigate to the file at the precise line range using the `view_file` tool.
- Determine if the locator resides directly in the spec file or inside a Page Object Model (POM) class under `redbus-tests/tests/pages/`.

### 4. Diagnose the Root Cause
- **Timeout/Selector Not Found:** The web page elements may have changed (RedBus class names are frequently updated or use dynamic patterns).
- **Assertion Failure:** The actual value returned does not match expectations (e.g., modified date calculations or rate-limiting behavior).
- **Visual Regression:** Captured visual screenshot does not match the baseline snapshot under `visual.spec.ts-snapshots/`.
- **Accessibility (a11y) Violations:** A target element's ARIA attributes, semantic tags, or focus characteristics are invalid or missing.

### 5. Apply Self-Healing Rules
1. **Prioritize Playwright Semantic Locators:** If replacing a broken CSS selector or XPath, prefer Playwright's semantic user-facing locators in this order:
   - `page.getByRole(role, options)`
   - `page.getByText(text, options)`
   - `page.getByPlaceholder(placeholder)`
   - `page.getByLabel(label)`
   - `page.getByTestId(id)`
2. **Handle Dynamic Attributes:** RedBus pages use CSS classes with alphanumeric suffixes (e.g., `dateInputWrapper___c7fbb9`). When writing CSS selectors:
   - Use partial matching on classes: `div[class*="dateInputWrapper"]` instead of exact match.
   - Use robust structure wrappers or unique sibling nodes.
3. **Update Baseline Snapshots (Visual diffs):** If a visual test fails due to intentional layout updates, run the update snapshot command instead of changing locators:
   - `npx playwright test tests/specs/visual.spec.ts --update-snapshots`
4. **Resilient Wait Wrappers:** Ensure the page object uses the custom network-aware wait utilities (from `BasePage.ts` or `networkHelper.ts`) to allow dynamic APIs to load before verifying locators.

### 6. Verify and Log
- Run the fixed spec:
  ```bash
  npx playwright test tests/specs/<spec-name>.spec.ts
  ```
- If the test passes, document the healer action inside the `walkthrough.md` or a diagnostic report. Include:
  - The file and line number of the original failure.
  - The broken selector.
  - The healed selector.
  - Verification run results.
