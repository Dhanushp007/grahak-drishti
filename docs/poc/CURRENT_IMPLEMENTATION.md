# GRAHAK-DRISHTI Current Implementation

**Status:** Current implementation reference
**As of:** 2026-08-29
**Repository state:** `main` after PR #20
**Product:** Consumer intelligence and escalation layer for India's consumer-protection ecosystem

This document describes what is implemented in the repository today. It separates working proof-of-concept behavior from partial implementations, scaffolding, and future architecture. It does not claim production readiness, legal verification, live government integration, or official statistics.

## 1. Executive Summary

GRAHAK-DRISHTI is a browser-accessible proof of concept that transforms private consumer complaints into structured, aggregate issue intelligence.

The working demonstration supports:

1. A citizen submits a complaint and receives a docket immediately.
2. The complaint is stored with a privacy-protected contact digest and an outbox event.
3. A local polling worker processes the event asynchronously.
4. Deterministic rules classify the complaint and generate advisory intelligence.
5. Duplicate candidates are compared using text similarity and complaint metadata.
6. The complaint is associated with an aggregate issue cluster.
7. Citizens can browse public issue signals without seeing individual case data.
8. A citizen can start an `I experienced this too` corroboration flow.
9. Evidence metadata or a real supported upload is recorded before the signal is counted.
10. An analyst dashboard shows aggregate issues, synthetic KPIs, geography, evidence counts, and advisory routing.

The central privacy boundary is:

```text
Private complaint and contact data
        |
        | processing and aggregation
        v
Public aggregate issue intelligence
```

Individual names, email addresses, phone numbers, addresses, order IDs, complaint narratives, and private evidence are not returned by the public issue or dashboard projections.

## 2. Repository Organization

The repository follows the intended top-level boundaries:

```text
apps/          Next.js citizen and analyst applications
services/      FastAPI API, AI modules, workers, clustering, routing
packages/      Reserved shared schemas, rules, and UI packages
scripts/       Seed, smoke-test, and scale-simulation commands
data/          Seed, synthetic, and regulatory knowledge-base locations
infrastructure/Local Compose and infrastructure placeholders
docs/         Product, architecture, POC, API, and planning documentation
.github/       Agents, instructions, and GitHub Actions CI
```

Current executable code uses underscore Python package names:

- `services/complaint_worker`
- `services/clustering_worker`
- `services/routing_engine`

The hyphenated worker directories remain empty architectural placeholders used by the documented repository structure and CI checks:

- `services/clustering-worker`
- `services/complaint-worker`
- `services/notification-worker`
- `services/routing-engine`

They are not Python import packages. The active implementations are in the underscore directories.

## 3. Frontend Applications

Both applications use Next.js App Router, JavaScript, React, Tailwind/PostCSS configuration, and `lucide-react` icons. Each application has its own `package.json`, lockfile, ESLint configuration, Next configuration, and PostCSS configuration.

### 3.1 Citizen web

Location: `apps/citizen-web`

Routes:

| Route | Purpose | Implementation |
| --- | --- | --- |
| `/` | Complaint intake and citizen demo login | `app/page.js` |
| `/track` | Private complaint tracking | `app/track/page.js` |
| `/issues` | Public aggregate issue list | `app/issues/page.js` |
| `/issues/[slug]` | Public aggregate issue detail and corroboration | `app/issues/[slug]/page.js` |
| `/reports` | Private submitted reports and 48-hour editing | `app/reports/page.js` |

Complaint intake behavior:

- Accepts description, company/seller, amount, and exactly one contact method.
- The client validates that an email or phone is present, but not both.
- Sends `POST /api/backend/api/v1/complaints`.
- Shows the returned docket immediately.
- Starts a separate polling request for advisory intelligence, so complaint acknowledgement does not wait for analysis.
- Shows the classified issue, similar aggregate reports, potential dark-pattern advisory, and routing disclaimer when intelligence is ready.
- Polls for up to 15 seconds in the current client implementation.

Tracking behavior:

- Accepts docket number and one matching email or phone.
- Sends a private tracking request through the same-origin backend proxy.
- Shows status and a plain-language timeline only.
- Does not show complaint description, contact details, or private evidence.

Public issue behavior:

- Loads aggregate issue records from the API.
- Displays title, sector, issue, reported count, and affected-state count.
- Shows an empty state when no public issue records exist.
- Issue details include aggregate growth, evidence-backed count, geography, trend, routing advice, and allegation-safe language.
- The corroboration flow requires an explanation/evidence step before a consumer signal is counted.
- Real uploads use multipart form data and are labeled synthetic/demo where applicable.

Client API modules:

- `lib/complaint.js`: validation and normalized complaint/tracking payloads.
- `lib/demo.js`: citizen demo login request.
- `lib/issues.js`: public issue reads, corroboration, metadata evidence, and upload requests.

### 3.2 Admin dashboard

Location: `apps/admin-dashboard`

Routes:

| Route | Purpose | Implementation |
| --- | --- | --- |
| `/` | Government/analyst aggregate command center | `app/page.js` |
| `/issues/[slug]` | Aggregate issue drill-down | `app/issues/[slug]/page.js` |

Dashboard behavior:

- Uses API-backed overview and geography requests.
- Provides a synthetic-data banner and an official demo login control.
- Displays KPIs for new complaints, systemic issues, high-severity issues, potential fraud clusters, and potential dark-pattern reports.
- Displays a priority issue table with links to aggregate issue drill-down pages.
- Displays signal strength and an explanation of the scoring inputs.
- Displays state-level aggregate distribution using horizontal bars.
- Displays analyst notes and advisory routing language.
- Explicitly states that the view contains aggregate data and does not replace NCH, regulators, or consumer commissions.

Client API module:

- `lib/dashboard.js`: dashboard overview, geography, and issue-detail fetches.
- It also contains a legacy synthetic `dashboardSnapshot` used by the dashboard contract test. The running dashboard page uses API-backed data rather than that snapshot.

### 3.3 Frontend API proxy

Each Next.js application rewrites `/api/backend/:path*` to the FastAPI origin configured by `API_ORIGIN`.

- Citizen app: `apps/citizen-web/next.config.mjs`
- Admin app: `apps/admin-dashboard/next.config.mjs`

This keeps browser requests same-origin while allowing the API origin to change between local development, CI, and deployments.

## 4. Backend API

Location: `services/api/app`

The service is a FastAPI application created in `main.py`. It registers complaint, issue, dashboard, and demo routers. The default service version is `0.1.0`.

### 4.1 Health and demo access

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Returns API health and version |
| `POST` | `/api/v1/demo/login` | Returns a synthetic citizen or government demo session |

Demo login is intentionally lightweight. It returns a role/display name and synthetic-session label; it is not production authentication, authorization, identity verification, or RBAC.

### 4.2 Complaint intake and tracking

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/complaints` | Creates a private complaint and returns a docket |
| `POST` | `/api/v1/complaints/track` | Tracks a complaint using docket plus matching contact |
| `POST` | `/api/v1/complaints/intelligence` | Returns advisory analysis or `202` while processing |

Request validation:

- Description: 1 to 5,000 characters after trimming.
- Company: optional, up to 200 characters.
- Amount: optional non-negative INR decimal.
- Currency: INR only.
- Contact: exactly one validated email or phone number.
- Tracking docket: format `GD-` plus 12 uppercase alphanumeric characters.
- Unknown fields are rejected by Pydantic models.

Complaint creation is intentionally fast. One transaction writes:

1. The private complaint.
2. An HMAC digest of the contact value.
3. The initial `submitted` status event.
4. A versioned `complaint.created.v1` outbox event.

An optional idempotency key allows an existing outbox event to return its existing complaint rather than creating another one.

The intelligence endpoint verifies the same docket/contact combination. It returns `202 Accepted` when analysis is not yet persisted and a structured response with analysis and matched public issue data after processing.

### 4.3 Public issues and corroboration

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/issues` | Lists aggregate public issue records |
| `GET` | `/api/v1/issues/{cluster_key}` | Reads one aggregate issue |
| `POST` | `/api/v1/issues/{cluster_key}/confirm` | Compatibility endpoint that rejects blind confirmation |
| `POST` | `/api/v1/issues/{cluster_key}/corroborations` | Starts an evidence-required corroboration |
| `POST` | `/api/v1/issues/corroborations/{id}/evidence` | Records evidence metadata |
| `POST` | `/api/v1/issues/corroborations/{id}/evidence/upload` | Stores and records a real multipart upload |

The legacy `/confirm` endpoint returns `409 CORROBORATION_REQUIRED`. This prevents a click alone from increasing an aggregate signal.

A corroboration starts in `pending_evidence`. Evidence submission changes it to an accepted-for-signal state when the application rules permit it and updates aggregate counts. Evidence is still not legal verification.

Public response schemas expose aggregate fields such as issue, company, sector, counts, amounts, states, trends, and routing. They do not expose member complaint IDs, contact data, complaint text, or individual allegations.

### 4.4 Dashboard API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/dashboard/overview` | Calculates aggregate KPIs and top issue records |
| `GET` | `/api/v1/dashboard/issues` | Lists dashboard issue records using public projections |
| `GET` | `/api/v1/dashboard/issues/{cluster_key}` | Reads one dashboard issue projection |
| `GET` | `/api/v1/dashboard/geography` | Returns aggregate state distribution |

Dashboard responses are explicitly labeled synthetic. Geography can optionally be filtered by issue key.

## 5. Database and Persistence

### 5.1 Database engines

- Configured production-style default: PostgreSQL using `psycopg`.
- Local tests and CI: SQLite for fast isolated validation.
- Local demo can use an ignored SQLite file such as `manual-complaints.db`.
- SQLAlchemy 2.x provides the ORM and session handling.
- Alembic manages schema migrations.
- `infrastructure/docker-compose.yml` provisions PostgreSQL with the `pgvector/pgvector:pg16` image.

The current application does not persist embeddings in a vector column or execute pgvector queries. The database is ready for the selected PostgreSQL/pgvector direction, but vector persistence/search remains future work.

### 5.2 ORM models

Defined in `services/api/app/models.py`:

| Model | Table | Purpose |
| --- | --- | --- |
| `Complaint` | `complaints` | Private complaint text, company, amount, status, docket, timestamp |
| `ComplaintContact` | `complaint_contacts` | One HMAC-protected tracking contact per complaint |
| `ComplaintStatusEvent` | `complaint_status_events` | Private case status timeline |
| `OutboxEvent` | `outbox_events` | Versioned asynchronous processing handoff and retry/claim state |
| `IssueClusterRecord` | `issue_clusters` | Aggregate issue intelligence and metrics |
| `ConsumerConfirmation` | `consumer_confirmations` | Legacy/idempotent aggregate confirmation digest record |
| `ComplaintAnalysisRecord` | `complaint_analyses` | Structured advisory analysis linked to one complaint |
| `CorroborationRecord` | `corroborations` | Evidence-required consumer corroboration state |
| `EvidenceRecord` | `evidence_records` | Evidence metadata, validation status, digest, and storage reference |
| `SyntheticConsumer` | `synthetic_consumers` | Clearly synthetic demo consumer identity/state |
| `SyntheticSignal` | `synthetic_signals` | Clearly synthetic reported/evidence-backed signal |

Important constraints and indexes include:

- Unique docket numbers.
- One contact row per complaint.
- HMAC/contact digest indexes for private tracking.
- Non-negative complaint and cluster amounts.
- INR-only complaint currency.
- Non-negative cluster counts and metrics.
- Unique cluster keys.
- Unique corroboration digest per cluster.
- Unique evidence row per corroboration.
- Indexes for status, timestamps, cluster sector/issue, outbox publication, signals, and corroborations.
- Foreign keys with cascade behavior for private related records.

### 5.3 Migrations

The current Alembic chain has one head and seven migrations:

| Revision | Purpose |
| --- | --- |
| `0001_baseline` | Initial migration baseline |
| `0002_complaints` | Private complaint intake, contacts, status events, and outbox |
| `0003_issue_signals` | Aggregate issue clusters and consumer confirmations |
| `0004_demo_intelligence` | Complaint analysis and evidence-backed demo intelligence records |
| `0005_worker_uploads_seed_entities` | Worker processing, upload metadata, synthetic consumers/signals |
| `0006_dark_pattern_aggregate` | Potential dark-pattern aggregate count |
| `0007_worker_claims` | Outbox `claimed_at` state and unclaimed index |

Migrations are validated in CI against SQLite. The latest migration currently raises an explicit error on downgrade, so automated rollback of the worker-claim column is not implemented.

## 6. Evidence Storage

Location: `services/api/app/storage.py`

The local/demo storage implementation:

- Defaults to `.demo-storage/evidence`.
- Allows PDF, JPEG, PNG, and WebP content types.
- Rejects empty files.
- Enforces a 5 MB maximum.
- Strips path components from filenames.
- Generates a UUID-prefixed storage key.
- Resolves the destination below the configured storage root to prevent path traversal.
- Stores file size and SHA-256 digest in the evidence record.
- Supports deletion through `remove_evidence`.

This is local filesystem storage, not MinIO. Uploads remain synthetic/demo evidence unless an authorized review process changes their status. No OCR or invoice extraction pipeline is implemented.

## 7. AI and Intelligence

The intelligence implementation is deterministic and explainable. It is advisory, not authoritative.

### 7.1 Complaint classification

Location: `services/ai/app/classifier.py`

The classifier uses normalized text and keyword rules to produce:

- Company name.
- Sector.
- Issue.
- Severity.
- Financial impact.
- Evidence types.
- Potential authority/routing hint.
- Duplicate hint.
- Analysis status.
- Provenance including source, model ID, prompt version, and analysis time.

Supported rule categories include e-commerce, digital payments, banking, telecom, refunds, delivery, warranty/service, payments, hidden charges, subscriptions, and potential counterfeit products.

Confidence, matched phrases, fallback reasons, and provenance are returned as structured fields. The fallback status can be `needs_review` when classification confidence is low.

### 7.2 Embeddings

Location: `services/ai/app/embeddings.py`

The current provider is a replaceable deterministic hash baseline:

- 128 dimensions by default.
- Normalizes input text.
- Uses token and adjacent-token hashes.
- L2-normalizes the vector.
- Returns a model ID, source, dimensions, vector, and SHA-256 of normalized text.
- Does not return the source complaint text from the embedding result.
- Provides cosine similarity with dimension validation.

This is a testing/demo contract, not a production semantic model. Embeddings are not stored in the current relational schema.

### 7.3 Duplicate detection

Location: `services/ai/app/duplicates.py`

Duplicate scoring combines:

- Semantic similarity: 60% of final score.
- Metadata score: 40% of final score.
- Company match.
- Sector match.
- Issue match.
- 30/90-day time-window match.
- Monetary amount similarity.

Decisions are `duplicate_candidate`, `related_candidate`, `not_duplicate`, or `needs_review`. Compatible company, sector, and issue metadata are required for a duplicate candidate.

The active complaint worker compares a new complaint with up to 100 existing complaints and stores the best non-negative duplicate decision inside the analysis record. A full vector-search-backed duplicate pipeline is not yet implemented.

### 7.4 Dark-pattern analysis

Location: `services/ai/app/dark_patterns.py`

Supported pattern rules include:

- False urgency.
- Basket sneaking.
- Confirm shaming.
- Subscription trap.

The output includes pattern, confidence, explanation, matched evidence, official-guidance text, and status. The safe statuses are `potential_concern`, `not_detected`, and `needs_review`.

The UI uses language such as `Potential dark pattern detected`. It does not state that a company violated law or that an authority must take action.

### 7.5 Regulatory and routing recommendations

Location: `services/routing_engine/app/routing.py`

Routing is deterministic and advisory. Recommendations include company grievance handling, consumer grievance review, CCPA signal, and sector-regulator review depending on issue, sector, severity, and dark-pattern analysis.

The current demo data includes routing objects with route, confidence, reason, advisory flag, and source. These are navigation/recommendation outputs, not live government submissions or legal decisions.

## 8. Workers and Event Processing

### 8.1 Complaint worker

Location: `services/complaint_worker/app/worker.py`

The current runnable worker is a polling process:

```powershell
python -m services.complaint_worker.app.worker --interval 0.1
```

Behavior:

1. Selects unprocessed and unclaimed outbox events in creation order.
2. Atomically claims each event using `UPDATE ... RETURNING` and `claimed_at`.
3. Processes `complaint.created.v1` events.
4. Runs complaint analysis and duplicate summary generation.
5. Persists analysis and cluster changes.
6. Marks the event processed only after successful persistence.
7. Clears a claim and increments attempts on failure.
8. Marks an event processed after three failed attempts to avoid endless retries.
9. Ignores/marks unsupported event types processed.

The active worker uses the database outbox directly. Kafka is not used by this local worker.

### 8.2 Clustering worker package

Location: `services/clustering_worker`

This package contains tested domain logic for:

- Validating complaint metadata compatibility.
- Creating a private issue cluster from an anchor and duplicate candidates.
- Producing a public aggregate projection without member IDs.
- Calculating a weighted consumer signal.

The signal weights are:

| Component | Weight |
| --- | ---: |
| Affected consumers | 0.25 |
| Growth rate | 0.20 |
| Financial impact | 0.20 |
| Severity | 0.15 |
| Unresolved rate | 0.10 |
| Geographic spread | 0.10 |

Priority thresholds are low below 0.40, medium from 0.40, and high from 0.70. There is no separate long-running clustering consumer entrypoint in the current repository. The API intelligence service updates the current aggregate cluster directly for the demo path.

### 8.3 Notification worker

`services/notification-worker` is an empty architectural placeholder. No notification consumer, delivery provider, or status-notification workflow is implemented.

### 8.4 Missing event infrastructure

The repository does not currently include:

- Kafka producer/consumer implementation.
- Outbox relay to Kafka.
- Event schema registry or broker deployment used by the POC.
- Valkey/Redis cache.
- OpenSearch indexing.
- MinIO integration.
- Real-time dashboard updates.

These remain architectural extensions rather than dependencies of the local browser demo.

## 9. Synthetic and Mock Data

The deterministic dataset is defined in `scripts/seed_demo.py` and documented in `data/seed/README.md`.

Seed command:

```powershell
python -m alembic upgrade head
python -m scripts.seed_demo --reset
```

The seed creates:

- 20 aggregate issue clusters across 10 prepared niches.
- 600 synthetic consumers.
- 30 synthetic merchants.
- 40 synthetic signals.
- 2,000 complaints with one analysis record per complaint.
- 200 corroboration/evidence metadata records.
- Trend points for each scenario.
- State-level aggregate geography.
- Advisory routing recommendations.

Showcase scenarios:

| Cluster key | Company | Issue | Reports | States | Evidence-backed | Dark-pattern count |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `REFUND-DELAY-QUICKKART` | QuickKart | Refund delay | 438 | 12 | 312 | 0 |
| `HIDDEN-CHARGE-STREAMBOX` | StreamBox | Hidden charge | 286 | 9 | 153 | 0 |
| `WARRANTY-REJECTION-HOMETECH` | HomeTech | Warranty/service | 241 | 8 | 121 | 0 |
| `COUNTERFEIT-PRODUCT-MARKETMART` | MarketMart | Counterfeit product | 193 | 7 | 88 | 0 |
| `SUBSCRIPTION-ISSUE-NEWSPLUS` | NewsPlus | Subscription issue | 167 | 6 | 79 | 47 |

All seeded identities, complaint records, evidence, counts, trends, and dashboard figures are synthetic. They are not official statistics and are not legally verified evidence. Run `python -m scripts.validate_demo_data` after seeding to verify the relationships.

The seed reset is scoped to deterministic demo IDs and cluster keys. It does not intentionally delete unrelated local complaint records.

## 10. Complete Demo Journey

The intended browser demonstration is:

1. Open the citizen web app.
2. Select `Citizen demo`.
3. Submit a QuickKart refund-delay complaint.
4. Receive the docket immediately.
5. Wait for the separate advisory intelligence request.
6. Open the matching `REFUND-DELAY-QUICKKART` aggregate issue.
7. Select `I experienced this too`.
8. Start corroboration and provide a synthetic explanation.
9. Upload a supported proof file or submit evidence metadata.
10. See the evidence-backed aggregate response.
11. Open the analyst dashboard.
12. Select `Official demo`.
13. Open the QuickKart issue drill-down.
14. Review aggregate geography, evidence, trends, and advisory routing.

Automated coverage:

- `apps/citizen-web/e2e/demo-flow.spec.js` covers the browser journey.
- `scripts/demo_smoke_test.py` covers the API journey without a browser.
- Both flows use seeded synthetic data and local services.

## 11. CI/CD

Workflow: `.github/workflows/ci.yml`

Triggers currently configured:

- Every branch push.
- Every tag push.
- Pull request opened, synchronized, reopened, or marked ready for review.
- Merge queue events.
- Manual `workflow_dispatch`.

Permissions are limited to `contents: read`.

CI jobs:

1. `repository-structure`: verifies required directories and agent/instruction files.
2. `python`: installs the package, runs Ruff, mypy, pytest, and migration validation.
3. `scale-demo`: runs 100, 1,000, 10,000, and 100,000 synthetic events.
4. `smoke`: runs the isolated API smoke test.
5. `demo-flow`: migrates/seeds SQLite, starts API and worker, and runs the seeded HTTP flow.
6. `citizen-web`: installs, tests, lints, and builds the citizen app.
7. `admin-dashboard`: installs, tests, lints, and builds the dashboard.
8. `browser-e2e`: installs both web apps and Chromium, starts API/worker/apps, waits for readiness, and runs Playwright.

The browser job uses an explicit runner-local Playwright cache and keeps service startup/readiness and the browser journey in one shell step so background services remain available for the entire test.

## 12. Tests and Quality Checks

Backend and intelligence tests are under:

- `services/api/tests`
- `services/ai/tests`
- `services/clustering_worker/tests`
- `services/complaint_worker/tests`
- `services/routing_engine/tests`
- `scripts/tests`

Frontend tests are under:

- `apps/citizen-web/tests`
- `apps/admin-dashboard/tests`

Browser tests are under:

- `apps/citizen-web/e2e`

The current validated local suite includes:

- Python: 40 tests passed.
- Citizen web contract tests: 3 passed.
- Admin dashboard contract tests: 2 passed.
- Ruff: passed.
- Mypy: passed across 40 source files.
- Citizen and admin ESLint: passed.
- Citizen and admin production builds: passed.
- Database migration chain: passed.
- Synthetic scale simulation through 100,000 events: passed.
- Browser golden journey: passed locally with installed Chrome.

The frontend build currently emits an informational warning that the Next.js ESLint plugin is not detected in the ESLint configuration. This does not fail the build.

## 13. Security, Privacy, and Safety

Implemented safeguards:

- HMAC hashing for tracking contacts.
- Exactly one contact method at the API boundary.
- Pydantic validation and extra-field rejection.
- Docket plus contact verification for private tracking/intelligence.
- Aggregate-only public issue/dashboard schemas.
- Idempotent confirmation/corroboration constraints.
- Evidence file type, size, filename, and path validation.
- SHA-256 evidence metadata.
- Explicit synthetic-data labels.
- Allegation-safe dark-pattern and routing language.
- Least-privilege CI contents permission.

Not implemented for production:

- Real user authentication and session management.
- Government analyst RBAC and authorization enforcement.
- Rate limiting and abuse prevention.
- Comprehensive audit logging.
- Malware scanning and content inspection for uploads.
- OCR or invoice extraction.
- Legal evidence verification.
- Production secrets management and deployment controls.
- Full PII lifecycle, retention, deletion, and access policies.

## 14. What Is Fully Implemented

The following are working POC capabilities:

- FastAPI application and health endpoint.
- Complaint submission with immediate docket acknowledgement.
- Private contact-based complaint tracking.
- Transactional outbox record creation.
- Runnable local complaint polling worker.
- Deterministic structured complaint classification.
- Deterministic 128-dimensional embedding contract.
- Metadata-plus-semantic duplicate candidate scoring.
- Dark-pattern advisory analysis.
- Deterministic routing recommendations.
- Aggregate issue cluster persistence and public projection.
- Weighted consumer signal calculation logic.
- Evidence-required corroboration flow.
- Local safe evidence upload and metadata persistence.
- Synthetic seed/reset workflow.
- Citizen issue pages and tracking workflow.
- API-backed government dashboard and geography view.
- API and browser smoke tests.
- CI structure, Python, frontend, scale, demo, and browser jobs.

## 15. What Is Partial or Scaffolded

| Area | Current state | Missing for completion |
| --- | --- | --- |
| Event processing | Database outbox plus polling worker | Kafka publisher/consumer and durable event orchestration |
| Clustering | Tested cluster/signal domain logic and direct API updates | Dedicated cluster worker loop and persistent member relationships |
| Embeddings | Deterministic in-memory baseline | Production model, vector storage, pgvector search, evaluation |
| Evidence | Local upload and metadata | MinIO, malware scanning, OCR, extraction, review workflow |
| Dashboard | API-backed aggregate overview/geography | Pagination, filters, live updates, richer visual map |
| Authentication | Synthetic demo login and contact-gated tracking | Real identity, sessions, RBAC, authorization, audit logs |
| Notifications | Placeholder directory only | Notification worker, provider integration, retries |
| Search | Database reads only | OpenSearch/full-text search and indexing |
| Cache | No cache integration | Valkey/Redis cache and invalidation |
| Regulatory knowledge | Hardcoded advisory text | Verified source registry, RAG retrieval, citation pipeline |
| Geography | Seeded state aggregates and bar visualization | State extraction from live complaints and map interaction |
| Scale | Local synthetic simulation | Production load test and distributed worker measurement |
| Deployment | Local commands and PostgreSQL Compose service | Complete multi-service Compose/deployment/observability setup |

## 16. Architectural Boundaries

The project intentionally does not replace:

- National Consumer Helpline.
- e-Jagriti.
- CCPA.
- Sector regulators.
- Consumer commissions.
- Company grievance systems.

The current role of GRAHAK-DRISHTI is to organize complaint-derived intelligence and recommend possible next steps. Recommendations remain advisory, and reported complaints remain allegations until verified or resolved through an appropriate process.

The current working separation is:

```text
Citizen frontend
    -> FastAPI intake
        -> private complaint + contact digest + outbox event
            -> local complaint worker
                -> classification + duplicate summary + routing + cluster update
                    -> aggregate issue APIs
                        -> citizen issue view and analyst dashboard
```

The intended future separation is:

```text
Complaint API
    -> transactional outbox
        -> Kafka/event consumers
            -> AI/extraction worker
            -> duplicate/embedding worker
            -> clustering worker
            -> routing/recommendation service
            -> notification worker
                -> PostgreSQL/private case store
                -> vector/search/cache/object stores
                -> aggregate public intelligence
```

## 17. Local Run Guide

### Python setup

```powershell
python -m pip install -e ".[dev]"
$env:DATABASE_URL = "sqlite:///./demo-flow.db"
python -m alembic upgrade head
python -m scripts.seed_demo --reset
```

### API

```powershell
$env:DATABASE_URL = "sqlite:///./demo-flow.db"
python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port 8000
```

### Complaint worker

Run in a second terminal:

```powershell
$env:DATABASE_URL = "sqlite:///./demo-flow.db"
python -m services.complaint_worker.app.worker --interval 0.1
```

### Citizen web

```powershell
Push-Location apps/citizen-web
npm ci
$env:API_ORIGIN = "http://127.0.0.1:8000"
npm run dev -- --port 3005
Pop-Location
```

### Admin dashboard

```powershell
Push-Location apps/admin-dashboard
npm ci
$env:API_ORIGIN = "http://127.0.0.1:8000"
npm run dev -- --port 3006
Pop-Location
```

### Smoke tests

```powershell
$env:DEMO_BASE_URL = "http://127.0.0.1:8000"
python scripts/demo_smoke_test.py
```

For the browser journey, install Chromium and set `CITIZEN_BASE_URL` and `ADMIN_BASE_URL` to the running app URLs before running `npm run e2e` from `apps/citizen-web`.

## 18. Known Caveats

- PostgreSQL Docker Compose is defined, but Docker must be installed and running.
- The local demo commonly uses SQLite; this is not equivalent to production PostgreSQL behavior.
- Seeded complaint records are already marked analyzed and do not represent a full fresh-event replay.
- The local complaint worker polls the database directly rather than consuming Kafka.
- The worker retries failures up to three attempts and then marks the event processed; production dead-letter handling is not implemented.
- The dashboard values are synthetic and should not be interpreted as government measurements.
- The current `dashboardSnapshot` fixture remains for frontend contract tests even though the page is API-backed.
- `0007_worker_claims` is currently irreversible through Alembic downgrade.
- `ARCHITECTURE.md` and `DEVELOPMENT_PLAN.md` remain concise outlines; the detailed current-state description is in this file and the POC stabilization plan.

## 19. Source-of-Truth Files

Use these files for deeper context:

- `PRD.md`: product requirements, positioning, privacy, signal model, and demo goals.
- `AGENTS.md`: autonomous development rules, boundaries, security, and quality gates.
- `ARCHITECTURE.md`: high-level architecture outline.
- `DEVELOPMENT_PLAN.md`: high-level implementation phases.
- `README.md`: setup, commands, and current feature summary.
- `GRAHAK-DRISHTI_POC_STABILIZATION_PLAN.md`: detailed POC execution and presentation plan.
- `docs/poc/IMPLEMENTATION_AUDIT.md`: historical pre-PR #19 audit retained for traceability.
- `.github/workflows/ci.yml`: CI triggers and validation jobs.

## 20. Final Assessment

This repository is a functional, test-covered browser POC for the path:

```text
complaint intake
    -> asynchronous local intelligence processing
        -> aggregate issue signal
            -> evidence-backed corroboration
                -> analyst dashboard
```

It is not yet a production consumer-protection platform. The largest remaining engineering gaps are Kafka/event orchestration, real authentication/RBAC, durable vector/search infrastructure, OCR and evidence review, dedicated clustering/notification workers, production observability, and richer geographic analytics.

The project currently demonstrates the product concept and its privacy boundary effectively using deterministic code and clearly labeled synthetic data.
