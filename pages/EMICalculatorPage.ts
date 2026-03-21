import { Page, Locator, expect } from '@playwright/test';
import { parseIndianNumber, calculateEMI, withinTolerance, formatINR } from '../utils/emiHelper';
import type { AmortizationRow, TenureUnit } from '../types';

/**
 * Page Object Model for https://emicalculator.net/
 *
 * Encapsulates all locators and interactions so test files stay
 * clean and maintainable. Update locators here; tests never
 * touch raw selectors.
 */
export class EMICalculatorPage {
  readonly page: Page;

  // ── Tab navigation ────────────────────────────────────────────────────────
  readonly homeLoanTab:    Locator;
  readonly personalLoanTab: Locator;
  readonly carLoanTab:     Locator;

  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly loanAmountInput:  Locator;
  readonly interestRateInput: Locator;
  readonly loanTenureInput:  Locator;

  // ── Tenure unit toggle ───────────────────────────────────────────────────
  readonly tenureYrBtn: Locator;
  readonly tenureMoBtn: Locator;

  // ── Sliders (jQuery UI) – handle element inside the track ────────────────
  readonly loanAmountSliderTrack:   Locator;
  readonly interestRateSliderTrack: Locator;
  readonly loanTenureSliderTrack:   Locator;

  readonly loanAmountSliderHandle:   Locator;
  readonly interestRateSliderHandle: Locator;
  readonly loanTenureSliderHandle:   Locator;

  // ── Results panel ────────────────────────────────────────────────────────
  readonly emiAmount:           Locator;
  readonly totalInterestAmount: Locator;
  readonly totalPaymentAmount:  Locator;

  // ── Charts ────────────────────────────────────────────────────────────────
  readonly pieChart: Locator;

  // ── Amortization table ───────────────────────────────────────────────────
  readonly paymentScheduleTable: Locator;
  readonly paymentScheduleRows:  Locator;

  // ── Download / Share ─────────────────────────────────────────────────────
  readonly downloadExcelBtn: Locator;
  readonly downloadPdfBtn:   Locator;

  constructor(page: Page) {
    this.page = page;

    // Tabs
    this.homeLoanTab     = page.locator('li a:has-text("Home Loan")').first();
    this.personalLoanTab = page.locator('li a:has-text("Personal Loan")').first();
    this.carLoanTab      = page.locator('li a:has-text("Car Loan")').first();

    // Inputs – actual IDs from the live page
    this.loanAmountInput   = page.locator('#loanamount');
    this.interestRateInput = page.locator('#loaninterest');
    this.loanTenureInput   = page.locator('#loanterm');

    // Tenure toggles
    this.tenureYrBtn = page.locator('#year');
    this.tenureMoBtn = page.locator('#month');

    // Sliders – jQuery UI renders: div#loanamount-slider > span.ui-slider-handle
    this.loanAmountSliderTrack   = page.locator('#loanamount-slider');
    this.interestRateSliderTrack = page.locator('#loaninterest-slider');
    this.loanTenureSliderTrack   = page.locator('#loanterm-slider');

    this.loanAmountSliderHandle   = page.locator('#loanamount-slider .ui-slider-handle');
    this.interestRateSliderHandle = page.locator('#loaninterest-slider .ui-slider-handle');
    this.loanTenureSliderHandle   = page.locator('#loanterm-slider .ui-slider-handle');

    // Results
    this.emiAmount           = page.locator('#emiamount');
    this.totalInterestAmount = page.locator('#totalinterest');
    this.totalPaymentAmount  = page.locator('#totalpayment');

    // Charts
    this.pieChart = page.locator('#piechart, canvas').first();

    // Payment schedule
    this.paymentScheduleTable = page.locator('#paymenttable, table').first();
    this.paymentScheduleRows  = page.locator('#paymenttable tbody tr, table tbody tr');

    // Downloads
    this.downloadExcelBtn = page.locator('a[title*="Excel"], a:has-text("Download Excel")').first();
    this.downloadPdfBtn   = page.locator('a[title*="PDF"],  a:has-text("Download PDF")').first();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ══════════════════════════════════════════════════════════════════════════

  /** Navigate to the calculator and wait for the page to be fully ready. */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for jQuery UI sliders to initialise
    await this.loanAmountSliderTrack.waitFor({ state: 'visible' });
    await this.loanAmountInput.waitFor({ state: 'visible' });
  }

  /** Switch to a specific loan tab. */
  async selectTab(tab: 'home' | 'personal' | 'car'): Promise<void> {
    const map = {
      home:     this.homeLoanTab,
      personal: this.personalLoanTab,
      car:      this.carLoanTab,
    };
    await map[tab].click();
    await this.page.waitForTimeout(400);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INPUT SETTERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Set loan amount via the text input.
   * Triple-click to select all → fill → Tab to trigger recalculation.
   */
  async setLoanAmount(amount: number): Promise<void> {
    await this.loanAmountInput.click({ clickCount: 3 });
    await this.loanAmountInput.fill(String(amount));
    await this.loanAmountInput.press('Tab');
    await this._waitForRecalc();
  }

  /** Set interest rate via the text input. */
  async setInterestRate(rate: number): Promise<void> {
    await this.interestRateInput.click({ clickCount: 3 });
    await this.interestRateInput.fill(String(rate));
    await this.interestRateInput.press('Tab');
    await this._waitForRecalc();
  }

  /** Set loan tenure via the text input. Optionally switch Yr/Mo unit first. */
  async setLoanTenure(tenure: number, unit: TenureUnit = 'yr'): Promise<void> {
    if (unit === 'yr') {
      await this.tenureYrBtn.click().catch(() => {/* already selected */});
    } else {
      await this.tenureMoBtn.click();
    }
    await this.loanTenureInput.click({ clickCount: 3 });
    await this.loanTenureInput.fill(String(tenure));
    await this.loanTenureInput.press('Tab');
    await this._waitForRecalc();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDER INTERACTIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Drag a slider handle to a given percentage (0–100) of the track width.
   *
   * Strategy: bounding-box pixel math + smooth mousemove with 25 steps.
   * This approach is more reliable than keyboard arrow keys for jQuery UI
   * sliders because it doesn't depend on step size or focus state.
   */
  private async _dragSliderToPercent(
    trackLocator:  Locator,
    handleLocator: Locator,
    percent: number,
  ): Promise<void> {
    const clampedPct = Math.max(0, Math.min(100, percent));

    const track  = await trackLocator.boundingBox();
    const handle = await handleLocator.boundingBox();
    if (!track || !handle)
      throw new Error(`Slider bounding box not found for percent=${percent}`);

    const targetX    = track.x + (track.width * clampedPct) / 100;
    const handleMidY = handle.y + handle.height / 2;
    const handleMidX = handle.x + handle.width / 2;

    await this.page.mouse.move(handleMidX, handleMidY);
    await this.page.mouse.down();
    await this.page.mouse.move(targetX, handleMidY, { steps: 25 });
    await this.page.mouse.up();
    await this._waitForRecalc();
  }

  /**
   * Set Loan Amount via slider.
   * Range: 0 – 200 Lakh → percent = (lakh / 200) × 100
   */
  async setLoanAmountViaSlider(targetLakh: number): Promise<void> {
    const pct = (targetLakh / 200) * 100;
    await this._dragSliderToPercent(
      this.loanAmountSliderTrack,
      this.loanAmountSliderHandle,
      pct,
    );
  }

  /**
   * Set Interest Rate via slider.
   * Range: 5% – 20% → percent = ((rate - 5) / 15) × 100
   */
  async setInterestRateViaSlider(rate: number): Promise<void> {
    const pct = ((rate - 5) / 15) * 100;
    await this._dragSliderToPercent(
      this.interestRateSliderTrack,
      this.interestRateSliderHandle,
      pct,
    );
  }

  /**
   * Set Loan Tenure via slider.
   * Range: 0 – 30 years → percent = (years / 30) × 100
   */
  async setLoanTenureViaSlider(years: number): Promise<void> {
    const pct = (years / 30) * 100;
    await this._dragSliderToPercent(
      this.loanTenureSliderTrack,
      this.loanTenureSliderHandle,
      pct,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESULT READERS
  // ══════════════════════════════════════════════════════════════════════════

  async getEMI(): Promise<number> {
    const text = await this.emiAmount.innerText();
    return parseIndianNumber(text);
  }

  async getTotalInterest(): Promise<number> {
    const text = await this.totalInterestAmount.innerText();
    return parseIndianNumber(text);
  }

  async getTotalPayment(): Promise<number> {
    const text = await this.totalPaymentAmount.innerText();
    return parseIndianNumber(text);
  }

  /** Read the current value from the loan amount input field. */
  async getLoanAmountInputValue(): Promise<number> {
    const raw = await this.loanAmountInput.inputValue();
    return parseIndianNumber(raw);
  }

  /** Read the current value from the interest rate input field. */
  async getInterestRateInputValue(): Promise<number> {
    const raw = await this.interestRateInput.inputValue();
    return parseFloat(raw) || 0;
  }

  /** Read the current value from the loan tenure input field. */
  async getTenureInputValue(): Promise<number> {
    const raw = await this.loanTenureInput.inputValue();
    return parseFloat(raw) || 0;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AMORTIZATION TABLE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Scroll to and parse the year-wise amortization table.
   * Returns only year-level rows (skips month sub-rows).
   */
  async getAmortizationRows(): Promise<AmortizationRow[]> {
    await this.paymentScheduleTable.scrollIntoViewIfNeeded();
    await this.paymentScheduleTable.waitFor({ state: 'visible' });

    const allRows = await this.paymentScheduleRows.all();
    const data: AmortizationRow[] = [];

    for (const row of allRows) {
      const cells = await row.locator('td').allInnerTexts();
      if (cells.length < 6) continue;

      // Year-level rows: first cell looks like "2026" or "⊞ 2026"
      const rawYear = cells[0].replace(/[^\d]/g, '').trim();
      if (rawYear.length !== 4) continue;

      data.push({
        year:         rawYear,
        principal:    parseIndianNumber(cells[1]),
        interest:     parseIndianNumber(cells[2]),
        totalPayment: parseIndianNumber(cells[3]),
        balance:      parseIndianNumber(cells[4]),
        loanPaidPct:  parseFloat(cells[5].replace('%', '').trim()),
      });
    }

    return data;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ASSERTIONS (reusable, self-documenting)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Assert displayed EMI matches the formula result within tolerance.
   * Logs both values so failures are self-explanatory.
   */
  async assertEMIMatchesFormula(
    principal: number,
    annualRate: number,
    tenureYears: number,
    toleranceINR = 2,
  ): Promise<void> {
    const expectedEMI = calculateEMI(principal, annualRate, tenureYears);
    const actualEMI   = await this.getEMI();
    const { pass, message } = withinTolerance(actualEMI, expectedEMI, toleranceINR);

    expect(
      pass,
      `EMI formula mismatch:\n  ${message}\n  Inputs: P=${formatINR(principal)}, r=${annualRate}%, n=${tenureYears}yr`,
    ).toBe(true);
  }

  /**
   * Assert Total Payment = Principal + Total Interest.
   */
  async assertTotalPaymentIntegrity(principal: number, toleranceINR = 500): Promise<void> {
    const totalInterest = await this.getTotalInterest();
    const totalPayment  = await this.getTotalPayment();
    const expected      = principal + totalInterest;
    const { pass, message } = withinTolerance(totalPayment, expected, toleranceINR);

    expect(
      pass,
      `Total Payment integrity failed:\n  ${message}`,
    ).toBe(true);
  }

  /**
   * Assert the loan amount input field shows the expected value.
   */
  async assertLoanAmountInput(expectedAmount: number, toleranceINR = 500_000): Promise<void> {
    const actual = await this.getLoanAmountInputValue();
    const { pass, message } = withinTolerance(actual, expectedAmount, toleranceINR);
    expect(pass, `Loan amount input mismatch:\n  ${message}`).toBe(true);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /** Short wait for the calculator's JS to finish re-rendering results. */
  private async _waitForRecalc(): Promise<void> {
    await this.page.waitForTimeout(600);
  }
}
