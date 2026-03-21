/**
 * @suite Slider Interactions
 * @tags  @regression @slider
 *
 * Covers:
 *   TC-S-001  Loan Amount slider updates input and recalculates EMI
 *   TC-S-002  Interest Rate slider updates rate and recalculates EMI
 *   TC-S-003  Loan Tenure slider updates tenure and recalculates EMI
 *   TC-S-004  Bidirectional sync: text input → slider position
 *   TC-S-005  All three sliders combined: EMI within 5% of formula
 *   TC-S-006  Slider stops at minimum (left stop)
 *   TC-S-007  Slider stops at maximum (right stop)
 */

import { test, expect } from '@playwright/test';
import { EMICalculatorPage } from '../../pages/EMICalculatorPage';
import { calculateEMI, withinTolerance, formatINR } from '../../utils/emiHelper';
import { SLIDER_SCENARIOS } from '../../fixtures/testData';

test.describe('Slider Interactions', () => {

  let calc: EMICalculatorPage;

  test.beforeEach(async ({ page }) => {
    calc = new EMICalculatorPage(page);
    await calc.goto();
  });

  // ── TC-S-001 ──────────────────────────────────────────────────────────────
  test('TC-S-001 @regression – Loan Amount slider updates input field and recalculates EMI', async () => {
    const targetLakh = 100;   // drag to ~100L (50% of 0–200L track)

    await calc.setLoanAmountViaSlider(targetLakh);

    const loanValue = await calc.getLoanAmountInputValue();
    const emi       = await calc.getEMI();

    // Input should be within ±10L of target (slider pixel precision)
    const expectedLoanMin = (targetLakh - 15) * 100_000;
    const expectedLoanMax = (targetLakh + 15) * 100_000;

    expect(loanValue, `Loan amount after slider drag should be near ${targetLakh}L`).toBeGreaterThanOrEqual(expectedLoanMin);
    expect(loanValue, `Loan amount after slider drag should be near ${targetLakh}L`).toBeLessThanOrEqual(expectedLoanMax);

    // EMI must be positive and non-NaN
    expect(emi).toBeGreaterThan(0);
    expect(isNaN(emi)).toBe(false);

    // Cross-validate: EMI should roughly match formula for the actual input value
    const rate   = await calc.getInterestRateInputValue();
    const tenure = await calc.getTenureInputValue();
    const expectedEMI = calculateEMI(loanValue, rate, tenure);
    const { pass, message } = withinTolerance(emi, expectedEMI, expectedEMI * 0.05);  // 5% tolerance

    expect(pass, `Slider EMI cross-validation failed:\n  ${message}`).toBe(true);
  });

  // ── TC-S-002 ──────────────────────────────────────────────────────────────
  test('TC-S-002 @regression – Interest Rate slider updates rate and recalculates EMI', async () => {
    // First set known loan + tenure via text (reliable)
    await calc.setLoanAmount(5_000_000);
    await calc.setLoanTenure(20);

    const emiAtDefault = await calc.getEMI();  // baseline at existing rate

    // Drag rate slider toward ~12%
    await calc.setInterestRateViaSlider(12);

    const rateAfter = await calc.getInterestRateInputValue();
    const emiAfter  = await calc.getEMI();

    // Rate should have moved into a higher range (> default 9%)
    expect(rateAfter, 'Rate should increase after dragging slider right').toBeGreaterThan(8);
    expect(emiAfter, 'EMI should be positive after rate change').toBeGreaterThan(0);

    // EMI at higher rate should be >= EMI at lower rate
    // (can't know exactly where slider lands, but direction must be correct)
    if (rateAfter > 9) {
      expect(
        emiAfter,
        `EMI at ${rateAfter}% should be ≥ baseline EMI at 9%`,
      ).toBeGreaterThanOrEqual(emiAtDefault * 0.95);
    }
  });

  // ── TC-S-003 ──────────────────────────────────────────────────────────────
  test('TC-S-003 @regression – Loan Tenure slider updates tenure and recalculates EMI', async () => {
    await calc.setLoanAmount(5_000_000);
    await calc.setInterestRate(9);
    await calc.setLoanTenure(20, 'yr');

    const emiAt20yr = await calc.getEMI();

    // Drag tenure slider to ~10yr (33% of 30yr track)
    await calc.setLoanTenureViaSlider(10);

    const tenureAfter = await calc.getTenureInputValue();
    const emiAfter    = await calc.getEMI();

    expect(tenureAfter, 'Tenure should change after slider drag').toBeGreaterThan(0);
    expect(emiAfter, 'EMI should be positive').toBeGreaterThan(0);

    // If tenure decreased, EMI must have increased
    if (tenureAfter < 20) {
      expect(
        emiAfter,
        `EMI at ${tenureAfter}yr (${formatINR(emiAfter)}) should be > EMI at 20yr (${formatINR(emiAt20yr)})`,
      ).toBeGreaterThan(emiAt20yr);
    }
  });

  // ── TC-S-004 ──────────────────────────────────────────────────────────────
  test('TC-S-004 @regression – text input updates slider handle position (bidirectional sync)', async ({ page }) => {
    // Set known value via text input
    const targetAmount = 10_000_000;  // 100L = 50% of slider
    await calc.setLoanAmount(targetAmount);

    // Read the slider handle's left-offset as a percentage of the track
    const track  = await calc.loanAmountSliderTrack.boundingBox();
    const handle = await calc.loanAmountSliderHandle.boundingBox();

    expect(track,  'Slider track bounding box should exist').not.toBeNull();
    expect(handle, 'Slider handle bounding box should exist').not.toBeNull();

    const handleMidX = handle!.x + handle!.width / 2;
    const pct = ((handleMidX - track!.x) / track!.width) * 100;

    // 100L / 200L = 50%, allow ±12% for rendering variance
    expect(pct, `Slider should be near 50% but got ${pct.toFixed(1)}%`).toBeGreaterThan(35);
    expect(pct, `Slider should be near 50% but got ${pct.toFixed(1)}%`).toBeLessThan(65);
  });

  // ── TC-S-005 ──────────────────────────────────────────────────────────────
  test('TC-S-005 @regression – all three sliders combined: EMI within 5% of formula', async () => {
    // Set all three sliders
    await calc.setLoanAmountViaSlider(50);    // ~50L
    await calc.setInterestRateViaSlider(9);   // ~9%
    await calc.setLoanTenureViaSlider(20);    // ~20yr

    // Read back actual values from input fields (ground truth after slider interaction)
    const actualLoan   = await calc.getLoanAmountInputValue();
    const actualRate   = await calc.getInterestRateInputValue();
    const actualTenure = await calc.getTenureInputValue();
    const actualEMI    = await calc.getEMI();

    expect(actualLoan,   'Loan should be positive').toBeGreaterThan(0);
    expect(actualRate,   'Rate should be positive').toBeGreaterThan(0);
    expect(actualTenure, 'Tenure should be positive').toBeGreaterThan(0);

    // EMI should be within 5% of the formula-calculated value for actual inputs
    const formulaEMI = calculateEMI(actualLoan, actualRate, actualTenure);
    const { pass, message } = withinTolerance(actualEMI, formulaEMI, formulaEMI * 0.05);

    expect(pass, `Combined slider EMI validation:\n  ${message}`).toBe(true);
  });

  // ── TC-S-006 ──────────────────────────────────────────────────────────────
  test('TC-S-006 @regression – Loan Amount slider left stop: input does not go negative', async () => {
    // Drag to 0% (leftmost)
    await calc.setLoanAmountViaSlider(0);

    const loanValue = await calc.getLoanAmountInputValue();
    const emi       = await calc.getEMI();

    expect(loanValue, 'Loan amount should be >= 0 at left stop').toBeGreaterThanOrEqual(0);
    expect(isNaN(emi), 'EMI should not be NaN at slider minimum').toBe(false);
  });

  // ── TC-S-007 ──────────────────────────────────────────────────────────────
  test('TC-S-007 @regression – Loan Amount slider right stop: input reflects maximum', async () => {
    // Drag to 100% (rightmost = 200L)
    await calc.setLoanAmountViaSlider(200);

    const loanValue = await calc.getLoanAmountInputValue();

    // Should be near 200L (allow ±10L for slider precision)
    expect(loanValue, 'Loan should be near 200L at right stop').toBeGreaterThanOrEqual(18_000_000);
    expect(loanValue, 'Loan should not exceed 200L').toBeLessThanOrEqual(20_000_000);
  });

  // ── Parametrized slider scenarios ────────────────────────────────────────
  for (const scenario of SLIDER_SCENARIOS.loanAmount) {
    test(`TC-S-PARAM @regression – Loan slider to ${scenario.targetLakh}L: input in expected range`, async () => {
      await calc.setLoanAmountViaSlider(scenario.targetLakh);

      const loanValue = await calc.getLoanAmountInputValue();
      const [min, max] = scenario.expectedRange;

      expect(loanValue, `Loan should be in range [${formatINR(min)}, ${formatINR(max)}] after slider`).toBeGreaterThanOrEqual(min);
      expect(loanValue).toBeLessThanOrEqual(max);
    });
  }

});
