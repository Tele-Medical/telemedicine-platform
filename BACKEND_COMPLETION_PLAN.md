# Backend Completion & Production Readiness Plan

## Project Status Overview
- **Completed (Phases 0-10):** Core REST APIs, Patient Identity (ABHA-ready schema), Clinical Records, Pharmacy Ledger, and Version-based Sync Engine.
- **Current Stability:** 154 tests passing (100% success).
- **Remaining Focus:** Real-time orchestration (WebRTC), external infrastructure adapters, background operations, and automated delivery (CI/CD).

---

## Phase 11: Real-time Consultation Orchestration (Signaling)
*Goal: Enable the "Telemedicine" capability by allowing doctors and patients to establish peer-to-peer connections.*

- [x] **WebSocket signaling server:** Implement a stateful signaling service in `app/api/v1/telemetry.py` to handle "Offer/Answer" and "ICE Candidate" exchanges.
- [x] **Room Management Logic:** Develop logic to create, join, and secure consultation rooms based on `appointment_id` or `encounter_id`.
- [x] **Presence & Connection Tracking:** Implement heartbeat and presence logic to detect if a doctor or patient is online/offline in a room.
- [x] **Security & Authorization:** Ensure only the assigned doctor and patient for a specific `appointment_id` can access the signaling channel.
- [x] **Graceful Degradation Hooks:** Create server-side triggers to notify the UI when network stats indicate a fallback to "Audio-only" or "Async Message" is required.

## Phase 12: Production Infrastructure Adapters (Phase 11 Hardening)
*Goal: Replace local mock implementations with production-grade external service integrations.*

- **Object Storage (S3/Cloud):** Implement the `S3StorageProvider` for persistent clinical attachments (wound photos, prescription PDFs) with signed URL support for secure access.
- **SMS Callback Handling:** Implement webhook endpoints to receive delivery status reports from Twilio/SMS providers to track if prescriptions reached the patient.
- **ABDM Sandbox Adapter:** Build the `abdm_adapter.py` scaffolding to handle M1 (Identification), M2 (Health Records), and M3 (Sharing) handshakes with the NHA sandbox.
- **Notification Queue:** Implement a dedicated `NotificationService` that abstracts SMS, WebPush, and In-app alerts, ensuring business logic doesn't depend on specific vendors.

## Phase 13: Background Operations & Scaling
*Goal: Offload heavy or time-delayed tasks to ensure the main API remains responsive.*

- **Redis-based Task Queue:** Setup background jobs for non-blocking tasks (e.g., generating PDF prescriptions, bulk sync processing).
- **Inventory Shortage Alerts:** Implement a scheduled job that scans `StockBatch` levels and alerts the District Admin/Pharmacist of stockouts in Nabha.
- **Consent Expiry Handler:** Create a background worker that automatically updates the status of `Consent` records once their `expires_at` timestamp is reached.
- **Structured Logging:** Integrate `structlog` or a similar JSON-based logger to ensure logs are machine-readable for production monitoring.

## Phase 14: Advanced Verification & Security Hardening
*Goal: Ensure the system can withstand high load and potential security threats.*

- **Load Testing (Sync Engine):** Run performance scripts to simulate 50+ concurrent clients syncing 100+ mutations each to verify database deadlock resilience.
- **Security Audit Layer:** Implement automated dependency scanning (e.g., `safety`, `bandit`) and OWASP-aligned security middleware (CORS, HSTS, XSS protection).
- **PHI Access Auditing:** Verify that the `AuditService` logs every single read/export of sensitive patient data with Actor, IP, and User-Agent details.
- **Data Integrity Drills:** Perform a "Restore-from-Backup" drill to verify that PostgreSQL snapshots are reliable and the system can recover with zero data loss.

## Phase 15: CI/CD Pipeline & Automated Deployment
*Goal: Implement a "Push-to-Deploy" workflow that ensures every change is tested and deployed safely.*

- **CI (Continuous Integration):** Configure GitHub Actions to trigger on every Pull Request/Push:
    - **Linting:** Run `ruff check .` to ensure code style compliance.
    - **Type Checking:** Run `mypy app` to verify type safety.
    - **Testing:** Run `uv run pytest --cov=app` with a minimum 80% coverage gate.
    - **Security:** Run `bandit -r app` for static security analysis.
- **CD (Continuous Deployment):** Configure automated deployment to a production environment (e.g., Render, AWS, or DigitalOcean):
    - **Docker Build:** Multi-stage build to create a minimal production image.
    - **Auto-Migration:** Automatically run `alembic upgrade head` before the new container starts.
    - **Health Check Gate:** Verify `/health/ready` passes before routing traffic to the new version.
- **Staging Environment:** Implement a mirrored "Staging" environment for user acceptance testing (UAT) before changes reach production.

---

## Final Deliverable Checklist
- [ ] Working WebSocket Signaling for WebRTC.
- [ ] Production-ready Storage (S3) and SMS (Twilio/AWS) Adapters.
- [ ] Redis background job architecture.
- [ ] Production-optimized Dockerfile.
- [ ] Fully automated GitHub Actions CI/CD Pipeline.
- [ ] Final Operational Runbook (Deployment, Scaling, Disaster Recovery).
