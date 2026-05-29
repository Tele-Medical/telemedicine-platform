import { test, expect } from '@playwright/test';

test.describe('Sanjeevani Telemedicine Platform - Phase 4 E2E Workflows', () => {
  test.describe.configure({ mode: 'serial' });
  
  test('1. ASHA Worker Search, Prefilled Onboarding, Offline Consultation & Sync Journey', async ({ page, context }) => {
    // 1. Log in as ASHA worker
    await page.goto('/login');
    await page.getByRole('tab', { name: /Staff Portal/i }).click();
    await page.fill('input#username', 'asha_geeta');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');

    // Ensure English and wait for heading to confirm login
    await page.getByLabel('Select Language').selectOption('en');
    await expect(page.getByRole('heading', { level: 1, name: /Assisted Checkups/i })).toBeVisible();

    // 2. Click "Consult Patient" quick action button
    await page.click('button:has-text("Consult Patient")');
    await expect(page).toHaveURL(/.*consult-patient/);

    // 3. Search for unregistered patient number
    await page.fill('input[placeholder="e.g. 9876543210"]', '9999999999');
    await page.click('button:has-text("Search Profile")');

    // 4. Verify Unregistered Prompt and Click Register
    await expect(page.getByText(/Number Not Registered/i)).toBeVisible();
    await page.click('button:has-text("Register New Patient")');

    // 5. Verify Phone Prefilled & Disabled in Onboarding Wizard
    await expect(page).toHaveURL(/.*register\?phone=9999999999/);
    const phoneInput = page.locator('input#phone');
    await expect(phoneInput).toBeDisabled();
    await expect(phoneInput).toHaveValue('9999999999');

    // Fill registration form
    await page.fill('input#fullName', 'Ravi Kumar');
    await page.click('button:has-text("Next")');

    // 6. Automatically redirect to Consultation flow for the new patient
    await expect(page).toHaveURL(/.*consultation-flow/);
    await expect(page.getByText('Ravi Kumar')).toBeVisible();

    // 7. Go Offline
    await context.setOffline(true);
    await expect(page.getByText(/Offline Cache/i)).toBeVisible();

    // 8. Fill in Symptoms
    await page.click('span:has-text("Fever")');
    await page.click('span:has-text("Cough")');
    await page.fill('textarea[placeholder*="Describe patient symptoms"]', 'Patient has persistent fever and mild dry cough.');

    // 9. Input Vitals
    await page.click('button:has-text("Vitals")');
    await page.fill('input#temp', '99.2');
    await page.fill('input#systolic', '125');
    await page.fill('input#diastolic', '82');
    await page.fill('input#heartRate', '76');
    await page.fill('input#spo2', '97');
    await page.fill('input#glucose', '110');
    await page.fill('input#hemoglobin', '14.5');
    await page.fill('input#height', '175');
    await page.fill('input#weight', '70');

    // Verify auto-calculated BMI
    await expect(page.getByText('22.86')).toBeVisible();
    await expect(page.getByText('Normal')).toBeVisible();

    // 10. Upload a report offline
    await page.click('button:has-text("Reports")');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'cbc_report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('dummy pdf report')
    });
    await expect(page.getByText('cbc_report.pdf')).toBeVisible();

    // 11. Schedule Doctor Appointment Offline
    await page.click('button:has-text("Booking")');
    await page.click('button:has-text("Smart Triage Auto-Route")');
    // Offline keyword matching for cough/fever will map to General Medicine
    await expect(page.getByText(/Recommended Specialty/i)).toBeVisible();
    
    // Select the doctor Ramesh Sharma and select a date-time
    await page.selectOption('select#doctor-select', { value: 'd24c53d6-5f4a-4e62-8b0d-3d5c8a7b99d1' });
    await page.fill('input#appt-date', '2026-06-01T10:00');

    // 12. Submit Consultation Offline
    await page.click('button:has-text("Save & Submit Consultation")');
    await expect(page.getByText(/Consultation Saved successfully!/i)).toBeVisible();

    // 13. Restore connection and go to Sync
    await context.setOffline(false);
    await page.goto('/sync');

    // 14. Push changes online
    await expect(page.getByText(/Pending Offline Changes/i)).toBeVisible();
    await page.click('button:has-text("Changes Online")');
    
    await expect(page.getByText(/All community clinical checkups have been synced/i)).toBeVisible();
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
    await page.getByRole('button', { name: /Update/i }).click();
    await page.fill('input#heartRate', '75');
    await page.fill('input#bloodPressure', '125/85');
    await page.getByRole('button', { name: /Save & Share/i }).click();

    // 5. Switch to Prescription Panel and write a prescription
    await page.getByRole('tab', { name: /Prescription/i }).click();
    await page.fill('input#medicine-name', 'Dolo 650mg');
    await page.getByRole('button', { name: /Add Medicine/i }).click();
    await page.fill('textarea#doctor-notes', 'Take twice daily after meals.');
    await page.getByRole('button', { name: /Save Prescription/i }).click();
    await expect(page.getByText(/Prescription draft saved successfully/i)).toBeVisible();
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
