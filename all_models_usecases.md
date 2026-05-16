# The Complete Database Model Use-Case Guide

This document explains the real-world, clinical, and operational use cases for every single database model planned for the Rural Telemedicine Platform. It bridges the gap between raw SQL tables and the human workflows they enable.

---

## 1. Identity & System Access

*   **`User`**: Represents the "Login Account". Anyone who types a password or receives an OTP has a User row. It separates system access from medical profiles.
*   **`Role` & `UserRole`**: Determines what a User is allowed to do. A User might be just a `patient`, or they might be a `doctor`, or even a `clinic_operator` *and* an `asha_worker`.
*   **`OTPChallenge`**: Tracks the state of a login attempt via SMS. If an elderly patient enters their phone number to log in, this table tracks how many times they typed the wrong code to prevent brute-force hacking.
*   **`DeviceRegistration`**: Represents the physical hardware (like the specific Android tablet issued to an ASHA worker). By tracking the hardware, we know which devices are syncing data and can block a stolen tablet.
*   **`Session`**: Represents a specific period of time a User is logged in on a specific Device. If an ASHA worker shares her tablet with a patient to view their records, the session tracks when the patient logged in and logs them out automatically when it expires.

---

## 2. Patients & Practitioners

*   **`Patient`**: The core clinical profile. It holds demographics (name, language, village). Crucially, a Patient might *not* have a User account (e.g., a child registered by their mother).
*   **`PatientIdentifier`**: The flexible bridge for government integration. Instead of hardcoding ABHA IDs into the Patient table, this table allows a patient to have a `local_clinic_id`, an `abha_id`, and a future state health ID without breaking the database.
*   **`Practitioner`**: Represents a Doctor's professional profile. While their `User` row holds their password, this row holds their medical license number and specialty (e.g., "Pediatrics").

---

## 3. The Consultation Journey

*   **`Appointment`**: The *intent* to meet. When a patient books a slot for next Tuesday, it goes here. It can be cancelled or missed.
*   **`Encounter`**: The *actual* medical event. When the doctor answers the video call, an Encounter begins. It holds the final summary written by the doctor. An Encounter can happen without an Appointment (e.g., walk-in emergency).
*   **`EncounterParticipant`**: Tracks exactly who was in the video call. Did a specialist join halfway through? Did the ASHA worker stay on the line to translate?
*   **`ConsultationNote`**: Ongoing scratchpad notes taken during the encounter by the doctor or the assisting nurse.

---

## 4. Clinical Medical Records

*   **`Observation`**: The clinical term for Vitals. Blood pressure, temperature, weight, height. We append these over time to build a history chart.
*   **`Allergy`**: Extremely high-risk data (e.g., "Penicillin"). Tracked strictly to prevent doctors from prescribing fatal medications.
*   **`Condition`**: The diagnosis. e.g., "Type 2 Diabetes". Tracked with an onset date and a resolution date to maintain an active problem list.
*   **`Attachment`**: When a rural operator takes a photo of an old physical X-ray or a skin rash with their tablet, the file goes to cloud storage, and the URL and metadata are saved here.

---

## 5. Pharmacy, Medicine & Inventory

*   **`MedicineCatalog`**: The master dictionary of all drugs. Prevents doctors from typing "Para" and pharmacists from typing "Paracetamol" by forcing everyone to select the exact normalized drug (e.g., "Paracetamol 650mg Tablet").
*   **`MedicationRequest`**: The doctor's intent. "I want this patient to take Paracetamol 2x a day for 5 days."
*   **`Prescription` & `PrescriptionItem`**: The final, legally binding document issued to the patient, grouping multiple Medication Requests together.
*   **`Pharmacy`**: The physical location where drugs are stored and dispensed.
*   **`StockBatch`**: Tracks physical boxes of medicine on a shelf. Crucial because we must know the exact `expiry_date` of a batch of antibiotics to ensure we don't dispense expired drugs to villages.
*   **`StockMovement`**: The Immutable Ledger. You never just "update" stock from 10 to 5. You add a row saying "-5 dispensed for prescription X". This prevents race conditions and theft.
*   **`Fulfillment`**: The process of the pharmacist handing the drugs to the patient. It tracks if the pharmacy gave them all the pills, or if it was a `partial` fulfillment because they ran out of stock.

---

## 6. Offline Sync & Architecture

*   **`SyncCursor`**: When a tablet connects to the internet, it asks the server: "Give me all changes since timestamp X." The server replies and saves the new timestamp as a cursor here, so the tablet doesn't have to download the whole database again next time.
*   **`IntegrationEvent`**: A queue for external systems. If the platform needs to send a webhook to a government dashboard, it gets queued here so it can retry if the government server is down.

---

## 7. Security, Trust & AI

*   **`Consent`**: Legal protection. Tracks if a patient explicitly allowed a specific specialist to view their past history.
*   **`ProvenanceEvent`**: Cryptographic-style audit log. If a patient's allergy is changed from "Penicillin" to "None", this table records exactly which tablet, which user, and at what exact millisecond the change occurred.
*   **`AuditEvent`**: Tracks system access. "Admin viewed the pharmacy stock levels from IP address 192.168.1.1".
*   **`TriageSession`**: When an operator types symptoms into an AI tool before the doctor joins.
*   **`AIAssistanceLog`**: Records the exact prompt sent to the LLM and the exact raw response received. If the AI hallucinates a bad diagnosis, we have proof of what the machine said versus what the doctor actually did.
*   **`AIOutputReview`**: Proves that a human doctor actually read and approved the AI's summary before it was officially saved to the patient's medical record.