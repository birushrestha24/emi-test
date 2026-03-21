/**
 * @suite Functional – EMI Calculation & Results Panel
 * @tags  @smoke @regression @functional
 *
 * Covers:
 *   TC-F-001  Default EMI on page load
 *   TC-F-002  EMI formula validation
 *   TC-F-003  Total Interest Payable accuracy
 *   TC-F-004  Total Payment = Principal + Interest
 *   TC-F-005  Change Loan Amount via text input
 *   TC-F-006  Change Interest Rate via text input
 *   TC-F-007  Change Tenure via text input
 *   TC-F-008  Tenure unit toggle Yr ↔ Mo
 *   TC-F-009  Higher rate → higher EMI  (monotone)
 *   TC-F-010  Shorter tenure → higher EMI (monotone)
 */

import { test, expect } from '@playwright/test';
import { EMICalculatorPage } from '../../pages/EMICalculatorPage';
import { calculateEMI, calculateLoanSummary, withinTolerance, formatINR } from '../../utils/emiHelper';
import { FORMULA_SCENARIOS, MONOTONE_RATE_TEST, MONOTONE_TENURE_TEST, TENURE_EQUIVALENCE } from '../../fixtures/testData';

test.describe('Functional – EMI Calculation', () => {

  let calc: EMICalculatorPage;

  test.beforeEach(async ({ page }) => {
    calc = new EMICalculatorPage(page);
    await calc.goto();
  });

  // ── TC-F-001 ──────────────────────────────────────────────────────────────
  test('TC-F-001 @smoke – page loads and displays a non-zero EMI by default', async () => {
    const emi = await calc.getEMI();

    expect(emi, 'EMI should be a positive number on load').toBeGreaterThan(0);
    expect(isNaN(emi), 'EMI should not be NaN').toBe(false);
  });

  // ── TC-F-002 ──────────────────────────────────────────────────────────────
  test('TC-F-002 @smoke – EMI matches formula for 50L @ 9% for 20yr', async () => {
    await calc.setLoanAmount(5_000_000);
    await calc.setInterestRate(9);
    await calc.setLoanTenure(20, 'yr');

    await calc.assertEMIMatchesFormula(5_000_000, 9, 20, 2);
  });

  // ── TC-F-003 ──────────────────────────────────────────────────────────────
  test('TC-F-003 @regression – Total Interest = (EMI × n) − Principal', async () => {
    const principal   = 5_000_000;
    const rate        = 9;
    const tenure      = 20;

    await calc.setLoanAmount(principal);
    await calc.setInterestRate(rate);
    await calc.setLoanTenure(tenure, 'yr');

    const emi           = await calc.getEMI();
    const displayedTI   = await calc.getTotalInterest();
    const expectedTI    = emi * (tenure * 12) - principal;

    const { pass, message } = withinTolerance(displayedTI, expectedTI, 1000);
    expect(pass, `Total Interest mismatch:\n  ${message}`).toBe(true);
  });

  // ── TC-F-004 ──────────────────────────────────────────────────────────────
  test('TC-F-004 @smoke – Total Payment = Principal + Total Interest', async () => {
    const principal = 5_000_000;

    await calc.setLoanAmount(principal);
    await calc.setInterestRate(9);
    await calc.setLoanTenure(20, 'yr');

    await calc.assertTotalPaymentIntegrity(principal, 1000);
  });

  // ── TC-F-005 ──────────────────────────────────────────────────────────────
  test('TC-F-005 @regression – changing Loan Amount recalculates EMI', async () => {
    const principal = 3_000_000;
    const rate      = 9;
    const tenure    = 20;

    await calc.setLoanAmount(principal);
    await calc.setInterestRate(rate);
    await calc.setLoanTenure(tenure);

    await calc.assertEMIMatchesFormula(principal, rate, tenure, 2);
  });

  // ── TC-F-006 ──────────────────────────────────────────────────────────────
  test('TC-F-006 @regression – changing Interest Rate recalculates EMI', async () => {
    const principal = 5_000_000;
    const rate      = 7.5;
    const tenure    = 20;

    await calc.setLoanAmount(principal);
    await calc.setInterestRate(rate);
    await calc.setLoanTenure(tenure);

    await calc.assertEMIMatchesFormula(principal, rate, tenure, 2);
  });

  // ── TC-F-007 ──────────────────────────────────────────────────────────────
  test('TC-F-007 @regression – changing Loan Tenure recalculates EMI', async () => {
    const principal = 5_000_000;
    const rate      = 9;
    const tenure    = 15;

    await calc.setLoanAmount(principal);
    await calc.setInterestRate(rate);
    await calc.setLoanTenure(tenure);

    await calc.assertEMIMatchesFormula(principal, rate, tenure, 2);
  });

  // ── TC-F-008 ──────────────────────────────────────────────────────────────
  test('TC-F-008 @regression – tenure unit: 20yr (Yr) = 240mo (Mo) produces same EMI', async () => {
    const { loanAmount, interestRate, years, months } = TENURE_EQUIVALENCE;

    // Set in Year mode
    await calc.setLoanAmount(loanAmount);
    await calc.setInterestRate(interestRate);
    await calc.setLoanTenure(years, 'yr');
    const emiYr = await calc.getEMI();

    // Switch to Month mode
    await calc.setLoanTenure(months, 'mo');
    const emiMo = await calc.getEMI();

    const { pass, message } = withinTolerance(emiMo, emiYr, 5);
    expect(pass, `Tenure unit mismatch:\n  ${message}\n  20yr EMI=${formatINR(emiYr)}, 240mo EMI=${formatINR(emiMo)}`).toBe(true);
  });

  // ── TC-F-009 ──────────────────────────────────────────────────────────────
  test('TC-F-009 @regression – higher interest rate → higher EMI (monotone)', async () => {
    const { loanAmount, tenureYears, rates } = MONOTONE_RATE_TEST;
    const emis: number[] = [];

    await calc.setLoanAmount(loanAmount);
    await calc.setLoanTenure(tenureYears);

    for (const rate of rates) {
      await calc.setInterestRate(rate);
      emis.push(await calc.getEMI());
    }

    for (let i = 1; i < emis.length; i++) {
      expect(
        emis[i],
        `EMI at rate ${rates[i]}% (${formatINR(emis[i])}) should be > EMI at ${rates[i - 1]}% (${formatINR(emis[i - 1])})`,
      ).toBeGreaterThan(emis[i - 1]);
    }
  });

  // ── TC-F-010 ──────────────────────────────────────────────────────────────
  test('TC-F-010 @regression – shorter tenure → higher EMI (monotone)', async () => {
    const { loanAmount, interestRate, tenures } = MONOTONE_TENURE_TEST;
    const emis: number[] = [];

    await calc.setLoanAmount(loanAmount);
    await calc.setInterestRate(interestRate);

    for (const t of tenures) {
      await calc.setLoanTenure(t);
      emis.push(await calc.getEMI());
    }

    // tenures array is descending [30, 20, 10, 5] → EMIs should be ascending
    for (let i = 1; i < emis.length; i++) {
      expect(
        emis[i],
        `EMI at ${tenures[i]}yr (${formatINR(emis[i])}) should be > EMI at ${tenures[i - 1]}yr (${formatINR(emis[i - 1])})`,
      ).toBeGreaterThan(emis[i - 1]);
    }
  });

  // ── Parametrized formula scenarios ───────────────────────────────────────
  for (const scenario of FORMULA_SCENARIOS) {
    test(`TC-F-PARAM @regression – Formula: ${scenario.description}`, async () => {
      await calc.setLoanAmount(scenario.loanAmount);
      await calc.setInterestRate(scenario.interestRate);
      await calc.setLoanTenure(scenario.tenureYears, 'yr');

      await calc.assertEMIMatchesFormula(
        scenario.loanAmount,
        scenario.interestRate,
        scenario.tenureYears,
        scenario.toleranceINR ?? 2,
      );

      // Also verify total payment integrity
      await calc.assertTotalPaymentIntegrity(scenario.loanAmount, 2000);
    });
  }

});
