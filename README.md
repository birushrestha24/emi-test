# EMI Calculator – Playwright Automation Suite

> **Application Under Test:** [https://emicalculator.net/](https://emicalculator.net/)
> **Framework:** Playwright · TypeScript · Page Object Model
---

## 📁 Project Structure

```
emi-playwright/
│
├── pages/
│   └── EMICalculatorPage.ts        # Page Object Model – all locators & interactions
│
├── tests/
│   ├── functional/
│   │   └── emi-calculation.spec.ts # TC-F-001–010 + parametrized formula tests
│   ├── slider/
│   │   └── slider-interactions.spec.ts  # TC-S-001–007 + parametrized slider tests
│   ├── amortization/
│   │   └── amortization-table.spec.ts   # TC-C-001–011 table + chart validation
│   ├── download/
│   │   └── excel-download.spec.ts       # TC-X-001–005 Excel download checks
│   └── negative/
│       └── input-validation.spec.ts     # TC-N-001–006 invalid input handling
│
├── fixtures/
│   └── testData.ts                 # All test data – inputs, scenarios, expected values
│
├── utils/
│   └── emiHelper.ts                # Pure utilities: EMI formula, number parsing, assertions
│
├── types/
│   └── index.ts                    # Shared TypeScript interfaces & types
│
├── playwright.config.ts            # Multi-browser config with retries, reporters
├── tsconfig.json
├── package.json
└── .github/
    └── workflows/
        └── playwright.yml          # CI: typecheck → smoke → regression matrix
```

---

## 🧮 EMI Formula

```
EMI = P × r × (1 + r)^n
          ─────────────
           (1 + r)^n − 1

  P = Principal (₹)
  r = Annual rate / 12 / 100  (monthly rate)
  n = Tenure (years) × 12     (total months)
```

Implemented in `utils/emiHelper.ts → calculateEMI()`.
Used in all `TC-F-*` tests with **±₹2 tolerance** for display rounding.

---

## 🚀 Quick Start

### Prerequisites
```bash
node --version   # 20.x LTS required
npm --version    # 10.x+
```

### Install
```bash
npm install
npx playwright install --with-deps
```

### Run all tests (all browsers)
```bash
npm test
```

### Run by tag
```bash
npm run test:smoke        # @smoke only  (fast gate, ~2 min)
npm run test:regression   # @regression  (full suite, ~10 min)
```

### Run by suite folder
```bash
npm run test:functional    # EMI formula & results panel
npm run test:slider        # Slider drag interactions
npm run test:amortization  # Year-wise table & chart
npm run test:download      # Excel file download
npm run test:negative      # Invalid input handling
```

### Run a specific browser
```bash
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

### Headed mode (watch tests run)
```bash
npm run test:headed
```

### Open HTML report
```bash
npm run report
```

---

## 🏗️ Architecture Decisions

### Page Object Model (POM)
All DOM selectors live **only** in `pages/EMICalculatorPage.ts`.
Tests call methods like `calc.setLoanAmount(5_000_000)` and never touch raw locators.
When the site changes a selector, you fix **one file**.

```
Test file  →  EMICalculatorPage  →  Playwright  →  Browser
  (what)          (how)               (engine)
```

### Slider Strategy
jQuery UI sliders do not use native `<input type="range">`.
Our approach uses **bounding-box pixel math**:
1. Get `track.boundingBox()` to know the pixel range
2. Compute `targetX = track.x + (track.width × pct / 100)`
3. `mousedown → mousemove(25 steps) → mouseup`

This is more reliable than keyboard arrow keys (which depend on
focus state and step size).

### Pure Utilities (no Playwright dependency)
`utils/emiHelper.ts` contains `calculateEMI`, `parseIndianNumber`,
`withinTolerance`, `formatINR` — all pure functions with zero
Playwright imports. They can be unit-tested independently.

### Centralised Test Data
`fixtures/testData.ts` owns every input value, expected result,
and tolerance. Tests read from fixtures; no magic numbers in spec files.

### Assertion Tolerances
| Scenario | Tolerance |
|---|---|
| EMI formula vs display | ±₹2 |
| Totals (Interest, Payment) | ±₹1,000 |
| Per-row table math | ±₹10 |
| Slider cross-validation | ±5% of formula EMI |

---

## 🔄 Test Tags

| Tag | Scope | Trigger |
|---|---|---|
| `@smoke` | 6 critical tests | Every commit |
| `@regression` | All 35+ tests | Every PR |
| `@functional` | EMI calc suite | On-demand |
| `@slider` | Slider suite | On-demand |
| `@amortization` | Table/chart suite | On-demand |
| `@download` | Excel download | On-demand |
| `@negative` | Input validation | On-demand |

---

## 🤖 CI/CD Pipeline

```
push / PR
    │
    ▼
TypeScript typecheck  (fail fast if types are wrong)
    │
    ▼
Smoke – Chromium      (6 tests, < 2 min)
    │
    ▼
Regression matrix     (parallel: Chromium | Firefox | WebKit)
    │
    ▼
Summary report artifact uploaded per browser
```

Configured in `.github/workflows/playwright.yml`.
Artifacts retained **30 days** (reports) / **14 days** (failure screenshots & traces).

---

## 📊 Test Coverage

| Suite | Test Cases | Tags |
|---|---|---|
| Functional – EMI Calculation | 10 + parametrized | @smoke @regression |
| Slider Interactions | 7 + parametrized | @regression |
| Amortization Table & Chart | 11 | @smoke @regression |
| Excel Download | 5 | @regression |
| Negative / Input Validation | 6 | @smoke @regression |
| **Total** | **~40** | |
