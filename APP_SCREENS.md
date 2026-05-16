# App Screens and User Flows

## Purpose

This document defines the major screens, flows, layout behavior, and UX rationale for the rural telemedicine PWA. It should guide both Figma design and React implementation.

## Information Architecture

The product is one role-aware frontend, not separate apps.

```text
Root
  Language and entry
  Auth
    Patient OTP
    Staff login
  Patient
    Home
    Request care
    Appointments
    Consultation
    Records
    Medicines
    Profile
  ASHA / Clinic operator
    Assisted care
    Patient search
    Patient registration
    Vitals and symptoms
    Appointments
    Sync queue
  Doctor
    Queue
    Consultation room
    Patient history
    Notes
    Prescription
  Pharmacist
    Fulfillment queue
    Inventory
    Batch details
    Medicine search
    Reorders
  Admin
    Overview
    Users
    Clinics
    Audit
    Reports
```

## Global Screen Patterns

### App Shell

Mobile:

- top area: page title, language/status shortcut where needed
- content: single-column task flow
- bottom nav: role-aware tabs
- optional sticky action bar

Tablet:

- top bar plus navigation rail
- two-column layout for workflows
- patient or task context side panel

Desktop:

- persistent sidebar
- top status strip for sync/network
- split panes for doctor, pharmacy, and admin workflows

### Global Status

Every authenticated shell should expose:

- network state
- sync state
- current role
- language
- logout/profile path

## Screen Inventory

## 1. First Launch and Language

### Purpose

Let users choose a readable language before authentication without making the screen feel like a marketing page.

### Layout

- app name and short purpose line
- language selector: Punjabi, Hindi, English
- primary action: Continue
- secondary action: Staff login

### Behavior

- remembers language locally
- can be changed later from profile or header
- no ABHA request here

### Responsive

- mobile: centered top content with full-width controls
- tablet/desktop: narrow centered panel, no decorative hero

### UX rationale

Language selection reduces early anxiety and prevents English-first assumptions.

## 2. Auth Choice

### Purpose

Separate patient and staff login clearly.

### Layout

- "Continue as patient"
- "Staff login"
- "Use with ASHA or clinic help"

### Behavior

- patient path goes to OTP
- staff path goes to credential login
- assisted path explains that a staff member must log in

### UX rationale

This prevents patient auth and staff accountability from being mixed.

## 3. Patient OTP Login

### Purpose

Allow adult patients with their own mobile number to access the platform.

### Layout

- phone number input
- send OTP button
- OTP input after request
- resend timer
- language switcher
- help text for no-phone users

### Behavior

- does not create patient identity solely from phone
- handles delayed OTP
- disables duplicate submissions
- shows clear retry state

### UX rationale

OTP is familiar, but the UI must not imply that all patients need their own phone.

## 4. Staff Login

### Purpose

Authenticate doctors, pharmacists, ASHA workers, clinic operators, and admins.

### Layout

- username/email
- password
- role context after login
- forgot/reset path

### Behavior

- session is role-based
- shared-device logout is prominent
- successful login lands on role dashboard

### UX rationale

Staff actions affect many patients and require stronger accountability.

## 5. Assisted Patient Search

### Purpose

Let ASHA workers and clinic operators find an existing patient before creating a new one.

### Layout

- search field
- filters: local ID, guardian phone, name, village
- recent local patients available offline
- create new patient action

### Behavior

- searches local cache first
- shows stale/local indicators
- does not require patient phone

### UX rationale

Duplicate patient records are a serious operational risk. Search comes before create.

## 6. Assisted Patient Registration

### Purpose

Create records for children, elderly users, and no-phone patients.

### Layout

Step 1: Patient basics

- full name
- age/date of birth
- gender
- village
- language

Step 2: Contact and guardian

- guardian name
- relationship
- guardian phone
- emergency contact

Step 3: Identifier and consent

- local patient ID
- optional ABHA link later
- consent capture where required

### Behavior

- phone is optional
- saves draft locally
- source device and assisting staff are captured
- shows "Patient record belongs to [name]"

### UX rationale

The helper must never become the patient identity.

## 7. Patient Home Dashboard

### Purpose

Give patients the next action quickly.

### Layout

- patient identity summary
- primary action: Request care
- urgent care shortcut
- upcoming appointment or active consult
- latest prescription status
- medicine availability shortcut
- sync status

### Behavior

- works from cached data
- shows last synced time
- surfaces incomplete actions

### Responsive

- mobile: stacked cards and sticky primary action
- tablet: two-column summary and timeline
- desktop: patient-oriented max-width layout

### UX rationale

Patients should not see admin-style dashboards. The home screen should answer "what next?"

## 8. Emergency Flow

### Purpose

Support urgent situations without overclaiming emergency care.

### Layout

- danger status header
- call local emergency help action
- request urgent teleconsult action
- key symptoms quick entry
- helper contact option

### Behavior

- uses clear disclaimers without long text
- stores urgent request locally if offline but warns about network limits
- offers audio callback if video is unlikely

### UX rationale

The screen must be fast, serious, and low-friction.

## 9. Appointment Request

### Purpose

Let patients or staff request care.

### Layout

- reason selector
- symptom summary
- preferred language
- availability preference
- mode preference: video, audio, callback
- submit button

### Behavior

- saves local draft first
- syncs with idempotent operation
- confirms "Request saved locally" vs "Request sent"

### UX rationale

Booking must tolerate poor connectivity and duplicate taps.

## 10. Scheduling and Appointment Detail

### Purpose

Show appointment status and next steps.

### Layout

- status timeline: requested, confirmed, ready to join, completed
- doctor or clinic assignment
- join button when available
- reschedule/cancel secondary actions

### Behavior

- appointment status transitions are explicit
- no hidden auto-complete
- offline cache shows freshness

### UX rationale

Timeline patterns reduce uncertainty.

## 11. Consultation Lobby

### Purpose

Prepare the user before the call.

### Layout

- appointment context
- camera/mic permission checks
- network quality indicator
- join with video
- join with audio
- send update if unable to join

### Behavior

- audio is available as a first-class option
- permission errors are actionable
- network weakness is visible

### UX rationale

The platform values care continuity over video quality.

## 12. Patient Consultation Room

### Purpose

Let patient or helper communicate with doctor during consult.

### Layout

- media area
- doctor identity and call state
- audio/video controls
- chat or note prompt
- connection status
- end/leave action

### Behavior

- fallback order: video, lower video, audio, async update
- call quality status uses text and color
- chat/message remains available if media fails

### Responsive

- mobile: media top, controls sticky, chat below
- tablet: media and chat side by side
- desktop: patient context and messages can be side panel

## 13. Doctor Consultation Room

### Purpose

Support clinical scanning, note-taking, and prescription creation without losing call context.

### Layout

- queue/appointment context
- media panel
- patient summary side panel
- notes panel
- vitals and records timeline
- prescription composer
- finish encounter action

### Behavior

- notes auto-save locally or server-side depending on connectivity
- summary uses record_version
- prescription remains patient-centric
- AI assistance can draft but requires review

### Responsive

- tablet: media plus patient/notes tabs
- desktop: three-pane layout

### UX rationale

Doctors need speed and context, not decorative patient cards.

## 14. Chat and Async Update

### Purpose

Provide fallback communication when media is weak.

### Layout

- conversation list
- voice note button
- photo/document attachment
- structured symptom prompt
- sent/saved/synced status

### Behavior

- saves message locally first
- marks pending sync
- supports attachments through storage adapter later

### UX rationale

Async fallback is required for realistic rural network conditions.

## 15. Medical Records Timeline

### Purpose

Show longitudinal patient history.

### Layout

- patient identity block
- filters: visits, vitals, allergies, medicines, documents
- timeline entries
- high-risk summaries pinned near top
- sync freshness

### Behavior

- observations are append-first
- allergies show conflict risk and version state
- records show source and entered-by where relevant

### UX rationale

Timeline supports continuity without overwriting old history.

## 16. Allergy and Medication Review

### Purpose

Handle high-risk clinical data carefully.

### Layout

- active allergies
- reaction/severity
- entered by
- last updated
- review conflict action if needed

### Behavior

- no silent overwrite
- explicit conflict resolution for overlapping edits
- provenance visible to staff

### UX rationale

High-risk records need stricter interaction than profile metadata.

## 17. Prescription View

### Purpose

Help patients and staff understand prescribed medicines and fulfillment status.

### Layout

- prescription summary
- medicine list
- dosage instructions
- pharmacy routing status
- partial fulfillment warnings
- download/share later action if implemented

### Behavior

- shows patient name clearly
- shows issued doctor
- shows pharmacy status timeline
- does not imply availability until pharmacy confirms

## 18. Medicine Availability Search

### Purpose

Show stock reality clearly.

### Layout

- medicine search
- result list by pharmacy
- available quantity
- batch/expiry summary where relevant
- last synced timestamp
- partial availability indicator

### Behavior

- distinguishes latest known inventory from guaranteed real-time stock
- supports alternate pharmacy selection

### UX rationale

This turns telemedicine into completed care rather than just advice.

## 19. Pharmacist Fulfillment Queue

### Purpose

Let pharmacists process prescriptions quickly.

### Layout

- tabs or segmented control: new, accepted, partial, ready
- prescription rows
- patient and medicine summary
- accept / partial / ready / dispensed actions

### Behavior

- batch-aware stock checks
- movement ledger is updated on dispense
- partial fulfillment is a normal path

## 20. Inventory and Batch Detail

### Purpose

Manage stock safely.

### Layout

- medicine list
- batch number
- expiry
- quantity on hand
- reserved quantity
- freshness timestamp
- receive/adjust/expire actions

### Behavior

- stock movement is append-only
- expiry warnings are visible
- adjustments require reason

## 21. Notifications Center

### Purpose

Centralize actionable updates.

### Layout

- grouped list: appointments, prescriptions, sync, system
- unread markers
- action buttons for relevant notifications

### Behavior

- works from cached notifications where possible
- avoids noisy alerts for non-urgent status changes

## 22. Sync Center

### Purpose

Make offline behavior understandable and support recovery.

### Layout

- overall sync badge
- pending queue
- failed operations
- conflicts requiring review
- last successful sync
- manual retry

### Behavior

- duplicate operation IDs are idempotent
- stale versions create explicit conflicts
- unsafe clinical conflicts require review

### UX rationale

Sync is a product feature, not background magic.

## 23. Conflict Resolution

### Purpose

Resolve data conflicts safely.

### Layout

- conflict summary
- local version
- server version
- affected field
- risk label
- resolution options
- audit/provenance note

### Behavior

- safe metadata may offer merge/choose latest
- allergies, medication changes, and summaries require explicit review
- resolution creates provenance

## 24. Profile and Settings

### Purpose

Manage identity, language, device, and privacy preferences.

### Layout

- profile summary
- language
- linked identifiers
- optional ABHA status
- guardian/contact metadata where relevant
- device/session controls
- consent settings

### Behavior

- ABHA link/unlink is optional
- phone change does not erase patient identity
- logout is prominent on shared-device contexts

## 25. Optional ABHA Linking

### Purpose

Allow future identity linkage without blocking care.

### Layout

- explanation
- current local identifier
- ABHA input/link action
- consent note
- skip/link later action

### Behavior

- ABHA is stored as patient identifier metadata
- core app remains usable without it

## 26. Admin Overview

### Purpose

Let administrators monitor operations.

### Layout

- active appointments
- failed sync count
- low stock count
- user activity
- audit shortcuts

### Behavior

- desktop-first but responsive
- avoids exposing clinical detail unless authorized

## Critical User Journeys

## Journey A: Adult Patient With Weak Network

1. Language selection
2. Patient OTP login
3. Patient home
4. Request care
5. Appointment detail
6. Consultation lobby
7. Consultation room with video to audio fallback
8. Prescription view
9. Medicine availability
10. Pharmacy fulfillment status

Key states:

- saved locally
- syncing
- weak video
- audio only
- stock freshness

## Journey B: Child or No-Phone Patient

1. Staff login
2. Assisted patient search
3. Create patient if needed
4. Add guardian/contact metadata
5. Capture symptoms and vitals
6. Book appointment
7. Doctor consults with guardian present
8. Prescription stored under child patient record
9. Guardian/contact notified if available

Key rule:

- guardian phone is contact metadata, not patient identity

## Journey C: ASHA Offline Home Visit

1. Staff opens app offline
2. Searches local patient cache
3. Records vitals and symptoms
4. App marks records as saved locally
5. Sync center shows pending operations
6. Later network returns
7. Push sync succeeds or conflict appears

Key states:

- cached patient list
- pending sync
- conflict review

## Journey D: Doctor Completes Consult

1. Doctor queue
2. Start consult
3. Review patient summary
4. Capture notes, observations, and allergies
5. Issue prescription
6. Finish encounter
7. Prescription routes to pharmacy

Key states:

- record version
- provenance
- AI-assisted draft requires review if enabled

## Journey E: Pharmacy Partial Fulfillment

1. Fulfillment queue
2. Open prescription
3. Check stock by batch
4. Mark partial
5. Route remaining medicine or show alternate pharmacy
6. Update stock movement ledger on dispense

Key states:

- partial fulfillment
- expiry
- freshness timestamp

## Figma Asset Map

The editable SVG mockups are in:

```text
ui_assets/telemedicine_ui_mockups.svg
```

The structured design map is in:

```text
ui_assets/figma_structure.json
```

Recommended Figma pages:

- 00 Foundations
- 01 Components
- 02 Mobile Patient
- 03 Assisted Care
- 04 Doctor
- 05 Pharmacy
- 06 Admin
- 07 Prototype Flows

## Implementation Notes

- Use React Router route groups matching the information architecture.
- Use Dexie repositories for local write paths before API sync.
- Keep API clients separate from UI components.
- Use shared components for status chips, sync badges, patient identity blocks, and timelines.
- Add automated accessibility checks before final visual polish.
- Verify mobile layouts before desktop polish.
