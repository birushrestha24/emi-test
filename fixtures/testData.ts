/**
 * Centralised test data for all EMI Calculator test suites.
 * Import specific exports rather than the whole file.
 */

import type { TestScenario, LoanParams } from '../types';

// ── Default state (what the page loads with) ─────────────────────────────────
export const DEFAULT_INPUTS: LoanParams = {
  loanAmount:   2_500_000,   // ₹25 Lakh  (page default as seen live)
  interestRate: 9,
  tenureYears:  20,
};

// ── Formula validation scenarios ──────────────────────────────────────────────
export const FORMULA_SCENARIOS: TestScenario[] = [
  {
    description:  'Standard: 50L @ 9% for 20yr',
    loanAmount:   5_000_000,
    interestRate: 9,
    tenureYears:  20,
    expectedEMI:  44_986,
    toleranceINR: 2,
  },
  {
    description:  'Low partition: 5L @ 8% for 5yr',
    loanAmount:   500_000,
    interestRate: 8,
    tenureYears:  5,
    expectedEMI:  10_138,
    toleranceINR: 2,
  },
  {
    description:  'High partition: 150L @ 10% for 25yr',
    loanAmount:   15_000_000,
    interestRate: 10,
    tenureYears:  25,
    expectedEMI:  136_168,
    toleranceINR: 5,
  },
  {
    description:  'Minimum rate: 20L @ 5% for 15yr',
    loanAmount:   2_000_000,
    interestRate: 5,
    tenureYears:  15,
    expectedEMI:  15_811,
    toleranceINR: 2,
  },
  {
    description:  'Maximum rate: 20L @ 20% for 10yr',
    loanAmount:   2_000_000,
    interestRate: 20,
    tenureYears:  10,
    expectedEMI:  38_702,
    toleranceINR: 5,
  },
];

// ── Slider test scenarios ─────────────────────────────────────────────────────
export const SLIDER_SCENARIOS = {
  loanAmount: [
    { targetLakh: 50,  expectedRange: [4_500_000,  5_500_000]  },
    { targetLakh: 100, expectedRange: [9_000_000,  11_000_000] },
    { targetLakh: 150, expectedRange: [13_500_000, 16_500_000] },
  ],
  interestRate: [
    { targetRate: 8,  rateRange: [7,   10]  },
    { targetRate: 12, rateRange: [10,  14]  },
    { targetRate: 17, rateRange: [15,  19]  },
  ],
  tenure: [
    { targetYears: 10, tenureRange: [8,  12] },
    { targetYears: 20, tenureRange: [17, 23] },
  ],
};

// ── Boundary value inputs ─────────────────────────────────────────────────────
export const BOUNDARY_SCENARIOS: TestScenario[] = [
  {
    description:  'Min rate, max tenure: 50L @ 5% for 30yr',
    loanAmount:   5_000_000,
    interestRate: 5,
    tenureYears:  30,
    expectedEMI:  26_840,
    toleranceINR: 5,
  },
  {
    description:  'Max rate, min tenure: 5L @ 20% for 1yr',
    loanAmount:   500_000,
    interestRate: 20,
    tenureYears:  1,
    expectedEMI:  46_383,
    toleranceINR: 5,
  },
];

// ── Monotone relationship test data ───────────────────────────────────────────
export const MONOTONE_RATE_TEST = {
  loanAmount:  5_000_000,
  tenureYears: 20,
  rates: [7, 9, 12, 15],           // EMI must increase with each step
};

export const MONOTONE_TENURE_TEST = {
  loanAmount:   5_000_000,
  interestRate: 9,
  tenures: [30, 20, 10, 5],        // EMI must increase as tenure decreases
};

// ── Tenure equivalence test ────────────────────────────────────────────────────
export const TENURE_EQUIVALENCE = {
  loanAmount:   5_000_000,
  interestRate: 9,
  years:        20,
  months:       240,               // must produce same EMI
};

// ── Amortization table validation (50L, 9%, 20yr) ────────────────────────────
export const AMORTIZATION_PARAMS: LoanParams = {
  loanAmount:   5_000_000,
  interestRate: 9,
  tenureYears:  20,
};

// ── Negative / invalid inputs ─────────────────────────────────────────────────
export const NEGATIVE_INPUTS = {
  nonNumeric:    ['abc', '###', '@@@', '   '],
  negativeValues: [-1, -100000, -5000000],
  zero:          0,
};
