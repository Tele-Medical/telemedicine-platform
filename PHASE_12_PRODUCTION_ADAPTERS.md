# Phase 12: Production Infrastructure Adapters

## Executive Summary
Phase 12 transitions the telemedicine platform from a functional prototype to a production-ready system capable of securely interacting with the outside world. The goal is to replace all mock, local, or placeholder integrations with secure, scalable, and resilient external services. 

Because we are building for rural Nabha, where network conditions are unstable, these adapters must handle timeouts, retries, and offline queuing gracefully. Furthermore, to adhere to Indian healthcare standards, this phase lays the final groundwork for ABHA (ABDM) integration.

---

## 1. Secure Object Storage (S3 Adapter)
*Currently, clinical attachments (wound photos, scanned old records, prescription PDFs) might rely on local disk storage or mock providers. In a distributed cloud environment, this must be centralized.*

### Key Objectives:
*   **Implement `S3StorageProvider`:** Connect to AWS S3, DigitalOcean Spaces, or an equivalent S3-compatible blob storage.
*   **Security & PHI Protection:** Healthcare files cannot be publicly accessible. The adapter must generate **Temporary Signed URLs** (e.g., valid for 15 minutes) when a doctor requests to view an attachment.
*   **Bandwidth Optimization:** Implement client-side or server-side compression hooks before uploading large images, crucial for patients on 2G/3G networks.

### Action Items:
- [ ] Create `app/integrations/storage/s3_provider.py`.
- [ ] Implement `upload_file(file_stream, path)` with strict MIME-type validation.
- [ ] Implement `get_signed_url(path, expiration_seconds)`.
- [ ] Update `Clinical` and `Patient` API endpoints to use the new adapter.

---

## 2. SMS Reliability & Webhook Callbacks
*We already have a Twilio provider, but currently, it uses a "fire and forget" model. We must know definitively if a prescription alert reached a patient without a smartphone.*

### Key Objectives:
*   **Delivery Tracking:** Implement a webhook endpoint to receive asynchronous delivery status updates (e.g., `Queued`, `Sent`, `Delivered`, `Failed`) from Twilio or our chosen SMS gateway.
*   **Fallback Logic:** If a critical SMS (like an appointment cancellation) fails, automatically notify the assigned ASHA worker or trigger an alternative notification path.
*   **Audit Logging:** Log the final delivery status of all SMS communications in the `AuditEvent` table for compliance.

### Action Items:
- [ ] Create a public webhook endpoint: `POST /api/v1/webhooks/sms/status`.
- [ ] Update the `OTPChallenge` and `Appointment` models/tables to store external `message_sid` and `delivery_status`.
- [ ] Write logic to parse the webhook payload and update the database safely.

---

## 3. ABDM / ABHA Sandbox Handshake (Identity & Interoperability)
*To become an officially certified Indian telemedicine platform, the system must interface with the National Health Authority (NHA).*

### Key Objectives:
*   **M1 Milestone (Identification):** Build the adapter to interact with the ABHA Sandbox API to generate or verify a 14-digit ABHA number using Aadhaar OTP or Mobile OTP.
*   **Consent Management Linking:** Connect our internal `Consent` model (Phase 9) to the external ABDM Consent Manager architecture.
*   **Isolation:** Ensure that the core platform can still function completely independently of ABHA (for patients who opt-out or when the NHA servers are down).

### Action Items:
- [ ] Create `app/integrations/abdm/sandbox_client.py`.
- [ ] Implement gateway token generation (OAuth with NHA).
- [ ] Implement `verify_abha_address(abha_id)` and `request_abha_otp(method)`.
- [ ] Document the sandbox environment variables (`ABDM_CLIENT_ID`, `ABDM_CLIENT_SECRET`).

---

## 4. Unified Notification Service
*Business logic (like "Booking an Appointment") should not directly call the Twilio SDK. It should call a central notification orchestrator.*

### Key Objectives:
*   **Abstraction:** Create a service that accepts a user and a message, and automatically determines the best routing.
*   **Omnichannel Support:** Lay the architecture for SMS, Email, and future Web Push (PWA) notifications.
*   **Templating:** Centralize message templates (e.g., "Your appointment is confirmed for {time}") so they can be easily translated into Punjabi/Hindi before sending.

### Action Items:
- [ ] Create `app/services/notification_service.py`.
- [ ] Implement a `dispatch_alert(user_id, event_type, context_data)` method.
- [ ] Integrate Jinja2 or simple Python formatting for multi-lingual message templates.

---

## Technical Debt & Testing
Before closing this phase, the adapters must be rigorously tested.
- [ ] Write integration tests for the `S3StorageProvider` using `moto` (mock boto3).
- [ ] Write unit tests for the SMS Webhook parser to ensure it rejects unauthenticated payloads (preventing malicious status updates).
- [ ] Ensure all new secret keys are properly typed and validated in `app/core/config.py` using `pydantic-settings`.