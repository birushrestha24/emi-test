import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // ── Test discovery ──────────────────────────────────────────────────────
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  // ── Execution ───────────────────────────────────────────────────────────
  fullyParallel: true,
  workers: process.env.CI ? 2 : '50%',
  retries: process.env.CI ? 2 : 0,
  forbidOnly: !!process.env.CI,

  // ── Timeouts ────────────────────────────────────────────────────────────
  timeout: 60_000,           // per-test timeout
  expect: { timeout: 10_000 },

  // ── Reporters ───────────────────────────────────────────────────────────
  reporter: [
    ['list'],
    ['html',  { outputFolder: 'playwright-report', open: 'never' }],
    ['json',  { outputFile: 'test-results/results.json' }],
  ],

  // ── Shared browser context ───────────────────────────────────────────────
  use: {
    baseURL:            'https://emicalculator.net/',
    headless:           true,
    viewport:           { width: 1280, height: 720 },
    screenshot:         'only-on-failure',
    video:              'on-first-retry',
    trace:              'on-first-retry',
    actionTimeout:      10_000,
    navigationTimeout:  30_000,
  },

  // ── Browser projects ────────────────────────────────────────────────────
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],

  // ── Output dirs ─────────────────────────────────────────────────────────
  outputDir: 'test-results/',
});
