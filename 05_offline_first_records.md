# Offline-First Health Records

## Why this pillar is non-negotiable

If a healthcare record system stops working when the network stops, it is not suitable for rural care.

That is why your system must be `offline first`.

Offline first means:

- users can still read important data without internet
- users can still create and update records without internet
- the app syncs changes later
- the user experience stays consistent

This is much deeper than just caching a few pages.

## Core concept: local-first write flow

Claude's key idea here is correct:

`every write should go locally first`

That means:

1. user submits a form
2. data is stored immediately in local IndexedDB
3. UI shows success or pending-sync state
4. sync engine later sends data to the backend

This pattern is often called:

- local-first
- offline-first
- outbox pattern
- sync queue pattern

## Main browser technologies you need

## IndexedDB

`IndexedDB` is the main browser database for structured local data.

Use it for:

- patient profiles
- visit notes
- vitals
- pending sync operations
- appointment drafts
- prescription drafts

Why not `localStorage`?

- too small
- synchronous
- poor structure
- unsuitable for serious offline data

## Service Worker

`Service Worker` is a background script that helps control offline behavior.

Use it for:

- app shell caching
- offline route handling
- optional sync assistance

Important correction:

Do not assume a service worker can always reliably finish background record sync by itself on every browser. It helps, but your app must also retry sync when it is open.

## Cache Storage

This stores cached network responses such as:

- app shell
- icons
- translations
- help content

It is not your primary database for health records.

## Outbox pattern

This is the most important implementation pattern in offline sync.

### What is an outbox?

An `outbox` is a local queue of changes waiting to be sent to the server.

Each outbox item usually contains:

- operation id
- entity type
- entity id
- action type
- payload
- created time
- actor id
- local version
- last known server version
- retry count
- status

### Example

A doctor edits a patient's blood pressure note while offline.

The app should:

1. update the local patient record
2. add an outbox entry like `update observation`
3. mark it as `pending`
4. later send it to backend
5. mark it `synced` or `conflict`

## Read path vs write path

You should design them separately.

### Read path

When user opens a patient record:

- load local version immediately
- if online, fetch newer server version
- merge or replace local snapshot safely

### Write path

When user edits:

- write locally first
- queue remote sync
- track version and actor

This separation keeps the app responsive even under bad connectivity.

## Sync engine responsibilities

Your sync engine must do more than "send pending items."

It should:

- detect connectivity return
- batch or sequence operations
- retry transient failures
- stop and surface permanent errors
- detect conflicts
- reconcile local and remote ids
- update sync state in UI

## Connectivity detection

Do not trust `navigator.onLine` alone as perfect truth.

It is useful, but not enough.

A better approach is:

- listen to browser online/offline signals
- periodically test API reachability
- treat sync success as the strongest proof of connectivity

## Conflict resolution

This is the hardest part.

## What is a conflict?

A `conflict` happens when:

- the local device edits a record based on an older version
- meanwhile the server or another device already changed that record

Now the system must decide how to combine or reject the new change.

## Why silent overwrite is dangerous

In healthcare, silent overwrite can lose:

- allergies
- medication changes
- abnormal vitals
- clinician notes

That is not just a technical bug. It is a safety risk.

## Conflict strategies

### 1. Last-write-wins

Very simple.

The newest update replaces the older one.

Pros:

- easy to implement

Cons:

- can destroy clinically important data
- poor auditability

Use only for low-risk fields such as:

- UI preferences
- cached display metadata

### 2. Field-level merge

If different fields changed, merge them.

Example:

- one device updates phone number
- another updates allergy list

These can often be merged safely.

### 3. Human review conflict

For risky data, mark the record as requiring review.

Example:

- doctor changed medicine dose
- another update changed medicine list

Do not auto-merge blindly.

### 4. Append-only clinical notes

For many narrative notes, it is safer to append new entries than overwrite old ones.

## Recommended practical strategy for this project

For a competition MVP, use this hybrid approach:

### Auto-merge safe fields

- contact details
- appointment status
- language preference

### Append structured clinical events

- observations
- visit notes
- prescriptions

### Escalate dangerous direct conflicts

- allergy edits
- diagnosis edits
- medication changes

This is much more defensible than global last-write-wins.

## Versioning

Every important record should have version metadata.

Common fields:

- `version_id`
- `updated_at`
- `updated_by`
- `source_device_id`

When client syncs an update, it should tell the server:

- "I edited version 7"

If server is already on version 9, the server knows this is a stale-base update and must check conflict rules.

## Provenance and auditability

Healthcare data should answer:

- who changed it
- when
- from which role or device
- why

This is where concepts like `Provenance` and `AuditEvent` matter.

Even if your MVP does not implement full FHIR versions of these, you should imitate the idea.

## Tombstones and delete handling

Deleting records in offline sync is tricky.

Often, instead of hard delete, use:

- soft delete
- archive flag
- inactive status

Why?

Because another device may still reference that record.

## Sync triggers

Try sync when:

- app launches
- user logs in
- connectivity appears restored
- screen regains focus
- a manual "sync now" action is pressed

Do not depend on only one trigger.

## UI states the user should see

This is an overlooked but important part.

Users should know whether data is:

- saved locally
- syncing
- synced
- conflicted
- failed

If the app hides these states, users lose trust.

## Example sync architecture

### Local tables or stores

- `patients`
- `encounters`
- `observations`
- `prescriptions`
- `sync_outbox`
- `sync_state`

### Server APIs

- `POST /sync/push`
- `GET /sync/pull?since=cursor`
- `POST /sync/resolve-conflict`

This keeps sync logic explicit.

## Push and pull

Your system needs both:

### Push

Send local changes to the server.

### Pull

Get remote changes from the server.

If you only push and never pull properly, local data goes stale.

## Cursor-based sync

Use a `cursor` or `last_synced_at` marker so the client can ask:

- "Give me everything changed since my last successful sync"

This is much more efficient than re-downloading everything.

## Data minimization

Offline-first does not mean download every record onto every device.

Only keep what the user truly needs.

Examples:

- doctor gets records for today's assigned patients
- ASHA worker gets records for her village list
- pharmacist gets prescriptions relevant to that pharmacy

This reduces:

- privacy risk
- storage use
- sync cost

## Security concerns for offline records

Because records are stored on device, you must think about:

- device theft
- shared phones
- browser session leakage
- logout behavior
- local encryption feasibility

At minimum, use:

- short sessions
- role-based access
- device lock expectation
- careful logout and cache clearing policies

## Common beginner mistakes

### Mistake 1: "Offline" means only cached HTML

That is not enough for writable healthcare workflows.

### Mistake 2: No conflict model

If you do not design conflict behavior early, the system becomes unsafe later.

### Mistake 3: Directly writing to server and hoping retry works

That defeats the whole purpose of offline-first.

## Best sentence for your presentation

"Our record system is local-first: every clinical write goes to IndexedDB immediately, enters a sync outbox, and is later reconciled with the server using explicit version checks, audit history, and conflict handling instead of silent overwrite."

## Key sources

- MDN IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN Background Sync: https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API
- MDN Service Worker: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- web.dev IndexedDB and storage: https://web.dev/learn/pwa/offline-data
- HL7 FHIR Provenance: https://hl7.org/fhir/R4/provenance.html
- HL7 FHIR AuditEvent: https://hl7.org/fhir/R4/auditevent.html
