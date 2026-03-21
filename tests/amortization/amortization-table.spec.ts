/**
 * @suite Amortization Table & Chart Validation
 * @tags  @regression @amortization
 *
 * Covers:
 *   TC-C-001  Table renders with correct column headers
 *   TC-C-002  Row count matches tenure
 *   TC-C-003  First year row values match expected
 *   TC-C-004  Last year row: balance = 0, Loan Paid = 100%
 *   TC-C-005  Sum of Interest column = Total Interest Payable
 *   TC-C-006  Sum of Principal column = Loan Amount
 *   TC-C-007  Per-row: Total Payment = Principal + Interest
 *   TC-C-008  Balance decreases monotonically year-over-year
 *   TC-C-009  Loan Paid % increases monotonically
 *   TC-C-010  Table updates when inputs change
 *   TC-C-011  Pie chart is visible and has rendered dimensions
 */

import { test, expect } from '@playwright/test';
import { EMICalculatorPage } from '../../pages/EMICalculatorPage';
import { withinTolerance, formatINR } from '../../utils/emiHelper';
import { AMORTIZATION_PARAMS } from '../../fixtures/testData';

test.describe('Amortization Table & Chart', () => {

  let calc: EMICalculatorPage;

  // Set up known inputs before each test
  test.beforeEach(async ({ page }) => {
    calc = new EMICalculatorPage(page);
    await calc.goto();

    // Use stable known inputs: 50L @ 9% for 20yr
    await calc.setLoanAmount(AMORTIZATION_PARAMS.loanAmount);
    await calc.setInterestRate(AMORTIZATION_PARAMS.interestRate);
    await calc.setLoanTenure(AMORTIZATION_PARAMS.tenureYears, 'yr');
  });

  // ── TC-C-001 ──────────────────────────────────────────────────────────────
  test('TC-C-001 @smoke – amortization table is visible with correct column headers', async () => {
    await calc.paymentScheduleTable.scrollIntoViewIfNeeded();
    await expect(calc.paymentScheduleTable).toBeVisible();

    const headerText = await calc.paymentScheduleTable.locator('thead, tr').first().innerText();
    const lower = headerText.toLowerCase();

    expect(lower).toContain('year');
    expect(lower).toMatch(/principal/i);
    expect(lower).toMatch(/interest/i);
    expect(lower).toMatch(/balance/i);
  });

  // ── TC-C-002 ──────────────────────────────────────────────────────────────
  test('TC-C-002 @regression – row count matches loan tenure (20 rows for 20yr)', async () => {
    const rows = await calc.getAmortizationRows();

    // Allow ±1 for partial first/last year
    expect(rows.length, `Expected ~20 rows for 20yr tenure, got ${rows.length}`).toBeGreaterThanOrEqual(19);
    expect(rows.length).toBeLessThanOrEqual(21);
  });

  // ── TC-C-003 ──────────────────────────────────────────────────────────────
  test('TC-C-003 @regression – first year row values are within expected range', async () => {
    const rows = await calc.getAmortizationRows();
    expect(rows.length).toBeGreaterThan(0);

    const firstRow = rows[0];

    // For 50L, 9%, 20yr the first year should have low principal, high interest
    // Principal paid in year 1 is small (mostly interest)
    expect(firstRow.principal, 'Year-1 principal should be positive').toBeGreaterThan(0);
    expect(firstRow.interest,  'Year-1 interest should be positive').toBeGreaterThan(0);

    // Interest in year 1 >> principal (early in an amortization)
    expect(
      firstRow.interest,
      `Year-1 interest (${formatINR(firstRow.interest)}) should be > principal (${formatINR(firstRow.principal)})`,
    ).toBeGreaterThan(firstRow.principal);

    // Balance after year 1 should be slightly less than original loan
    expect(firstRow.balance).toBeGreaterThan(0);
    expect(firstRow.balance).toBeLessThan(AMORTIZATION_PARAMS.loanAmount);

    // Loan paid % in year 1 should be small (< 5%)
    expect(firstRow.loanPaidPct).toBeGreaterThan(0);
    expect(firstRow.loanPaidPct).toBeLessThan(5);
  });

  // ── TC-C-004 ──────────────────────────────────────────────────────────────
  test('TC-C-004 @smoke – final year row: balance ≈ ₹0 and Loan Paid = 100%', async () => {
    const rows = await calc.getAmortizationRows();
    expect(rows.length).toBeGreaterThan(0);

    const lastRow = rows[rows.length - 1];

    expect(
      lastRow.balance,
      `Final year balance should be ₹0, got ${formatINR(lastRow.balance)}`,
    ).toBeLessThanOrEqual(1000);   // ≤ ₹1,000 for rounding

    expect(
      lastRow.loanPaidPct,
      `Final year Loan Paid% should be 100%, got ${lastRow.loanPaidPct}%`,
    ).toBeGreaterThanOrEqual(99.9);
  });

  // ── TC-C-005 ──────────────────────────────────────────────────────────────
  test('TC-C-005 @regression – sum of Interest column ≈ Total Interest Payable', async () => {
    const rows          = await calc.getAmortizationRows();
    const sumInterest   = rows.reduce((acc, r) => acc + r.interest, 0);
    const displayedTI   = await calc.getTotalInterest();

    const { pass, message } = withinTolerance(sumInterest, displayedTI, 1000);
    expect(pass, `Interest column sum vs displayed Total Interest:\n  ${message}`).toBe(true);
  });

  // ── TC-C-006 ──────────────────────────────────────────────────────────────
  test('TC-C-006 @regression – sum of Principal column = Loan Amount', async () => {
    const rows         = await calc.getAmortizationRows();
    const sumPrincipal = rows.reduce((acc, r) => acc + r.principal, 0);
    const loanAmount   = AMORTIZATION_PARAMS.loanAmount;

    const { pass, message } = withinTolerance(sumPrincipal, loanAmount, 1000);
    expect(pass, `Principal column sum vs Loan Amount:\n  ${message}`).toBe(true);
  });

  // ── TC-C-007 ──────────────────────────────────────────────────────────────
  test('TC-C-007 @regression – per-row: Total Payment = Principal + Interest (±₹10)', async () => {
    const rows = await calc.getAmortizationRows();
    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      const expected = row.principal + row.interest;
      const { pass, message } = withinTolerance(row.totalPayment, expected, 10);

      expect(
        pass,
        `Row ${row.year}: Total Payment mismatch\n  ${message}`,
      ).toBe(true);
    }
  });

  // ── TC-C-008 ──────────────────────────────────────────────────────────────
  test('TC-C-008 @regression – outstanding balance decreases every year', async () => {
    const rows = await calc.getAmortizationRows();
    expect(rows.length).toBeGreaterThan(1);

    for (let i = 1; i < rows.length; i++) {
      expect(
        rows[i].balance,
        `Balance in ${rows[i].year} (${formatINR(rows[i].balance)}) should be < ${rows[i - 1].year} (${formatINR(rows[i - 1].balance)})`,
      ).toBeLessThan(rows[i - 1].balance + 1);   // +1 for rounding
    }
  });

  // ── TC-C-009 ──────────────────────────────────────────────────────────────
  test('TC-C-009 @regression – Loan Paid % increases monotonically', async () => {
    const rows = await calc.getAmortizationRows();
    expect(rows.length).toBeGreaterThan(1);

    for (let i = 1; i < rows.length; i++) {
      expect(
        rows[i].loanPaidPct,
        `Loan Paid% in ${rows[i].year} (${rows[i].loanPaidPct}%) should be ≥ ${rows[i - 1].year} (${rows[i - 1].loanPaidPct}%)`,
      ).toBeGreaterThanOrEqual(rows[i - 1].loanPaidPct - 0.1);
    }
  });

  // ── TC-C-010 ──────────────────────────────────────────────────────────────
  test('TC-C-010 @regression – table updates when loan amount changes', async () => {
    const rowsBefore     = await calc.getAmortizationRows();
    const balanceBefore  = rowsBefore[0]?.balance ?? 0;

    // Change loan amount
    await calc.setLoanAmount(3_000_000);

    const rowsAfter    = await calc.getAmortizationRows();
    const balanceAfter = rowsAfter[0]?.balance ?? 0;

    expect(
      balanceAfter,
      'Table balance should update after loan amount change',
    ).not.toBeCloseTo(balanceBefore, -3);   // must differ by > ₹1000
  });

  // ── TC-C-011 ──────────────────────────────────────────────────────────────
  test('TC-C-011 @smoke – pie chart is visible with non-zero dimensions', async () => {
    await expect(calc.pieChart).toBeVisible();

    const box = await calc.pieChart.boundingBox();
    expect(box, 'Pie chart bounding box should exist').not.toBeNull();
    expect(box!.width,  'Pie chart width should be > 50px').toBeGreaterThan(50);
    expect(box!.height, 'Pie chart height should be > 50px').toBeGreaterThan(50);
  });

});
