# Real-World Backend Utilization: Scenarios & Edge Cases

This document maps the technical backend architecture (APIs, services, and modules) to real-world scenarios, demonstrating exactly how the telemedicine platform operates in the hands of patients, doctors, ASHA workers, and pharmacists in rural environments.

---

## 1. Authentication & Identity: The Entry Points

### Scenario A: Self-Serve Patient Login
*   **Context:** A literate patient with a smartphone and a stable network wants to check their records.
*   **Action:** They enter their phone number on the PWA.
*   **APIs Hit:** 
    *   `POST /api/v1/auth/request-otp` (triggers SMS integration).
    *   `POST /api/v1/auth/verify-otp` (returns JWT).
*   **Behind the Scenes:** The Auth Service checks if the user exists. If new, it provisions a base `Patient` record. 

### Scenario B: Assisted Registration (No-Phone Patient)
*   **Context:** An elderly patient without a phone visits a village clinic run by an ASHA worker.
*   **Action:** The ASHA worker logs in using their staff credentials. They register the patient using the ASHA worker's tablet.
*   **APIs Hit:** 
    *   `POST /api/v1/auth/staff/login` (Staff authentication).
    *   `POST /api/v1/patients` (Creates patient record).
*   **Edge Case Handled:** The patient identity model does *not* strictly require a phone number. The patient is created with a `local_id`. The ASHA worker's phone number is saved as secondary "guardian/contact" metadata, but the patient remains a distinct entity.
*   **Audit Trail:** The `provenance_events` table logs that this patient profile was created by `Actor: ASHA_Worker_ID` on behalf of the patient.

### Scenario C: The Optional ABHA Linkage
*   **Context:** The government mandates ABHA reporting for a specific regional program, but the clinic operator doesn't want to slow down the queue.
*   **Action:** The operator registers the patient normally (Scenario B). Later, when the queue is clear, they link the ABHA card.
*   **APIs Hit:** `POST /api/v1/patients/{id}/link-abha`
*   **Backend Behavior:** The `patient_identifiers` table adds a new row of type `abha`. The core care workflows remain completely unaffected by whether this API was called or not.

---

## 2. AI-Assisted Intake & Triage

### Scenario: High patient volume with limited doctor availability
*   **Context:** A patient arrives at a clinic with multiple vague symptoms. To save the doctor time, the clinic operator uses the AI triage tool.
*   **Action:** The operator inputs "fever for 3 days, body ache, slight cough."
*   **APIs Hit:** `POST /api/v1/ai/triage` (Internal AI Service Hook).
*   **Backend Behavior:** The AI Service calls the external LLM, enforcing a strict JSON output schema. It returns: `{"urgency": "routine", "summary": "3-day febrile illness with cough/myalgia"}`.
*   **Edge Case Handled (AI Hallucination):** The AI suggests "prescribe antibiotics." The backend strips this out, because the internal contract strictly ignores prescription generation from AI. The output is saved to `ai_assistance_logs` and flagged as `pending_human_review`.

---

## 3. Appointments & The Consultation Lifecycle

### Scenario: Unstable Network Teleconsultation
*   **Context:** The patient is at home on a 3G connection. The doctor is at a district hospital. 
*   **Action:** The patient books a slot. At the scheduled time, both join the room.
*   **APIs Hit:** 
    *   `POST /api/v1/appointments` (Booking).
    *   `POST /api/v1/encounters` (Changes state from scheduled appointment to active encounter).
    *   `WebSocket /ws/rooms/{id}` (Signaling service for WebRTC).
*   **Real-World Degradation:** Halfway through, it starts raining, and the 3G drops to 2G. WebRTC packet loss spikes.
*   **Backend/Frontend Response:** The client-side logic detects the drop and downgrades video resolution, eventually turning off the patient's video entirely, forcing an **audio-only fallback**. The API backend remains unaware of media drops (as WebRTC is peer-to-peer/TURN routed), but if the WebSocket drops, the `encounters` state allows the doctor to switch to **async mode** (sending text/voice notes to the patient's app).

---

## 4. The Offline-First Clinical Record (The Sync Engine)

### Scenario A: Rural Camp with No Internet
*   **Context:** A doctor visits a remote village with zero cellular reception.
*   **Action:** The doctor examines 15 patients, records blood pressure (`observations`), notes an allergy (`allergies`), and writes clinical summaries. They hit "Save" on their tablet.
*   **Backend Reality:** The backend is completely unreachable. 
*   **Frontend Reality:** The PWA saves all these actions into IndexedDB as `SyncOperations` with state `pending`. The UI tells the doctor: "Saved Locally."

### Scenario B: Returning to Connectivity (The Sync Push)
*   **Context:** The doctor drives back to town and connects to hospital Wi-Fi.
*   **Action:** The app detects the network and automatically initiates a background sync.
*   **APIs Hit:** `POST /api/v1/sync/push`
*   **Backend Behavior:** 
    *   The sync service receives a massive JSON payload of 50 operations.
    *   It checks `operation_id` to ensure it hasn't processed these already (Idempotency).
    *   It checks the `base_version` of the patient records.
    *   It successfully appends the 15 blood pressure readings (append-only logic).
*   **Edge Case Handled (Sync Conflict):** While the doctor was offline, a hospital admin corrected the spelling of a patient's allergy from the hospital desk. The doctor's offline tablet also tried to update that same allergy.
    *   The backend detects a `base_version` mismatch.
    *   Because it's an `allergy` (high-risk), the backend refuses to silently merge. It returns a `conflict` status for that specific operation.
    *   The doctor's UI shows a red flag: "Conflict on Allergy Update. Review needed."
    *   `POST /api/v1/sync/conflicts/{id}/resolve` is called when the doctor manually chooses the correct version.

---

## 5. Pharmacy, Inventory, & Prescription Fulfillment

### Scenario: The Broken Supply Chain
*   **Context:** The doctor finishes the consult and prescribes "Paracetamol 500mg". In rural areas, patients often travel 10km to a pharmacy only to find it's out of stock.
*   **Action:** Before the patient leaves, the app queries nearby pharmacies.
*   **APIs Hit:** `GET /api/v1/pharmacies/availability?medicine_id=123`
*   **Backend Behavior:** 
    *   The backend checks the `stock_batches` table for pharmacies within a radius.
    *   It calculates current stock based on the `stock_movements` ledger.
    *   **Crucial Detail:** The response includes `last_sync_at`. The UI shows "Available (As of 3 hours ago)" instead of a misleading "Guaranteed In Stock."

### Scenario: The Dispensation Loop
*   **Context:** The patient arrives at the local pharmacy.
*   **Action:** The pharmacist scans the prescription QR on the patient's phone.
*   **APIs Hit:**
    *   `GET /api/v1/prescriptions/{id}`
    *   `POST /api/v1/fulfillments/{id}/accept`
    *   `POST /api/v1/fulfillments/{id}/dispense`
*   **Backend Behavior:**
    *   The prescription status updates from `routed` -> `accepted` -> `dispensed`.
    *   An entry is written to `stock_movements` deducting the quantity.
    *   **Edge Case (Partial Fulfillment):** The patient was prescribed 20 tablets, but the pharmacy only has 10. The pharmacist selects "Partial Dispense". The backend updates the fulfillment to `partial`, deducts 10 from stock, and leaves the prescription open so the patient can get the remaining 10 elsewhere.

---

## 6. Audit, Provenance & Legal Protection

### Scenario: Suspected Misuse of Medication
*   **Context:** The district health officer suspects a specific clinic is over-prescribing a certain restricted medication.
*   **Action:** The admin runs an audit report.
*   **Backend Behavior:** 
    *   The system doesn't just look at current `medication_requests`. It queries the `provenance_events` table.
    *   Because of Phase 9 architecture, the backend has a cryptographically secure-like log of exactly *which* user account (`actor_user_id`), from *which* tablet (`device_id`), at *what* time created the prescriptions, even if the prescriptions were later cancelled or soft-deleted.

### Scenario: Patient Privacy & Shared Devices
*   **Context:** Multiple patients use the same village tablet (owned by the ASHA worker) to check their records.
*   **Edge Case Handled:** When Patient A logs out and Patient B logs in, the `auth_service` invalidates Patient A's refresh tokens. The backend's `audit_events` table logs the exact IP and device footprint of the session switch, ensuring that if Patient B somehow viewed Patient A's cached data, there is a forensic trail of the session overlap.

---

## 7. The "Lie-Fi" and Parallel Care Conflicts

### Scenario: The "Lie-Fi" Initial Sync Bottleneck
*   **Context:** A clinician begins their shift in a rural clinic. The device shows a 4G connection, but the actual throughput is almost zero (a state known as "Lie-Fi"). 
*   **Action:** The PWA attempts to perform an initial data pull for the day's scheduled patients.
*   **Backend Behavior:** The `GET /api/v1/sync/pull` is designed with pagination (`?cursor=...`). Instead of timing out while trying to send 50 heavy patient charts at once, the backend sends small, prioritized batches. It prioritizes "Critical Alerts" (allergies, active prescriptions) over "Historical Data" (old lab results) to ensure the clinician has the essential information to safely treat the patient even if the sync eventually fails.

### Scenario: Parallel Care & The "Merge & Flag" Approach
*   **Context:** A nurse in a remote clinic updates a patient's vitals offline. At the exact same time, a specialist at a central hospital (online) updates the same patient's medication list.
*   **Action:** The nurse's device eventually finds a connection and pushes the changes.
*   **APIs Hit:** `POST /api/v1/sync/push`
*   **Backend Behavior:** The backend detects a parallel change since the nurse's `base_version` is outdated. Rather than a blind "last write wins" policy (which would overwrite the specialist's medication change), the backend uses a bi-temporal model (tracking both clinical assertion time and server sync time). It accepts both non-overlapping changes (vitals vs. medications), increments the `record_version`, and returns the merged truth to the nurse's device.

---

## 8. Identity Collisions & The "New Patient" Problem

### Scenario: Migratory Workers & Duplicate Registration
*   **Context:** A migratory agricultural worker visits a clinic in Village A and is registered as a "new patient" by a health worker offline. A week later, they visit Village B and are registered again by a different worker offline.
*   **Action:** Both devices eventually sync with the central server.
*   **APIs Hit:** `POST /api/v1/patients` (via the sync engine payload).
*   **Backend Behavior:** Both devices generated temporary, distinct UUIDs locally. Upon syncing, the identity service runs a probabilistic match based on name, age, and any alternative `patient_identifiers` provided. 
*   **Edge Case Handled:** If the system detects a highly probable duplicate, it flags the records for manual admin review. Once an admin merges the profiles, the backend updates the `patients` table (soft-deleting one record and pointing its relations to the surviving UUID) and pushes the merge event down to both field workers' devices during their next `sync/pull`.

---

## 9. Infrastructure & Device Constraints

### Scenario: The "Stolen Device" Window
*   **Context:** An ASHA worker's tablet containing two days' worth of offline, unsynced patient encounters is stolen from the clinic.
*   **Action:** The clinic admin logs into the portal and revokes the device's access.
*   **APIs Hit:** `POST /api/v1/auth/devices/{device_id}/revoke`
*   **Backend Behavior:** The backend immediately invalidates the refresh token associated with that `device_id`. 
*   **Edge Case Handled:** While the unencrypted local IndexedDB data on the stolen device is compromised (a physical security issue), the device can no longer sync with the central server. More importantly, any malicious modifications made on the stolen tablet will be rejected by the `sync/push` API because the device token is invalid, protecting the central Source of Truth.