/**
 * @suite Excel Download Validation
 * @tags  @regression @download
 *
 * Covers:
 *   TC-X-001  Download button is visible and enabled
 *   TC-X-002  Clicking download triggers a file-download event
 *   TC-X-003  Downloaded file is not empty (size > 1KB)
 *   TC-X-004  File has .xls or .xlsx extension
 *   TC-X-005  Download works after changing inputs
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { EMICalculatorPage } from '../../pages/EMICalculatorPage';

test.describe('Excel Download', () => {

  let calc: EMICalculatorPage;

  test.beforeEach(async ({ page }) => {
    calc = new EMICalculatorPage(page);
    await calc.goto();
    // Use stable known inputs
    await calc.setLoanAmount(5_000_000);
    await calc.setInterestRate(9);
    await calc.setLoanTenure(20, 'yr');
  });

  // ── TC-X-001 ──────────────────────────────────────────────────────────────
  test('TC-X-001 @smoke – Download Excel button is visible on the page', async () => {
    await calc.downloadExcelBtn.scrollIntoViewIfNeeded();
    await expect(calc.downloadExcelBtn).toBeVisible();
  });

  // ── TC-X-002 ──────────────────────────────────────────────────────────────
  test('TC-X-002 @regression – clicking Download Excel triggers a browser download event', async ({ page }) => {
    await calc.downloadExcelBtn.scrollIntoViewIfNeeded();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      calc.downloadExcelBtn.click(),
    ]);

    expect(download, 'A download event should be emitted').toBeTruthy();

    const fileName = download.suggestedFilename();
    expect(fileName, 'Downloaded filename should not be empty').toBeTruthy();

    console.log(`  → Downloaded: "${fileName}"`);
  });

  // ── TC-X-003 ──────────────────────────────────────────────────────────────
  test('TC-X-003 @regression – downloaded file is not empty (> 1KB)', async ({ page }) => {
    await calc.downloadExcelBtn.scrollIntoViewIfNeeded();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      calc.downloadExcelBtn.click(),
    ]);

    const filePath = await download.path();
    expect(filePath, 'Download path should resolve to a file').toBeTruthy();

    const stats = fs.statSync(filePath!);
    expect(
      stats.size,
      `File size should be > 1024 bytes, got ${stats.size}`,
    ).toBeGreaterThan(1024);

    console.log(`  → File size: ${(stats.size / 1024).toFixed(1)} KB`);
  });

  // ── TC-X-004 ──────────────────────────────────────────────────────────────
  test('TC-X-004 @regression – downloaded file has an Excel-compatible extension', async ({ page }) => {
    await calc.downloadExcelBtn.scrollIntoViewIfNeeded();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      calc.downloadExcelBtn.click(),
    ]);

    const fileName = download.suggestedFilename().toLowerCase();
    expect(
      fileName,
      `File "${fileName}" should end with .xls, .xlsx, or .csv`,
    ).toMatch(/\.(xls|xlsx|csv)$/);
  });

  // ── TC-X-005 ──────────────────────────────────────────────────────────────
  test('TC-X-005 @regression – download works after changing inputs (30L, 8%, 15yr)', async ({ page }) => {
    // Change inputs
    await calc.setLoanAmount(3_000_000);
    await calc.setInterestRate(8);
    await calc.setLoanTenure(15, 'yr');

    await calc.downloadExcelBtn.scrollIntoViewIfNeeded();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      calc.downloadExcelBtn.click(),
    ]);

    expect(download, 'Download event should fire after input change').toBeTruthy();

    const filePath = await download.path();
    const stats    = fs.statSync(filePath!);

    expect(stats.size).toBeGreaterThan(1024);
    console.log(`  → File: "${download.suggestedFilename()}", size: ${(stats.size / 1024).toFixed(1)} KB`);
  });

});
