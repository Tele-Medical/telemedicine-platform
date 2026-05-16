# Backend Detailed Build Phase Plan

## Purpose

This document is the **execution plan** for building the backend from zero.

Unlike `backend_implementation_plan.md`, which explains what the backend must support, this file explains:

- what to build first
- what folders to create
- what packages to install
- what code to write in each phase
- what endpoints and modules to finish before moving ahead

This is written as a practical implementation guide.

---

## Assumptions

- **Test-Driven Development (TDD) is mandatory for all phases** (write failing tests before implementation).
- Backend stack: `FastAPI + PostgreSQL + SQLAlchemy + Alembic + Pydantic + Redis`
- Architecture: modular monolith
- Patient login: OTP-based
- Staff login: username/email + password
- ABHA: optional linkage, not mandatory for MVP
- Offline sync support: required
- Core business flow:
  `patient/worker registration -> appointment -> encounter -> records -> prescription -> pharmacy fulfillment`

---

## Build order

Build the backend in this order:

1. project bootstrap
2. database and migrations
3. auth and identity
4. patient and practitioner core
5. appointments and encounters
6. clinical records
7. sync engine
8. pharmacy and prescriptions
9. audit, consent, provenance
10. AI support hooks
11. hardening and test coverage

Do not start by building every endpoint randomly.

---

## Phase 0: Project Bootstrap

## Goal

Create a clean backend skeleton that can scale without becoming a mess.

## Exact tasks

### 1. Initialize local infrastructure

Create a `docker-compose.yml` file in the root directory to run PostgreSQL and Redis locally. Start them with `docker-compose up -d`. Note: The FastAPI server will run on your host machine to allow fast code reloading.

### 2. Create backend folder structure

```text
backend/
├── app/
│   ├── main.py
│   ├── core/
│   ├── api/
│   ├── domain/
│   ├── models/
│   ├── schemas/
│   ├── repositories/
│   ├── services/
│   ├── integrations/
│   └── jobs/
├── migrations/
├── tests/
├── pyproject.toml
├── alembic.ini
├── .env.example
└── Dockerfile
```

### 2. Initialize Python project

Run the following command inside the `backend/` directory:

```bash
uv init
```

`uv` will automatically manage your virtual environment and dependencies.

### 3. Install dependencies

Run these commands to add the necessary packages to your `pyproject.toml` and create a `uv.lock` file:

```bash
# Add runtime dependencies
uv add fastapi uvicorn sqlalchemy alembic "psycopg[binary]" pydantic pydantic-settings python-jose "passlib[bcrypt]" python-multipart redis httpx

# Add development dependencies
uv add --dev pytest pytest-asyncio pytest-cov ruff mypy
```

### 4. Create `pyproject.toml`

`uv init` creates this for you. Ensure it includes the following (uv will manage most of this):

```toml
[project]
name = "telemedicine-backend"
version = "0.1.0"
requires-python = ">=3.12"

[tool.ruff]
line-length = 100

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

### 5. Create initial app entrypoint

File: `backend/app/main.py`

```python
from fastapi import FastAPI

app = FastAPI(title="Telemedicine Backend", version="0.1.0")


@app.get("/health/live")
async def live():
    return {"status": "ok"}
```

### 6. Run the server

```bash
uv run uvicorn app.main:app --reload
```

## Done when

- backend folder exists
- FastAPI app starts via `uv run`
- `/health/live` returns `200`
- `uv.lock` is generated


---

## Phase 1: Core Infrastructure Setup

## Goal

Create the reusable backend foundation before building business features.

## Folders to create

```text
backend/app/core/
backend/app/api/
backend/app/api/v1/
backend/app/models/
backend/app/schemas/
backend/app/repositories/
backend/app/services/
```

## Files to create

```text
app/core/config.py
app/core/database.py
app/core/security.py
app/core/logging.py
app/api/deps.py
app/api/router.py
```

## Exact tasks

### 1. Add settings management

File: `app/core/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str
    redis_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_exp_minutes: int = 30
    refresh_token_exp_minutes: int = 60 * 24 * 7

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
```

### 2. Add database engine and session

File: `app/core/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()
```

### 3. Add dependency for DB sessions

File: `app/api/deps.py`

```python
from collections.abc import Generator
from app.core.database import SessionLocal


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 4. Add API router root

File: `app/api/router.py`

```python
from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")
```

### 5. Mount the router in `main.py`

```python
from fastapi import FastAPI
from app.api.router import api_router

app = FastAPI(title="Telemedicine Backend", version="0.1.0")
app.include_router(api_router)
```

### 6. Create `.env.example`

```env
APP_ENV=development
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/telemedicine
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=change-me
```

## Done when

- settings load from env
- DB session dependency works
- API base path `/api/v1` is ready

---

## Phase 2: Database, Alembic, and Base Models

## Goal

Set up migrations and create the first schema foundations.

## Exact tasks

### 1. Initialize Alembic

```bash
cd backend
alembic init migrations
```

### 2. Configure `alembic.ini`

Set DB URL or wire it through `env.py`.

### 3. Update `migrations/env.py`

Import your metadata:

```python
from app.core.database import Base
target_metadata = Base.metadata
```

### 4. Create model groups in this order

1. auth and identity
2. patient
3. practitioner
4. appointments and encounters
5. clinical records
6. inventory and prescriptions
7. audit and consent

### 5. First models to write

Files:

```text
app/models/auth.py
app/models/patient.py
app/models/practitioner.py
```

Example: `app/models/patient.py`

```python
from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
import uuid
from datetime import datetime

from app.core.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    preferred_language: Mapped[str] = mapped_column(String, default="pa")
    date_of_birth: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str] = mapped_column(String, default="unknown")
    village: Mapped[str | None] = mapped_column(String, nullable=True)
    address_text: Mapped[str | None] = mapped_column(String, nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String, nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String, nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    record_version: Mapped[int] = mapped_column(BigInteger, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
```

### 6. Generate first migration

```bash
alembic revision --autogenerate -m "create auth and patient tables"
alembic upgrade head
```

## Important rule

Do not build many features before migrations work properly.

## Done when

- Alembic works end-to-end
- base tables exist in PostgreSQL
- migrations are reproducible

---

## Phase 3: Auth and Identity

## Goal

Build authentication, session handling, and ABHA-ready patient identity.

## Exact tasks

### 1. Create folders

```text
app/domain/auth/
app/domain/identity/
app/schemas/auth.py
app/schemas/identity.py
app/services/auth_service.py
app/services/identity_service.py
app/api/v1/auth.py
app/api/v1/patients.py
```

### 2. Add auth-related tables

- `users`
- `roles`
- `user_roles`
- `sessions`
- `otp_challenges`
- `device_registrations`
- `patient_identifiers`

### 3. Implement OTP request endpoint

```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])


class OTPRequestIn(BaseModel):
    phone: str


@router.post("/request-otp")
async def request_otp(payload: OTPRequestIn):
    return {"message": "OTP requested"}
```

### 4. Implement OTP verify endpoint

Responsibilities:

- verify OTP
- create/find patient-linked user if needed
- create session row
- return access token + refresh token

### 5. Implement staff login

Endpoint:

```http
POST /api/v1/auth/staff/login
```

Responsibilities:

- verify password
- load staff roles
- create session row
- return JWTs

### 6. Implement JWT utilities

In `app/core/security.py`:

- token creation
- token decoding
- refresh token rotation

### 7. Implement identity model correctly

Patient identity must support:

- internal patient ID
- optional ABHA ID
- future external IDs
- no-phone patients
- child patients with guardian contact

### 8. Add patient identifier endpoints

```http
GET  /api/v1/patients/{id}/identifiers
POST /api/v1/patients/{id}/identifiers
POST /api/v1/patients/{id}/link-abha
POST /api/v1/patients/{id}/unlink-abha
```

## Done when

- patient OTP login works
- staff login works
- roles are enforced
- patient identity is not tied only to phone number

---

## Phase 4: Patient and Practitioner Core

## Goal

Build the base record system for patient profiles and practitioner lookup.

## Exact tasks

### 1. Add schemas

Files:

```text
app/schemas/patient.py
app/schemas/practitioner.py
```

Example:

```python
from pydantic import BaseModel
from uuid import UUID


class PatientCreate(BaseModel):
    full_name: str
    phone: str | None = None
    preferred_language: str = "pa"
    guardian_name: str | None = None
    guardian_phone: str | None = None
```

### 2. Add repository layer

Files:

```text
app/repositories/patient_repo.py
app/repositories/practitioner_repo.py
```

Responsibilities:

- create patient
- get patient
- update patient
- search patient

### 3. Add service layer

Files:

```text
app/services/patient_service.py
app/services/practitioner_service.py
```

Responsibilities:

- business validation
- duplicate checks
- linkage logic

### 4. Add routes

```http
GET    /api/v1/patients/{id}
POST   /api/v1/patients
PATCH  /api/v1/patients/{id}
GET    /api/v1/patients?query=...
GET    /api/v1/practitioners/{id}
```

### 5. Support assisted registration

This must work for:

- child patient
- elderly patient
- patient without phone

Rule:

- guardian phone is contact metadata
- patient remains separate patient record

## Done when

- patient creation works with and without phone
- search works
- practitioner records are retrievable

---

## Phase 5: Appointments and Encounters

## Goal

Build the core consultation lifecycle.

## Exact tasks

### 1. Add models

- `appointments`
- `encounters`
- `encounter_participants`
- `consultation_notes`

### 2. Add schemas

```text
app/schemas/appointment.py
app/schemas/encounter.py
```

### 3. Add routes

```http
POST  /api/v1/appointments
GET   /api/v1/appointments
PATCH /api/v1/appointments/{id}
POST  /api/v1/encounters
GET   /api/v1/encounters/{id}
POST  /api/v1/encounters/{id}/summary
```

### 4. Business rules

- appointment and encounter are separate concepts
- one appointment may create one encounter
- encounter mode must support:
  - video
  - audio
  - async
- assisted actor can create encounter, but patient remains the owner

### 5. Add minimal code skeleton

```python
@router.post("/appointments")
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    return appointment_service.create(db, payload)
```

## Done when

- appointment booking works
- encounter creation works
- consultation summary can be stored

---

## Phase 6: Clinical Records

## Goal

Store actual medical details in a structured and auditable way.

## Exact tasks

### 1. Add models

- `observations`
- `conditions`
- `allergies`
- `attachments`
- `medication_requests`

### 2. Add endpoints

You can either expose separate route files or nest them under encounters/patients.

Suggested:

```http
POST /api/v1/observations
POST /api/v1/conditions
POST /api/v1/allergies
POST /api/v1/medication-requests
POST /api/v1/uploads
```

### 3. High-risk rules

- allergies need explicit audit trail
- medication changes need provenance
- observations should be append-first

### 4. Add provenance hooks

Every high-risk write should produce provenance metadata:

- who changed it
- when
- from which device
- whether it was AI-assisted

## Done when

- doctor can record clinical notes and vitals
- allergies and medication requests are stored safely

---

## Phase 7: Offline Sync Backend

## Goal

Support offline-first clients safely.

## Exact tasks

### 1. Add sync routes

```http
POST /api/v1/sync/push
GET  /api/v1/sync/pull?cursor=...
POST /api/v1/sync/conflicts/{id}/resolve
```

### 2. Add sync schemas

File: `app/schemas/sync.py`

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class SyncOperation(BaseModel):
    operation_id: UUID
    entity_type: str
    entity_id: UUID
    action: str
    base_version: int
    payload: dict
    actor_user_id: UUID
    device_id: UUID
    created_at: datetime
```

### 3. Add sync service

File: `app/services/sync_service.py`

Responsibilities:

- validate operation
- dedupe by operation ID
- check base version
- apply mutation
- emit conflict if unsafe
- return new cursor

### 4. Add conflict storage

If conflicts become complex, you may add a dedicated `sync_conflicts` table.

For MVP, conflict metadata may be returned dynamically if simpler.

### 5. Conflict rules

- safe metadata can merge
- allergy conflicts must not silently overwrite
- medication conflicts must not silently overwrite
- encounter summary conflicts should require review

## Done when

- offline-created record can sync later
- duplicate operation IDs are idempotent
- stale version conflicts are visible

---

## Phase 8: Prescriptions, Pharmacy, and Inventory

## Goal

Complete the care journey after the consultation.

## Exact tasks

### 1. Add models

- `prescriptions`
- `prescription_items`
- `medicine_catalog`
- `stock_batches`
- `stock_movements`
- `fulfillments`
- `reorder_requests`

### 2. Add endpoints

```http
POST /api/v1/prescriptions
GET  /api/v1/prescriptions/{id}
GET  /api/v1/pharmacies/availability?medicine=...
POST /api/v1/inventory/stock-intake
POST /api/v1/inventory/stock-adjustment
POST /api/v1/fulfillments/{id}/accept
POST /api/v1/fulfillments/{id}/dispense
```

### 3. Business rules

- medicine lookup goes through normalized `medicine_catalog`
- stock is batch-aware
- stock movement is append-only
- availability is latest known truth, not magic certainty
- fulfillment can be partial

### 4. Important service functions

- `create_prescription`
- `search_available_pharmacies`
- `record_stock_intake`
- `record_stock_adjustment`
- `accept_fulfillment`
- `dispense_fulfillment`

## Done when

- doctor can generate prescription
- pharmacy can accept and dispense
- inventory reflects changes safely

---

## Phase 9: Consent, Audit, and Provenance

## Goal

Make the backend trustworthy and ABHA-ready.

## Exact tasks

### 1. Add models

- `consents`
- `provenance_events`
- `audit_events`

### 2. Add endpoints

```http
GET  /api/v1/patients/{id}/consents
POST /api/v1/patients/{id}/consents
```

### 3. Add audit capture points

Log:

- login
- record access
- sensitive edits
- prescription actions
- fulfillment status changes

### 4. Add provenance capture points

Track:

- actor
- entity
- action
- device
- metadata

## Done when

- sensitive operations are traceable
- consent is recorded
- future ABHA integration remains practical

---

## Phase 10: Attachments, Notifications, and External Adapters

## Goal

Connect the backend to real external behaviors without coupling business logic to vendors.

## Exact tasks

### 1. Create integration folders

```text
app/integrations/sms/
app/integrations/storage/
app/integrations/ai/
app/integrations/abdm/
```

### 2. Add interfaces/adapters

Examples:

- `sms_provider.py`
- `storage_provider.py`
- `ai_provider.py`
- `abdm_adapter.py`

### 3. Use mock-first design

Start with:

- mock SMS sender
- local/mock storage
- mock AI

Then swap providers later.

## Done when

- backend can run locally without real vendor dependency
- provider code is isolated from business modules

---

## Phase 11: Testing and Hardening

## Goal

Make the backend stable enough for end-to-end integration.

## Exact tasks

### 1. Create test folders

```text
tests/unit/
tests/integration/
tests/contract/
```

### 2. Add minimum test suites

#### Auth tests

- OTP request
- OTP verify
- staff login
- token refresh
- logout

#### Identity tests

- patient without phone
- child patient with guardian contact
- duplicate patient identifier rejection
- ABHA optional linkage

#### Workflow tests

- create appointment
- create encounter
- create observation
- issue prescription
- accept fulfillment
- dispense medicine

#### Sync tests

- duplicate operation ID replay
- conflict handling
- cursor progression

### 3. Add lint and format commands

```bash
uv run ruff check .
uv run mypy app
uv run pytest
```

## Done when

- core routes are covered
- no major workflow breaks on refactor

---

## Phase 12: Local Dev and Deployment Readiness

## Goal

Make the backend easy to run locally and ship to the cloud.

## Exact tasks

### 1. Finalize Dockerfile for Deployment

This Dockerfile is specifically for building the production container to run on services like Render.

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir -e .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Define Cloud Provisioning Requirements

Document the exact managed cloud services needed for production (e.g., Render Postgres, Upstash Redis) to ensure production URLs are separated from local development.

### 3. Add health endpoints

```http
GET /health/live
GET /health/ready
```

### 4. Add seed scripts

Seed:

- roles
- sample doctor
- sample pharmacist
- sample pharmacy
- sample medicine catalog

## Done when

- backend runs via Docker
- DB is migratable
- local demo data is available

---

## Recommended milestone checkpoints

## Milestone 1

Complete:

- bootstrap
- DB
- auth
- identity

You should then be able to:

- start backend
- log in patient
- log in staff
- create patients

## Milestone 2

Complete:

- appointments
- encounters
- clinical records

You should then be able to:

- register patient
- book consultation
- create encounter
- save medical records

## Milestone 3

Complete:

- sync
- prescription
- pharmacy

You should then be able to:

- create records offline on frontend
- sync them to backend
- generate prescription
- fulfill medicine

## Milestone 4

Complete:

- consent
- audit
- AI hooks
- tests
- Docker

You should then have a backend that is serious enough for MVP integration.

---

## Final rule

Do not move to the next backend phase just because code exists.

Move only when:

- the schema is stable for that phase
- endpoints are testable
- business rules are enforced
- edge cases for that phase are understood

For this project, **correctness of workflow is more important than speed of endpoint creation**.
