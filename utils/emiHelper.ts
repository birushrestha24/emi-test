/**
 * Pure utility functions – no Playwright dependencies.
 * Can be unit-tested independently.
 */

import type { LoanParams } from '../types';

/**
 * EMI Formula: E = P × r × (1+r)^n / ((1+r)^n − 1)
 *
 * @param principal    Loan amount in INR
 * @param annualRate   Annual interest rate as percentage (e.g. 9 for 9%)
 * @param tenureYears  Loan tenure in years
 * @returns            Rounded EMI in INR
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureYears: number,
): number {
  const r = annualRate / 12 / 100;    // monthly rate
  const n = tenureYears * 12;         // total months

  if (r === 0) return Math.round(principal / n);

  const factor = Math.pow(1 + r, n);
  return Math.round((principal * r * factor) / (factor - 1));
}

/**
 * Derived values from the EMI.
 */
export function calculateLoanSummary(params: LoanParams): {
  emi:           number;
  totalPayment:  number;
  totalInterest: number;
} {
  const emi          = calculateEMI(params.loanAmount, params.interestRate, params.tenureYears);
  const n            = params.tenureYears * 12;
  const totalPayment = emi * n;
  const totalInterest = totalPayment - params.loanAmount;
  return { emi, totalPayment, totalInterest };
}

/**
 * Parse Indian-format number strings.
 * Examples:
 *   "₹44,986"         → 44986
 *   "₹1,07,96,711"    → 10796711
 *   "24,959"          → 24959
 *   "53.7%"           → 53.7  (strip %)
 */
export function parseIndianNumber(raw: string): number {
  const cleaned = raw
    .replace(/[₹%,\s\u00a0]/g, '')   // strip ₹ % commas non-breaking spaces
    .trim();
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

/**
 * Assert two numbers are within ±tolerance.
 * Returns the absolute difference (useful for logging).
 */
export function withinTolerance(
  actual: number,
  expected: number,
  tolerance: number,
): { pass: boolean; diff: number; message: string } {
  const diff = Math.abs(actual - expected);
  const pass = diff <= tolerance;
  const message = pass
    ? `✓ |${actual} − ${expected}| = ${diff} ≤ ${tolerance}`
    : `✗ |${actual} − ${expected}| = ${diff} > ${tolerance}`;
  return { pass, diff, message };
}

/**
 * Format a number as an Indian Rupee string for logging.
 */
export function formatINR(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}
