/**
 * @suite Negative & Input Validation
 * @tags  @regression @negative
 *
 * Covers:
 *   TC-N-001  Non-numeric input in loan field is rejected
 *   TC-N-002  Negative loan amount is not accepted
 *   TC-N-003  Zero interest rate does not cause NaN / crash
 *   TC-N-004  Zero tenure does not produce divide-by-zero
 *   TC-N-005  Special characters are rejected from inputs
 *   TC-N-006  No JavaScript console errors on page load
 */

import { test, expect } from '@playwright/test';
import { EMICalculatorPage } from '../../pages/EMICalculatorPage';

test.describe('Negative & Input Validation', () => {

  let calc: EMICalculatorPage;

  test.beforeEach(async ({ page }) => {
    calc = new EMICalculatorPage(page);
    await calc.goto();
  });

  // ── TC-N-001 ──────────────────────────────────────────────────────────────
  test('TC-N-001 @regression – non-numeric loan input does not produce NaN EMI', async ({ page }) => {
    // Capture any console errors during the interaction
    const consoleErrors: string[] = [];
    page.on('pageerror', err => consoleErrors.push(err.message));

    await calc.loanAmountInput.click({ clickCount: 3 });
    await calc.loanAmountInput.fill('abcdef');
    await calc.loanAmountInput.press('Tab');
    await page.waitForTimeout(700);

    const emi = await calc.getEMI();

    // EMI must not be NaN or Infinity
    expect(isNaN(emi),     'EMI should not be NaN after invalid input').toBe(false);
    expect(isFinite(emi),  'EMI should not be Infinity').toBe(true);

    // No critical page errors
    const criticalErrors = consoleErrors.filter(e =>
      !e.toLowerCase().includes('analytics') &&
      !e.toLowerCase().includes('adsbygoogle'),
    );
    expect(criticalErrors, `Unexpected JS errors: ${criticalErrors.join(', ')}`).toHaveLength(0);
  });

  // ── TC-N-002 ──────────────────────────────────────────────────────────────
  test('TC-N-002 @regression – negative loan amount does not produce negative EMI', async ({ page }) => {
    await calc.loanAmountInput.click({ clickCount: 3 });
    await calc.loanAmountInput.fill('-5000000');
    await calc.loanAmountInput.press('Tab');
    await page.waitForTimeout(700);

    const emi = await calc.getEMI();

    expect(emi, 'EMI should never be negative').toBeGreaterThanOrEqual(0);
    expect(isNaN(emi), 'EMI should not be NaN').toBe(false);
  });

  // ── TC-N-003 ──────────────────────────────────────────────────────────────
  test('TC-N-003 @regression – zero interest rate does not crash or show NaN', async ({ page }) => {
    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await calc.setLoanAmount(5_000_000);
    await calc.interestRateInput.click({ clickCount: 3 });
    await calc.interestRateInput.fill('0');
    await calc.interestRateInput.press('Tab');
    await page.waitForTimeout(700);

    // Page should not show NaN or Infinity anywhere in results area
    const pageContent = await page.content();
    expect(pageContent).not.toContain('NaN');
    expect(pageContent).not.toContain('Infinity');

    // EMI should still be a valid number (either clamped to min rate or 0%)
    const emi = await calc.getEMI();
    expect(isNaN(emi),   'EMI should not be NaN').toBe(false);
    expect(isFinite(emi),'EMI should not be Infinite').toBe(true);

    const criticalErrors = pageErrors.filter(e =>
      !e.toLowerCase().includes('analytics') &&
      !e.toLowerCase().includes('adsbygoogle'),
    );
    expect(criticalErrors, `JS errors on zero rate: ${criticalErrors.join(', ')}`).toHaveLength(0);
  });

  // ── TC-N-004 ──────────────────────────────────────────────────────────────
  test('TC-N-004 @regression – zero tenure does not cause divide-by-zero crash', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await calc.setLoanAmount(5_000_000);
    await calc.setInterestRate(9);

    await calc.loanTenureInput.click({ clickCount: 3 });
    await calc.loanTenureInput.fill('0');
    await calc.loanTenureInput.press('Tab');
    await page.waitForTimeout(700);

    const pageContent = await page.content();
    expect(pageContent).not.toContain('NaN');
    expect(pageContent).not.toContain('Infinity');

    const criticalErrors = pageErrors.filter(e =>
      !e.toLowerCase().includes('analytics') &&
      !e.toLowerCase().includes('adsbygoogle'),
    );
    expect(criticalErrors, `JS errors on zero tenure: ${criticalErrors.join(', ')}`).toHaveLength(0);
  });

  // ── TC-N-005 ──────────────────────────────────────────────────────────────
  test('TC-N-005 @regression – special characters in interest rate field are rejected', async ({ page }) => {
    // First set a known good state
    await calc.setLoanAmount(5_000_000);
    await calc.setLoanTenure(20);
    await calc.setInterestRate(9);
    const emiBeforeInvalid = await calc.getEMI();

    // Now enter special characters into rate field
    await calc.interestRateInput.click({ clickCount: 3 });
    await calc.interestRateInput.type('@#$%');
    await calc.interestRateInput.press('Tab');
    await page.waitForTimeout(700);

    const emi = await calc.getEMI();
    expect(isNaN(emi),    'EMI should not be NaN after special chars').toBe(false);
    expect(isFinite(emi), 'EMI should not be Infinite').toBe(true);
    expect(emi,           'EMI should remain positive').toBeGreaterThan(0);
  });

  // ── TC-N-006 ──────────────────────────────────────────────────────────────
  test('TC-N-006 @smoke – no critical JavaScript errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    // Navigate fresh
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);   // let all scripts initialise

    // Filter out known third-party noise (analytics, ads)
    const criticalErrors = errors.filter(e => {
      const msg = e.toLowerCase();
      return (
        !msg.includes('analytics')         &&
        !msg.includes('gtag')              &&
        !msg.includes('adsbygoogle')       &&
        !msg.includes('googlesyndication') &&
        !msg.includes('doubleclick')
      );
    });

    expect(
      criticalErrors,
      `Critical JS errors on load:\n${criticalErrors.join('\n')}`,
    ).toHaveLength(0);
  });

});
