# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflow.spec.ts >> Nabha Telemedicine Platform - Phase 4 E2E Workflows >> 3. Pharmacist Stock Management, Prescription Ingestion, & Dispensing Flow
- Location: e2e/workflow.spec.ts:71:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Ravi Kumar')
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByText('Ravi Kumar')

```

```yaml
- banner:
  - img "Sanjeevani Logo"
  - heading "Sanjeevani" [level=1]
  - combobox "Select Language":
    - option "ਪੰਜਾਬੀ (Punjabi)"
    - option "हिन्दी (Hindi)"
    - option "English" [selected]
  - button "Log Out of Portal"
- main:
  - heading "Pending Prescriptions" [level=3]
  - paragraph: Medications Requested
  - text: 0 Waiting
  - img
  - paragraph: Queue is Clear
  - paragraph: There are no patients currently waiting in the teleconsultation queue.
- navigation "Primary Navigation":
  - link "Fulfill":
    - /url: /
  - link "Inventory":
    - /url: /inventory
  - link "Search":
    - /url: /search
  - link "Profile":
    - /url: /profile
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Nabha Telemedicine Platform - Phase 4 E2E Workflows', () => {
  4  |   
  5  |   test('1. ASHA Worker Onboarding, Offline Mode, & Reconnect Sync Journey', async ({ page, context }) => {
  6  |     // 1. Log in as ASHA worker
  7  |     await page.goto('/login');
  8  |     await page.getByRole('tab', { name: /Staff Portal/i }).click();
  9  |     await page.fill('input#username', 'asha_geeta');
  10 |     await page.fill('input#password', 'password123');
  11 |     await page.click('button[type="submit"]');
  12 | 
  13 |     // Ensure English and wait for heading to confirm login
  14 |     await page.getByLabel('Select Language').selectOption('en');
  15 |     await expect(page.getByRole('heading', { level: 1, name: /Assisted Checkups/i })).toBeVisible();
  16 | 
  17 |     // 2. Simulate going offline
  18 |     await context.setOffline(true);
  19 |     // Use a regex to be more flexible and wait longer
  20 |     await expect(page.getByText(/Offline Mode/i)).toBeVisible({ timeout: 10000 });
  21 | 
  22 |     // 3. Open Assisted Onboarding Form
  23 |     await page.click('button:has-text("New Patient Registration")');
  24 |     await page.fill('input#fullName', 'Gurbaksh Singh');
  25 |     
  26 |     // Submit Form Offline
  27 |     await page.click('button:has-text("Next")');
  28 |     await expect(page.getByText(/Registration Complete!/i)).toBeVisible();
  29 | 
  30 |     // 4. Simulate restoring connection
  31 |     await context.setOffline(false);
  32 |     await expect(page.getByText(/Connected/i)).toBeVisible({ timeout: 10000 });
  33 | 
  34 |     // 5. Verify Background Sync
  35 |     await page.goto('/sync');
  36 |     await expect(page.getByRole('heading', { level: 1, name: /Offline Record Synchronization/i })).toBeVisible();
  37 |     
  38 |     await page.click('button:has-text("Synchronize Offline Cache")');
  39 |     await expect(page.getByText(/Syncing Data.../i)).toBeVisible();
  40 |     await expect(page.getByText(/Database is Fully Synced/i)).toBeVisible();
  41 |   });
  42 | 
  43 |   test('2. Doctor Teleconsultation Queue, Vitals Recording, & Encounter Closure', async ({ page }) => {
  44 |     // 1. Log in as doctor
  45 |     await page.goto('/login');
  46 |     await page.getByRole('tab', { name: /Staff Portal/i }).click();
  47 |     await page.fill('input#username', 'dr_sharma');
  48 |     await page.fill('input#password', 'password123');
  49 |     await page.click('button[type="submit"]');
  50 | 
  51 |     await page.getByLabel('Select Language').selectOption('en');
  52 | 
  53 |     // 2. Check Doctor Patient Queue
  54 |     await expect(page.getByRole('heading', { name: /Today's Patient Queue/i })).toBeVisible();
  55 |     await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 15000 });
  56 | 
  57 |     // 3. Enter Teleconsultation Room
  58 |     await page.getByRole('button', { name: /Join Video Call/i }).click();
  59 |     await expect(page).toHaveURL(/.*consultation/);
  60 |     
  61 |     // Since we granted permissions, we should see the connection message or the patient name
  62 |     await expect(page.getByRole('heading', { name: /Ravi Kumar/i })).toBeVisible({ timeout: 15000 });
  63 | 
  64 |     // 4. Open Vitals Entry and record
  65 |     await page.getByRole('button', { name: /Vitals/i }).click();
  66 |     await page.fill('input#heartRate', '75');
  67 |     await page.fill('input#bloodPressure', '125/85');
  68 |     await page.getByRole('button', { name: /Save Vitals/i }).click();
  69 |   });
  70 | 
  71 |   test('3. Pharmacist Stock Management, Prescription Ingestion, & Dispensing Flow', async ({ page }) => {
  72 |     // 1. Log in as pharmacist
  73 |     await page.goto('/login');
  74 |     await page.getByRole('tab', { name: /Staff Portal/i }).click();
  75 |     await page.fill('input#username', 'pharmacist_nabha');
  76 |     await page.fill('input#password', 'password123');
  77 |     await page.click('button[type="submit"]');
  78 | 
  79 |     await page.getByLabel('Select Language').selectOption('en');
  80 | 
  81 |     // 2. Verify pending prescriptions
  82 |     await expect(page.getByRole('heading', { name: /Pending Prescriptions/i })).toBeVisible();
  83 |     // Use a longer timeout for backend to respond
> 84 |     await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 20000 });
     |                                                ^ Error: expect(locator).toBeVisible() failed
  85 | 
  86 |     // 3. Dispense & Fulfill Medication
  87 |     await page.getByRole('button', { name: /Fulfill/i }).click();
  88 |     await expect(page.getByText(/Encounter Finalized/i)).toBeVisible();
  89 |   });
  90 | });
  91 | 
```