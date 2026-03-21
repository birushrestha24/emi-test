/**
 * Shared domain types for EMI Calculator test suite.
 */

// ── Loan input parameters ────────────────────────────────────────────────────
export interface LoanParams {
  /** Principal amount in INR (e.g. 5_000_000 = ₹50 Lakh) */
  loanAmount: number;
  /** Annual interest rate as a number (e.g. 9 for 9%) */
  interestRate: number;
  /** Tenure in years */
  tenureYears: number;
}

// ── Expected calculation results ─────────────────────────────────────────────
export interface LoanResults {
  emi:            number;
  totalInterest:  number;
  totalPayment:   number;
}

// ── One row from the amortization table ──────────────────────────────────────
export interface AmortizationRow {
  year:         string;
  principal:    number;
  interest:     number;
  totalPayment: number;
  balance:      number;
  loanPaidPct:  number;
}

// ── Tenure unit ───────────────────────────────────────────────────────────────
export type TenureUnit = 'yr' | 'mo';

// ── Slider target ─────────────────────────────────────────────────────────────
export type SliderField = 'loanAmount' | 'interestRate' | 'tenure';

// ── Named test-data scenario ──────────────────────────────────────────────────
export interface TestScenario extends LoanParams {
  description:      string;
  expectedEMI:      number;
  toleranceINR?:    number;   // default 2
}
