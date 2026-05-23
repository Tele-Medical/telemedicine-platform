import { test, expect } from '@playwright/test';

test.describe('Nabha Telemedicine Platform - Phase 4 E2E Workflows', () => {
  
  test('1. ASHA Worker Onboarding, Offline Mode, & Reconnect Sync Journey', async ({ page, context }) => {
    // Navigate to local PWA
    await page.goto('/');

    // Validate app title is loaded
    await expect(page.locator('h1')).toContainText(/Nabha Telemedicine/i);

    // 1. Simulate going offline
    await context.setOffline(true);
    await expect(page.locator('text=Offline Mode Enabled')).toBeVisible();

    // 2. Open Assisted Onboarding Form
    await page.click('a[aria-label*="Onboarding"]');
    
    // Fill out Patient Onboarding Form
    await page.fill('input[placeholder*="Full Name"]', 'Gurbaksh Singh');
    await page.fill('input[placeholder*="Phone Number"]', '9876543210');
    
    // Submit Form Offline
    await page.click('button:has-text("Register Patient")');
    await expect(page.locator('text=Saved locally in offline cache')).toBeVisible();

    // 3. Simulate restoring connection
    await context.setOffline(false);
    await expect(page.locator('text=Connected')).toBeVisible();

    // 4. Verify Background Sync triggers and processes the queue
    await page.click('a[aria-label*="Sync"]');
    await expect(page.locator('text=Syncing Data...')).toBeVisible();
    await expect(page.locator('text=Sync Completed Successfully')).toBeVisible();
  });

  test('2. Doctor Teleconsultation Queue, Vitals Recording, & Encounter Closure', async ({ page }) => {
    // Log in as doctor
    await page.goto('/login');
    await page.fill('input[name="username"]', 'doctor1');
    await page.fill('input[name="password"]', 'securepass123');
    await page.click('button[type="submit"]');

    // 1. Check Doctor Patient Queue
    await page.goto('/doctor/dashboard');
    await expect(page.locator('h2')).toContainText(/Patient Queue/i);
    await expect(page.locator('text=Gurbaksh Singh')).toBeVisible();

    // 2. Enter Teleconsultation Room
    await page.click('button:has-text("Start Consultation")');
    await expect(page.locator('text=Establishing Secure Connection...')).toBeVisible();

    // 3. Open Vitals Entry and record
    await page.click('button:has-text("Vitals")');
    await page.fill('input#heartRate', '75');
    await page.fill('input#bloodPressure', '125/85');
    await page.click('button:has-text("Save Vitals")');
    await expect(page.locator('text=Vitals saved successfully')).toBeVisible();

    // 4. Close Encounter
    await page.click('button:has-text("End Encounter")');
    await page.fill('textarea[name="clinicalSummary"]', 'Patient Gurbaksh displays stable vitals under mild hypertension.');
    await page.click('button:has-text("Finalize Encounter")');
    await expect(page.locator('text=Encounter Closed Successfully')).toBeVisible();
  });

  test('3. Pharmacist Stock Management, Prescription Ingestion, & Dispensing Flow', async ({ page }) => {
    // Log in as pharmacist
    await page.goto('/login');
    await page.fill('input[name="username"]', 'pharmacist1');
    await page.fill('input[name="password"]', 'pharmapass123');
    await page.click('button[type="submit"]');

    // 1. Verify availability inventory
    await page.goto('/pharmacist/dashboard');
    await expect(page.locator('h2')).toContainText(/Inventory Availability/i);

    // 2. View pending prescriptions and ingest
    await page.click('a[aria-label*="Fulfill"]');
    await expect(page.locator('text=Pending Prescriptions')).toBeVisible();
    await expect(page.locator('text=Gurbaksh Singh')).toBeVisible();

    // 3. Dispense & Fulfill Medication
    await page.click('button:has-text("Accept Fulfillment")');
    await page.click('button:has-text("Mark Dispensed")');
    await expect(page.locator('text=Prescription Fulfilled')).toBeVisible();
  });
});
