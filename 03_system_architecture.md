# System Architecture

## Goal of the architecture

Your architecture must do three things at once:

1. work on weak networks
2. preserve health data safely
3. connect patients, clinicians, and pharmacies in one workflow

That means this is not just a frontend app plus backend API. It is a distributed healthcare workflow system.

## High-level architecture

Think of the platform as six layers:

1. Client apps
2. Offline data layer
3. Application backend
4. Real-time communication layer
5. Clinical and inventory data layer
6. Compliance and observability layer

## 1. Client apps

You will likely need at least three client experiences:

### Patient PWA

Features:

- register or assisted registration
- choose language
- request appointment
- join consultation
- see prescriptions
- check medicine availability

### Doctor web app

Features:

- appointment queue
- patient record view
- consultation controls
- note writing
- prescription generation

### Pharmacist portal

Features:

- stock entry
- prescription lookup
- fulfillment update
- low stock alerts

You may later add:

- ASHA worker companion app
- admin dashboard

## 2. Offline data layer

This is one of the most important parts.

In the browser, the correct offline data building blocks are usually:

- `IndexedDB` for structured local data
- `Cache Storage` for static app assets and selected responses
- `Service Worker` for offline behavior and caching

Do not confuse these roles.

### What goes where

Use `IndexedDB` for:

- patients
- visits
- queued writes
- prescriptions
- sync metadata

Use `Cache Storage` for:

- app shell
- icons
- CSS
- selected reference data

Use a `Service Worker` for:

- offline page behavior
- routing requests
- asset caching strategy
- optional background sync where supported

## 3. Application backend

The backend is your source of system-wide truth after sync.

Suggested responsibilities:

- authentication
- authorization
- patient and clinician management
- appointment orchestration
- record storage
- sync conflict handling
- prescription service
- inventory APIs
- notification service
- audit logging

FastAPI is a reasonable choice because:

- Python is productive
- async support is good
- API-first design is natural
- it is easy to demo and deploy

## 4. Real-time communication layer

Teleconsultation should be treated as a separate subsystem.

It usually includes:

- signaling server
- WebRTC peer connection setup
- ICE server configuration
- STUN
- TURN
- call state tracking

The signaling server is not the same thing as media transport.

### Important distinction

- signaling exchanges call setup messages
- WebRTC transports the actual audio and video

You need signaling to create and manage the call, but the media does not flow through your normal REST API.

## 5. Clinical and inventory data layer

Your persistent storage needs to cover two big domains.

### Clinical domain

Main entities:

- patient
- practitioner
- appointment
- encounter
- observation
- condition
- allergy
- medication request
- prescription
- consent
- audit event
- provenance

### Inventory domain

Main entities:

- pharmacy
- medicine master
- stock batch
- stock movement
- reorder request
- prescription fulfillment

This is why a clean database schema matters early.

## 6. Compliance and observability layer

Healthcare systems need more than "it works on my laptop."

You need:

- audit logs
- access logs
- consent records
- encryption
- error monitoring
- performance monitoring
- backup and recovery

Without these, your platform is not production-shaped.

## Recommended data flow

Here is the simplest mental model:

1. user performs action in app
2. app writes locally first when needed
3. UI updates immediately
4. sync engine tries to send to backend
5. backend validates and stores authoritative version
6. other clients receive updated state later

This is called an `offline-first with eventual sync` approach.

## Sync model

Your sync system should track:

- local record id
- server record id
- operation type: create, update, delete
- object type
- payload
- local timestamp
- actor id
- last known server version
- retry count
- sync status

Example statuses:

- pending
- syncing
- synced
- conflict
- failed

## Why versioning matters

When two people edit the same record, the server must know:

- what the client last saw
- what changed on the server since then
- whether the update is still safe to apply automatically

Without versioning, conflicts become invisible corruption.

## Suggested backend modules

Split the backend into clear modules:

### Auth module

- OTP login
- token refresh
- device/session management

### Patient records module

- patient profile
- encounters
- observations
- allergies
- medications

### Consultation module

- scheduling
- signaling
- consultation notes
- attachments

### Inventory module

- medicine master
- stock on hand
- stock movement
- fulfillment

### Sync module

- outbox intake
- version checks
- merge logic
- conflict reports

### Notification module

- SMS reminders
- medicine ready alerts
- missed appointment notices

### Audit/compliance module

- access logs
- consent logs
- admin traceability

## Storage choices

### Browser

- IndexedDB
- Cache Storage

### Server

- PostgreSQL as primary relational database
- Redis for caching, queues, rate-limiting, or ephemeral session state

PostgreSQL is a good fit because you need:

- relational integrity
- transactions
- indexing
- JSON support where useful

## Attachments and media

You may need:

- prescription PDFs
- wound images
- scanned documents
- audio notes

Do not store large binaries directly in every business table.

Use object storage or a dedicated file service and store references in the database.

## Security boundary thinking

Treat these as separate trust boundaries:

- patient device
- browser local storage
- backend API
- media path
- pharmacy portal
- admin dashboard

Every trust boundary needs explicit controls.

## Suggested MVP architecture

For a competition MVP, keep it pragmatic:

- React PWA frontend
- FastAPI backend
- PostgreSQL database
- Redis optional
- IndexedDB for offline local data
- Service worker for app shell/offline support
- WebRTC for calls
- coturn for TURN/STUN
- SMS gateway for OTP and notifications

That is enough to look serious without becoming impossible.

## Architecture mistakes to avoid

### Mistake 1: Making video the center of the product

Video is one feature. The system is bigger than the call.

### Mistake 2: Using local storage instead of IndexedDB for records

`localStorage` is too limited and synchronous.

### Mistake 3: Treating offline as cache only

Offline healthcare data is not just cached pages. It is structured, writable local data with sync semantics.

### Mistake 4: Forgetting operator workflows

Doctors and pharmacists need workflows optimized for speed, not just pretty UI.

## A simple architecture sentence for presentations

"Our system uses an offline-first PWA with IndexedDB and service workers on the client, a FastAPI backend with PostgreSQL as the source of truth, WebRTC with TURN/STUN for consultation, and a sync engine that safely reconciles patient records and pharmacy inventory under unstable connectivity."

## Key sources

- MDN IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN Service Worker API: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- MDN Cache: https://developer.mozilla.org/en-US/docs/Web/API/Cache
- web.dev PWA architecture: https://web.dev/learn/pwa/architecture
