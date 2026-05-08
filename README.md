# Rural Telemedicine Platform

A low-bandwidth, offline-first, multilingual telemedicine platform designed for rural healthcare delivery in India. This platform is built to be ABHA-ready and focuses on preserving consultation continuity on weak networks.

---

## 🏛️ Project Architecture

This repository is a monorepo containing both the frontend and backend services. 

*   **Backend:** A Domain-Driven **Modular Monolith** built with **FastAPI**.
*   **Database:** **PostgreSQL** (System of Record) using SQLAlchemy & Alembic.
*   **Cache/Sessions:** **Redis**.
*   **Frontend:** React + TypeScript Progressive Web App (PWA) with IndexedDB for offline-first sync (Documentation coming soon).
*   **Real-Time:** WebRTC with WebSocket signaling for teleconsultations.

*Note: For deep architectural reasoning, please refer to the `ADR.md` and the `docs/` folder in the root directory.*

---

## ⚙️ Backend Development Setup

The backend utilizes a **"Cloud-Targeted, Local Docker"** strategy. 
*   **Infrastructure:** PostgreSQL and Redis run locally via `docker-compose` to ensure a consistent environment across the team.
*   **Server:** The FastAPI Python application runs directly on your host machine to allow for blazing-fast hot-reloading during development.

### Prerequisites
Before you begin, ensure you have the following installed on your machine:
1.  **Docker Desktop** (or OrbStack/Colima) - For running the DB and Redis.
2.  **Python 3.12+**
3.  **uv** (Recommended) or `pip` - For Python package management.
4.  **Git**

### 1. Local Infrastructure Setup (Database & Cache)
You do not need to install PostgreSQL or Redis on your laptop. Docker will handle it via the provided `docker-compose.yml` file.

1. Navigate to the project root (`telemedicine-platform`).
2. Start the local infrastructure in the background:
   ```bash
   docker-compose up -d
   ```
3. **Test and Verify the Services:**
   Check if the containers are running and healthy by running:
   ```bash
   docker-compose ps
   ```
   *You should see both `db` and `redis` with a status of `Up (healthy)`.*

   If you want to view the logs to ensure there are no errors:
   ```bash
   docker-compose logs -f
   ```
   *(Press `Ctrl+C` to exit the logs)*

4. *(To stop and remove the databases later, run `docker-compose down`. If you want to wipe the database data entirely, run `docker-compose down -v`)*

### 2. Python Environment Setup
1. Navigate into the `backend/` directory:
   ```bash
   cd backend
   ```
2. Initialize and Install dependencies:
   `uv` handles environment creation and package installation in one step.
   ```bash
   uv sync
   ```
   *Note: If you need to add a new package, use `uv add <package_name>`.*

### 3. Environment Variables
Create a `.env` file inside the `backend/` folder. Use the following defaults for local development:

```env
# backend/.env
APP_ENV=development
# Points to your local Docker container
DATABASE_URL=postgresql+psycopg://postgres:localpassword@localhost:5432/telemedicine
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=super-secret-local-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXP_MINUTES=30

# Mock Integrations for Dev
SMS_PROVIDER=mock
AI_PROVIDER=mock
```

### 4. Database Migrations
Before running the server, ensure your local Docker database has the correct tables.
1. Make sure you are in the `backend/` directory.
2. Apply the latest migrations via `uv run`:
   ```bash
   uv run alembic upgrade head
   ```

### 5. Running the Local Server
Start the FastAPI application via `uv run` with hot-reloading enabled:

```bash
uv run uvicorn app.main:app --reload
```

The API will be available at: `http://localhost:8000`
Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`

---

## 📁 Backend Directory Structure (Modular Monolith)

The backend is strictly organized by business domains, not just file types.

```text
backend/app/
├── api/             # HTTP transport layer (Routers & Dependencies)
├── core/            # App-wide config, security, and DB session logic
├── domain/          # Business logic, grouped by feature area
│   ├── auth/        # Login, OTP, JWTs
│   ├── identity/    # Patient identifiers, ABHA linkage
│   ├── clinical/    # Observations, Allergies, Encounters
│   ├── sync/        # Offline-first outbox reconciliation engine
│   └── pharmacy/    # Inventory, Prescriptions
├── integrations/    # Third-party adapters (SMS, Storage, AI, ABDM)
├── models/          # SQLAlchemy Declarative Models (DB Schema)
├── schemas/         # Pydantic Models (Request/Response validation)
└── services/        # The "Heart" - Core business logic orchestrators
```

---

## 🤝 Team Workflow & Branching Strategy

To keep the `main` branch stable, the team must follow the **Feature Branch Workflow**.

1.  **Never push directly to `main`.**
2.  Update your local main: `git checkout main && git pull`
3.  Create a branch for your task: `git checkout -b feature/auth-endpoints` or `bugfix/sync-conflict`
4.  Write code, test locally, and commit.
5.  Push your branch: `git push origin feature/auth-endpoints`
6.  Open a **Pull Request (PR)** on GitHub.
7.  Require at least 1 team member to review and approve the PR before merging.

### Code Quality Standards
Before committing backend code, ensure you run the linting and typing checks via `uv run`:
```bash
uv run ruff check .
uv run mypy app
uv run pytest
```

---

## 🌐 Production Deployment

The `docker-compose.yml` is **strictly for local development.** 

For production (e.g., Render), the application is deployed using the `backend/Dockerfile`. The production environment will utilize Managed Cloud PostgreSQL and Managed Cloud Redis, isolating production patient data entirely from development environments. 

*(Deployment pipelines and CI/CD instructions will be added here in Phase 13)*

---

*Frontend documentation will be appended below during the PWA development phase.*