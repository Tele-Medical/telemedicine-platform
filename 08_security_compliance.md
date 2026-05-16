# Security, Privacy, and Compliance

## Why this matters

Healthcare systems handle highly sensitive personal data.

If your project ignores security and privacy, judges may see it as naive even if the UI looks polished.

You do not need to become a lawyer, but you do need to understand the major principles.

## Correcting the DISHA point

One of the most important things to know:

`DISHA` was a draft proposal, not the main current enacted healthcare-data law you should present as your primary legal foundation.

For a current India-focused project, your compliance framing should instead emphasize:

- `Digital Personal Data Protection Act, 2023`
- `Telemedicine Practice Guidelines, 2020`
- `ABDM` data-sharing and consent-oriented ecosystem expectations

You can mention DISHA as background, but do not speak as if DISHA is the active central law governing your implementation.

## Privacy basics you must know

### Personal data

Information that can identify a person directly or indirectly.

Examples:

- name
- phone number
- address
- identifiers

### Health data

Health information is highly sensitive.

Examples:

- symptoms
- diagnosis
- vitals
- allergies
- prescriptions

### Consent

Consent means the person understands and agrees to how their data will be used or shared.

In your product, consent is relevant for:

- registration
- consultation
- record sharing
- pharmacy routing

### Purpose limitation

Use data only for the purpose it was collected for.

Example:

If the patient gave data for consultation, do not casually reuse it for unrelated marketing or analytics.

### Data minimization

Collect only what is needed.

Do not ask for too much data at first contact if it is not necessary.

## Security basics you must know

## Authentication

This answers:

"Who are you?"

Examples:

- OTP login
- doctor credentials
- pharmacist account

## Authorization

This answers:

"What are you allowed to do?"

Examples:

- patient can see own records
- doctor can access assigned patient records
- pharmacist can only access prescription and inventory data relevant to fulfillment

## Role-based access control

Also called `RBAC`.

This means permissions are based on user role.

Common roles:

- patient
- doctor
- pharmacist
- health worker
- admin

## Audit log

An audit log records important system actions.

Examples:

- doctor viewed patient record
- pharmacist opened prescription
- admin changed user role

This is very important in healthcare.

## Encryption in transit

Data moving across the network should use `HTTPS` with `TLS`.

This protects data while it travels.

## Encryption at rest

Data stored on servers should be protected using storage or database encryption controls.

This protects data if disks or infrastructure are compromised.

## Session security

If you use JWTs or tokens, you must also think about:

- token expiry
- refresh flow
- revocation
- logout behavior
- stolen device risk

Token-based auth is not automatically secure just because it is modern.

## What telemedicine adds legally and operationally

Telemedicine is not just a video feature. It is a clinical interaction.

That means you must think about:

- identity of patient and clinician
- informed consent for teleconsultation
- documentation of the consultation
- prescription rules
- escalation when remote care is insufficient

The Indian Telemedicine Practice Guidelines are important here.

## Safe telemedicine product practices

Your system should support:

- patient consent capture
- doctor identity and credentials
- documentation of consultation
- clear follow-up instructions
- referral or escalation path for emergencies

## Data sharing with pharmacies

When routing a prescription to a pharmacy, share only what is needed for fulfillment.

The pharmacist usually needs:

- patient identifier sufficient for pickup
- prescribed medicines
- doctor prescription details

The pharmacist does not need unrestricted access to the full clinical history.

This is an example of least privilege.

## Least privilege

Each user or subsystem should get the minimum access needed to do its job.

This is a core security principle.

## Threats you should explicitly think about

### Shared phone access

A family member might open another person's app if sessions persist.

### Lost or stolen device

Offline records on device become a risk.

### Fake pharmacy or fake clinician access

Poor identity verification can expose records.

### QR misuse

If QR codes directly expose data, that is unsafe.

### Insecure media fallback

Using external messaging platforms casually may leak sensitive context or weaken data control.

## Practical controls for a competition MVP

You do not need enterprise perfection, but you should show serious design.

Recommended minimum controls:

- HTTPS everywhere
- role-based access control
- short-lived access tokens
- audit logging for record access
- server-side validation
- explicit consent screen
- device/session logout path
- data freshness and provenance markers

## Logging safely

Do not log full sensitive payloads casually.

Examples of risky logging:

- full prescription body
- full patient profile
- symptoms in plaintext logs

Logs should support debugging and audit without becoming a privacy leak themselves.

## Backups and disaster recovery

This is often ignored in student projects.

You should at least understand:

- database backup schedule
- restore testing
- what happens if a server fails

In healthcare, data availability matters too.

## Compliance language for your presentation

Use careful wording such as:

"We designed the system with privacy-by-design principles, consent-aware record access, role-based authorization, audit logging, and alignment with current Indian digital health and data-protection expectations rather than treating compliance as an afterthought."

That is much stronger than throwing around legal acronyms without accuracy.

## Common mistakes

### Mistake 1: saying "encrypted" without saying where

Always think separately about:

- in transit
- at rest
- on device

### Mistake 2: giving broad record access to every role

This is unsafe and unrealistic.

### Mistake 3: treating QR convenience as more important than privacy

Quick access must still be controlled.

## Key sources

- Digital Personal Data Protection Act, 2023: https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf
- Telemedicine Practice Guidelines: https://esanjeevani.mohfw.gov.in/assets/guidelines/Telemedicine_Practice_Guidelines.pdf
- ABDM overview: https://nha.gov.in/NDHM
- WHO Ethics and governance of AI for health: https://www.who.int/publications/i/item/9789240029200
