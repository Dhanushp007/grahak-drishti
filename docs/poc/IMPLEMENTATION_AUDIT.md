# POC Implementation Audit

**Audit date:** 2026-08-26  
**Scope:** Current browser prototype and supporting services

## Current state

GRAHAK-DRISHTI has a working FastAPI complaint intake and tracking slice, a public aggregate issue read, deterministic AI/duplicate/clustering/routing modules, and two Next.js applications. The existing implementation is a strong foundation, but the browser journey currently stops before complaint understanding and evidence-backed corroboration are visible.

## Feature matrix

| Capability | Exists | Working | Backend | Frontend | E2E | Needs change |
|---|---:|---:|---:|---:|---:|---:|
| Complaint submission and docket | Yes | Yes | Yes | Yes | Partial | Connect to analysis result |
| Private complaint tracking | Yes | Yes | Yes | Yes | Partial | Add processing states |
| Deterministic complaint classification | Yes | Yes | Module/tests only | No | No | Persist and expose advisory result |
| Embeddings and duplicate scoring | Yes | Yes | Module/tests only | No | No | Use in demo processing path |
| Issue cluster creation logic | Yes | Yes | Module/tests only | Public issue read only | No | Seed and connect a showcase cluster |
| Public issue listing/details | Yes | Yes | Yes | Yes | Partial | Add evidence quality and next step |
| Consumer confirmation | Yes | Yes | Yes | Yes | No | Require evidence metadata first |
| Evidence metadata | No | No | No | No | No | Add additive model, migration, and API |
| Dashboard overview | Partial | Static snapshot | No | Yes | No | Read aggregate API data |
| Issue drill-down | No | No | No | No | No | Add aggregate detail endpoint/view |
| Geographic/state analysis | No | No | No | No | No | Add lightweight aggregate endpoint/view |
| Routing recommendation | Yes | Unit tests only | Module only | No | No | Expose advisory result |
| Synthetic seed/reset | No | No | No | Static dashboard only | No | Add deterministic seed command/data |
| Instant demo login | No | No | No | No | No | Add lightweight demo entry points |

## Verified working features

- Python test suite: 34 tests passed.
- Citizen contract tests: 3 tests passed.
- Admin dashboard contract tests: 2 tests passed.
- Citizen and admin lint checks pass when run from their app directories.
- Complaint acknowledgement writes the private complaint, initial status event, and versioned outbox event in one transaction.
- Public issue responses use aggregate fields and do not expose member IDs, narratives, or contact details.
- Confirmation keys are hashed and confirmation requests are idempotent.
- AI, duplicate detection, clustering, signal scoring, dark-pattern analysis, and routing modules have focused unit coverage.

## Browser-flow problems

1. The citizen report page creates a docket but does not show the deterministic analysis, similar issue match, or recommended next step.
2. The public issue detail page calls `POST /confirm` directly from the button, so a click alone increments the aggregate confirmation count.
3. The API has no evidence or corroboration resource and no persisted analysis resource.
4. The government dashboard renders `dashboardSnapshot` from a local JavaScript constant. Its buttons and issue links do not lead to backend-backed detail views.
5. No dashboard, geography, or routing API is exposed.
6. There is no seed data in `data/seed` or `data/synthetic`, so a fresh database has no meaningful issue list.
7. There is no instant demo login or shared synthetic-data notice across the apps.
8. A functional India/state visualization is not present; map-related icons in the dashboard are not geographic analytics.

## Privacy and safety observations

- Public issue APIs currently project only aggregate cluster data, which is the correct boundary to preserve.
- Complaint contacts are stored as HMAC digests and are not returned by tracking.
- Regulatory routing must remain advisory and allegation-safe when exposed in the UI.
- Synthetic/demo evidence must be clearly labeled and must not be presented as legally verified.

## Recommended minimum implementation

1. Add complaint analysis and evidence metadata tables through an Alembic migration, keeping complaint acknowledgement independent from analysis work.
2. Add deterministic demo processing at the API boundary or a small service module that uses the existing classifier, duplicate, and routing contracts. Store only structured advisory fields.
3. Add evidence-backed corroboration endpoints with idempotency and validation status. Retain the existing confirmation endpoint only for compatibility, but route the browser through the new evidence flow.
4. Add deterministic seed data and a repeatable seed command for the golden QuickKart refund-delay scenario plus four supporting scenarios.
5. Add aggregate dashboard, issue detail, geography, and routing reads. Keep private complaint records out of all public/dashboard responses.
6. Connect the citizen issues/corroboration flow and replace the admin static snapshot with backend reads, then add loading, error, empty, and retry states.
7. Validate the complete browser path with fresh migrations, API tests, web lint/build, and a manual smoke run.

## Runtime constraints

The local Compose file currently provisions PostgreSQL/pgvector only. Kafka, Valkey, OpenSearch, MinIO, and worker entry points are not wired into the runnable POC. They should remain architectural extensions; the deterministic API-backed demo path should not depend on them.
