# Real-World Usage Scenarios

## Purpose of this document

This document explains how the telemedicine platform would actually work in real life.

It is written to answer practical questions such as:

- How does a patient use the system?
- What happens when the internet is weak?
- How does a doctor work with offline records?
- How does medicine fulfillment happen after consultation?
- How does login work?
- How can a child or someone without a mobile number use the system?

This is important because many projects look good in architecture diagrams but fail when converted into real-world workflows.

---

## Core real-world principle

The system should support **three kinds of usage**:

1. direct self-service use by a patient
2. assisted use through an ASHA worker, clinic operator, or family caregiver
3. institutional use by doctors, pharmacists, and admins

This is critical because in rural healthcare, many patients will not use the app fully on their own.

---

## Main actors in the system

### Patient

Uses the platform to:

- request care
- join consultation
- see prescriptions
- check medicine availability

### Doctor

Uses the platform to:

- review patient history
- conduct teleconsultation
- write notes
- prescribe medicine

### Pharmacist

Uses the platform to:

- manage stock
- receive prescription requests
- confirm availability
- mark medicine ready or dispensed

### ASHA worker or clinic operator

Uses the platform to:

- help patients register
- capture symptoms and vitals
- assist in teleconsultation
- help users who lack digital literacy or a phone number

### Admin

Uses the platform to:

- manage users
- monitor activity
- review reports and shortages

---

## How login works

Login should work differently for different user types.

## 1. Patient login with mobile number

This is the standard self-service path.

### Flow

1. Patient enters mobile number.
2. System sends OTP by SMS.
3. Patient enters OTP.
4. System verifies OTP.
5. System creates or resumes a session.
6. Patient lands in their dashboard.

### When this works well

- adult patient has own phone
- patient can read OTP
- network is available enough for SMS delivery

### Why this is used

- simple
- familiar
- low friction

---

## 2. Staff login

Doctors, pharmacists, admins, and trained workers should use stronger role-based accounts.

### Flow

1. Staff enters credentials or approved login method.
2. System verifies identity.
3. Role is checked.
4. Session is created with role-based access permissions.

### Why staff login is separate

- staff actions affect many patients
- they need stronger accountability
- audit logs must clearly track their actions

---

## 3. Assisted login or assisted access

This is the important path for users who cannot log in themselves.

Examples:

- elderly patient
- low-literacy patient
- patient without own phone
- child

### Flow

1. ASHA worker or clinic operator logs into their own staff account.
2. They search for the patient or create the patient profile.
3. They open the patient record in assisted mode.
4. They request a consultation on behalf of the patient.
5. The consultation and records are still attached to the patient, not to the worker.

### Important rule

The helper should never become the patient identity.

The system must track:

- actual patient
- assisting worker
- who entered or edited the data

This is where audit and provenance matter.

---

## How a child or someone without a mobile number can use the system

This is a very important real-world question.

Such users should still be fully supported.

## Recommended model

The system should allow:

- patient profile without mandatory mobile number
- guardian or caregiver linkage where relevant
- assisted registration through worker or clinic

## Example: child patient

### Registration model

The child gets:

- their own patient record
- their own clinical history
- their own prescriptions

Optional linked information may include:

- guardian name
- guardian phone number
- relationship to patient

### Important rule

The guardian's phone number is **not** the child’s identity.

It is only:

- a contact method
- an assisted access method

Why this matters:

- one parent may have multiple children
- phone ownership can change
- child must still remain a distinct patient in records

## Example flow for a child without mobile number

1. Mother visits ASHA worker or clinic with child.
2. Worker searches whether child already exists in system.
3. If not, worker creates a child patient profile.
4. Guardian phone is added as contact, if available.
5. Worker enters symptoms and vitals.
6. Doctor consults with guardian present.
7. Prescription is generated in child’s record.
8. Guardian receives SMS updates if a contact number exists.

If there is no guardian phone either:

- worker or clinic operator can still manage the process
- paper or verbal follow-up can complement the digital record

So the system still works even without direct patient login.

---

## Scenario 1: Adult patient with own phone, weak network at home

### Situation

A woman in a village has fever and body pain. She has her own Android phone and weak mobile internet.

### Step-by-step flow

1. She opens the PWA on her phone.
2. She logs in using OTP.
3. She selects Punjabi as language.
4. She books a consultation request.
5. The app stores the request locally first if the network is unstable.
6. Once connection is available, the appointment request syncs to the backend.
7. At consultation time, she joins the call.
8. Video starts, but bandwidth drops.
9. System automatically lowers video quality.
10. If network worsens more, call switches to audio-only.
11. Doctor still completes the consultation.
12. Doctor writes notes and prescribes medicine.
13. Patient checks nearby medicine availability.
14. A pharmacy confirms availability.
15. Patient receives a message when medicine is ready.

### Why this scenario matters

This shows the core promise of the system:

- the service does not collapse when the network is weak
- the care flow continues from consultation to medicine access

---

## Scenario 2: Patient does not know how to use smartphone properly

### Situation

An elderly man has a smartphone in the house, but he cannot comfortably type, navigate menus, or manage OTP by himself.

### Step-by-step flow

1. His daughter or local ASHA worker helps open the app.
2. The patient is either:
   - logged in with his number, or
   - accessed via assisted mode by a health worker
3. Symptoms are entered using guided fields, not long free-text typing.
4. Voice support or simple icons help reduce confusion.
5. Consultation is initiated.
6. The helper may stay present during the call.
7. Doctor explains treatment.
8. System stores prescription and follow-up instructions.
9. Audio playback or helper explanation helps the patient understand the prescription.

### Why this scenario matters

This proves the system is not designed only for confident mobile users.

---

## Scenario 3: Child patient with no mobile number

### Situation

A 7-year-old child has cough and fever. The child has no phone, no direct login, and may not even be able to communicate clearly alone.

### Step-by-step flow

1. Parent visits village worker or PHC.
2. Worker logs in using staff account.
3. Worker searches child by:
   - local patient ID
   - guardian-linked contact
   - existing identifier
4. If child record does not exist, worker creates it.
5. Guardian details are attached as contact info.
6. Worker records symptoms, temperature, and history.
7. Doctor joins teleconsultation with guardian and child.
8. Doctor gives advice and prescription.
9. Prescription is stored under the child’s record.
10. Guardian phone receives updates if available.
11. Pharmacy processes medicine based on the child’s prescription.

### Important data rule

The child remains the patient.

The guardian is:

- contact person
- support person
- not the owner of the child’s medical record

### Why this scenario matters

It shows the system works for users who have:

- no phone
- no independent login
- dependent-care needs

---

## Scenario 4: ASHA worker visits home in offline area

### Situation

An ASHA worker visits a home where connectivity is poor or completely unavailable.

### Step-by-step flow

1. Worker opens the app on their device.
2. The device already has locally available patient list and recent records.
3. Worker opens the patient’s profile offline.
4. Worker records:
   - blood pressure
   - fever
   - complaints
   - visit notes
5. Data is written to IndexedDB immediately.
6. The app marks these changes as pending sync.
7. Worker later reaches an area with internet.
8. Sync engine pushes the locally stored records to the server.
9. If there is no conflict, server stores the new authoritative version.
10. If there is a conflict, it is flagged for review according to sync rules.

### Why this scenario matters

This is one of the strongest real-world use cases of the whole platform.

Without offline-first architecture, this workflow fails completely.

---

## Scenario 5: Doctor consultation completed, but medicine unavailable at nearest pharmacy

### Situation

A doctor prescribes medicine, but the closest pharmacy does not have enough stock.

### Step-by-step flow

1. Doctor creates prescription after consultation.
2. System searches pharmacies with relevant stock.
3. Nearest pharmacy is checked first.
4. Inventory says only partial stock is available.
5. System marks this as partial fulfillment.
6. Patient or operator is shown alternate pharmacy options.
7. Another pharmacy nearby is found with full stock.
8. Prescription is routed there.
9. Pharmacy confirms acceptance.
10. Patient gets status update.

### Why this scenario matters

This shows why medicine inventory is part of the core product, not a side feature.

Telemedicine is incomplete if medicine access fails.

---

## Scenario 6: Returning patient with existing history

### Situation

A patient who consulted last month now returns with recurring symptoms.

### Step-by-step flow

1. Patient logs in or is accessed via assisted workflow.
2. Doctor opens patient history.
3. Previous:
   - observations
   - allergies
   - medications
   - consultation notes
   are visible.
4. Doctor compares current symptoms with old records.
5. New encounter is created instead of overwriting old history.
6. New observations are appended.
7. If medicine is changed, the new prescription is recorded clearly.

### Why this scenario matters

This is where continuity of care becomes valuable.

The system is not just for one-time calls. It builds longitudinal health history.

---

## Scenario 7: Optional future ABHA-linked patient journey

### Situation

A patient already has ABHA and wants to link it to the platform later.

### Step-by-step flow

1. Patient already exists in the platform with local identity.
2. Patient chooses optional ABHA linkage flow.
3. System links ABHA as an external identifier.
4. Internal patient record remains the operational record for the platform.
5. Future interoperable workflows can use the ABHA-linked identifier for external sharing or matching.

### Why this scenario matters

It shows that ABHA linkage is an enhancement path, not a dependency for basic care delivery.

---

## Summary of login and access strategy

### Direct login

Used for:

- adult patients with own mobile

Method:

- OTP-based login

### Staff login

Used for:

- doctors
- pharmacists
- admins
- ASHA workers

Method:

- staff credentials and role-based access

### Assisted access

Used for:

- children
- elderly users
- low-literacy patients
- users without phone numbers

Method:

- helper logs in
- patient record is accessed in assisted mode

### Key principle

The system must separate:

- patient identity
- helper identity
- contact number
- authentication account

If these are mixed together, the system becomes unsafe and confusing.

---

## Final practical conclusion

In the real world, this platform will not be used in only one way.

It must support:

- direct digital use
- assisted digital use
- offline field use
- institution-assisted use
- no-phone users such as children

That is exactly why the architecture uses:

- PWA-first delivery
- offline-first records
- role-based access
- patient identifier abstraction
- optional guardian/contact linkage
- optional later ABHA linkage

These are not theoretical choices. They are what make the system usable outside a demo environment.
