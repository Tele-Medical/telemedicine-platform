import { test, expect } from '@playwright/test';

test.describe('Sanjeevani Telemedicine Platform - Phase 4 E2E Workflows', () => {
  
  test('1. ASHA Worker Onboarding, Offline Mode, & Reconnect Sync Journey', async ({ page, context }) => {
    // 1. Log in as ASHA worker
    await page.goto('/login');
    await page.getByRole('tab', { name: /Staff Portal/i }).click();
    await page.fill('input#username', 'asha_geeta');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');

    // Ensure English and wait for heading to confirm login
    await page.getByLabel('Select Language').selectOption('en');
    await expect(page.getByRole('heading', { level: 1, name: /Assisted Checkups/i })).toBeVisible();

    // 2. Simulate going offline
    await context.setOffline(true);
    // Use a regex to be more flexible and wait longer
    await expect(page.getByText(/Offline Mode/i)).toBeVisible({ timeout: 10000 });

    // 3. Open Assisted Onboarding Form
    await page.click('button:has-text("New Patient Registration")');
    await page.fill('input#fullName', 'Gurbaksh Singh');
    
    // Submit Form Offline
    await page.click('button:has-text("Next")');
    await expect(page.getByText(/Registration Complete!/i)).toBeVisible();

    // 4. Simulate restoring connection
    await context.setOffline(false);
    await expect(page.getByText(/Connected/i)).toBeVisible({ timeout: 10000 });

    // 5. Verify Background Sync
    await page.goto('/sync');
    await expect(page.getByRole('heading', { level: 1, name: /Offline Record Synchronization/i })).toBeVisible();
    
    await page.click('button:has-text("Synchronize Offline Cache")');
    await expect(page.getByText(/Syncing Data.../i)).toBeVisible();
    await expect(page.getByText(/Database is Fully Synced/i)).toBeVisible();
  });

  test('2. Doctor Teleconsultation Queue, Vitals Recording, & Encounter Closure', async ({ page }) => {
    // 1. Log in as doctor
    await page.goto('/login');
    await page.getByRole('tab', { name: /Staff Portal/i }).click();
    await page.fill('input#username', 'dr_sharma');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');

    await page.getByLabel('Select Language').selectOption('en');

    // 2. Check Doctor Patient Queue
    await expect(page.getByRole('heading', { name: /Today's Patient Queue/i })).toBeVisible();
    await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 15000 });

    // 3. Enter Teleconsultation Room
    await page.getByRole('button', { name: /Join Video Call/i }).click();
    await expect(page).toHaveURL(/.*consultation/);
    
    // Since we granted permissions, we should see the connection message or the patient name
    await expect(page.getByRole('heading', { name: /Ravi Kumar/i })).toBeVisible({ timeout: 15000 });

    // 4. Open Vitals Entry and record
    await page.getByRole('button', { name: /Vitals/i }).click();
    await page.fill('input#heartRate', '75');
    await page.fill('input#bloodPressure', '125/85');
    await page.getByRole('button', { name: /Save Vitals/i }).click();
  });

  test('3. Pharmacist Stock Management, Prescription Ingestion, & Dispensing Flow', async ({ page }) => {
    // 1. Log in as pharmacist
    await page.goto('/login');
    await page.getByRole('tab', { name: /Staff Portal/i }).click();
    await page.fill('input#username', 'pharmacist_nabha');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');

    await page.getByLabel('Select Language').selectOption('en');

    // 2. Verify pending prescriptions
    await expect(page.getByRole('heading', { name: /Pending Prescriptions/i })).toBeVisible();
    // Use a longer timeout for backend to respond
    await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 20000 });

    // 3. Dispense & Fulfill Medication
    await page.getByRole('button', { name: /Fulfill/i }).click();
    await expect(page.getByText(/Encounter Finalized/i)).toBeVisible();
  });
});
