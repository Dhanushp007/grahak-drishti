# GRAHAK-DRISHTI — Autonomous Development Instructions

## 1. Mission

You are the primary autonomous software engineering agent for the GRAHAK-DRISHTI repository.

GRAHAK-DRISHTI is a citizen-facing Consumer Intelligence and Escalation Layer across India's consumer-protection ecosystem.

The objective is to transform individual consumer complaints into structured intelligence, duplicate/systemic issue clusters, consumer signals, routing recommendations, and government intelligence.

The authoritative product requirements are defined in `PRD.md`.

Do not invent product requirements that contradict `PRD.md`.

---

## 2. Source of Truth

Before implementing any task, read:

1. `PRD.md`
2. `ARCHITECTURE.md`
3. `DEVELOPMENT_PLAN.md`
4. `AGENTS.md`
5. Relevant documentation under `docs/`

When requirements conflict:

1. Explicit task acceptance criteria
2. `PRD.md`
3. `ARCHITECTURE.md`
4. `DEVELOPMENT_PLAN.md`
5. Existing implementation

If ambiguity materially affects architecture, security, data integrity, or user-visible behavior, stop and document the ambiguity rather than silently inventing behavior.

---

## 3. Product Principles

Always preserve these principles:

### 3.1 Do not replace existing government systems

GRAHAK-DRISHTI is an intelligence and escalation layer.

It does not claim to replace:

* NCH
* e-Jagriti
* CCPA
* sector regulators
* consumer commissions
* company grievance systems

### 3.2 Information scalability is the central problem

The system must transform:

Individual complaints

into:

Structured data → semantic relationships → duplicate detection → issue clusters → consumer signals → government intelligence.

### 3.3 Separate case processing from intelligence processing

Complaint submission must not wait for AI processing.

Required high-level flow:

Consumer
→ API
→ complaint accepted
→ docket generated
→ event published
→ asynchronous AI/intelligence processing

### 3.4 Privacy by design

Never expose individual consumer complaints publicly.

Private case data and public aggregate issue intelligence must remain separate.

Public issue pages may contain:

* issue
* company
* sector
* aggregate geography
* affected count
* financial-impact range
* trends
* resolution statistics

They must not expose:

* names
* phone numbers
* email addresses
* addresses
* order IDs
* invoices
* private communications
* individual accusations

### 3.5 Explainability

AI-generated classifications must expose:

* classification
* confidence
* supporting evidence
* source where applicable

Never use unexplained statements such as:

"AI says this is important."

### 3.6 Regulatory safety

Never claim that a company violated the law unless authoritative evidence and a legally appropriate workflow explicitly supports that statement.

Prefer:

* "Potential dark pattern detected"
* "Potential regulatory concern"
* "Recommended escalation path"

Do not present allegations as established facts.

---

## 4. Technology Stack

Use the stack defined by the PRD.

### Frontend

* Next.js
* JavaScript
* Tailwind CSS
* React Hook Form
* Zod
* Lucide React
* Recharts
* MapLibre GL JS or Leaflet

### Backend

* FastAPI
* Python
* Pydantic
* SQLAlchemy
* Alembic

### Data

* PostgreSQL
* pgvector
* Valkey
* OpenSearch
* MinIO

### Event processing

* Apache Kafka

### AI

* LLM API or local model
* Embedding model
* PaddleOCR or Tesseract
* Vision-capable model where required
* RAG using verified official consumer-protection knowledge

### Infrastructure

* Docker
* Docker Compose

### Monitoring

* Prometheus
* Grafana OSS
* Structured JSON logging

Do not introduce additional infrastructure without a clear technical justification.

Prefer the simplest architecture that satisfies the requirements.

---

## 5. Repository Structure

Respect the following structure:

```text
apps/
  citizen-web/
  admin-dashboard/

services/
  api/
  ai/
  complaint-worker/
  clustering-worker/
  routing-engine/
  notification-worker/

packages/
  ui/
  schemas/
  rules/

data/
  seed/
  regulatory-kb/
  synthetic/

infrastructure/
  kafka/
  postgres/
  opensearch/
  minio/
  monitoring/

docs/
  architecture/
  api/
  prd/
```

Keep responsibilities separated.

Do not place backend business logic inside the frontend.

Do not duplicate domain models unnecessarily.

Prefer shared schemas and rules in `packages/`.

---

## 6. Autonomous Workflow

For every assigned task:

### Step 1 — Understand

Read the relevant requirements and existing implementation.

### Step 2 — Inspect

Search the repository before creating new files or duplicating functionality.

### Step 3 — Plan

Determine:

* files to create
* files to modify
* dependencies
* database changes
* API changes
* tests
* documentation changes

### Step 4 — Implement

Implement the smallest complete solution satisfying the acceptance criteria.

### Step 5 — Test

Run appropriate:

* unit tests
* integration tests
* API tests
* frontend tests
* type/schema validation
* linting
* formatting
* security checks

### Step 6 — Fix

If tests fail, investigate and fix the implementation.

Do not simply remove or weaken tests to make CI pass.

### Step 7 — Verify

Re-run relevant validation after fixes.

### Step 8 — Document

Update documentation when architecture, APIs, configuration, behavior, or developer workflow changes.

### Step 9 — Report

Summarize:

* what changed
* files changed
* tests executed
* test results
* known limitations
* follow-up work

---

## 7. Definition of Done

A task is not complete merely because code exists.

A task is complete only when:

* acceptance criteria are implemented
* code is integrated with the existing architecture
* tests are present where appropriate
* tests pass
* linting passes
* formatting passes
* validation passes
* security considerations are addressed
* documentation is updated when necessary
* no obvious regression has been introduced

---

## 8. Database Rules

Use PostgreSQL as the transactional system of record.

Use pgvector for semantic similarity and vector retrieval.

Use SQLAlchemy for data access.

Use Alembic for schema migrations.

Never modify production database schemas without a migration.

Never silently delete data.

Prefer explicit constraints, indexes, foreign keys, and appropriate transaction boundaries.

---

## 9. Event-Driven Rules

Complaint ingestion must remain responsive.

Do not make complaint submission synchronously execute:

* embeddings
* duplicate detection
* clustering
* trend detection
* heavy OCR
* large AI operations

Those operations should be event-driven/asynchronous where appropriate.

Use Kafka for event streaming.

Design events to be:

* versioned
* traceable
* idempotently processed where possible

---

## 10. AI Rules

AI must not become the authoritative source of truth for regulatory decisions.

Use deterministic rules where regulatory routing requires predictable behavior.

Use AI for:

* extraction
* classification
* summarization
* semantic similarity
* clustering assistance
* explanation
* dark-pattern analysis
* navigation assistance

Use verified official sources for regulatory knowledge.

RAG responses should identify their supporting source.

Never fabricate regulatory pathways.

---

## 11. Duplicate Detection

Duplicate/systemic detection should combine:

* semantic similarity
* company similarity
* product/category similarity
* issue similarity
* time-window similarity
* monetary context where useful

Do not rely solely on keyword matching.

The system should support:

Complaint
→ normalization
→ embedding
→ vector search
→ similarity score
→ metadata checks
→ duplicate/systemic classification
→ existing/new issue cluster

---

## 12. Public Consumer Signal

The public interaction is:

"I experienced this too."

Do not implement:

"Vote to force government action."

Consumer signals represent evidence of prevalence and confirmation.

Do not claim that votes directly force government action.

---

## 13. Synthetic Data

Synthetic/demo data must be clearly identified.

Never present synthetic figures as official government statistics.

The MVP should support synthetic data for:

* development
* clustering evaluation
* load testing
* demonstration

Target demo dataset:

* minimum 50,000 complaints
* preferred 100,000 complaints

---

## 14. Security

Never commit:

* API keys
* passwords
* tokens
* private credentials
* production secrets

Use environment variables and `.env.example`.

Apply:

* authentication
* authorization
* RBAC
* rate limiting
* audit logging
* PII masking
* least privilege
* secure file handling
* input validation

---

## 15. Testing Strategy

Every major feature should have appropriate automated tests.

Backend:

* unit tests
* service tests
* API tests
* database integration tests

Frontend:

* component tests where valuable
* user-flow tests for critical experiences

AI:

* evaluation datasets
* classification metrics
* duplicate detection metrics
* routing validation
* RAG grounding checks

System:

* integration tests
* event processing tests
* load tests for major scalability claims

---

## 16. Performance Requirements

The PRD target for the demo environment is:

API acknowledgement <500 ms.

Complaint creation must not wait for AI processing.

Dashboards must use pagination.

Workers should be horizontally scalable.

Queue-backed processing must prevent AI workloads from blocking complaint intake.

---

## 17. Do Not Over-Engineer

This is a hackathon MVP.

Do not introduce:

* Kubernetes unless explicitly required
* unnecessary microservices
* unnecessary databases
* unnecessary cloud infrastructure
* unnecessary abstraction layers

Docker Compose is the primary local/hackathon deployment mechanism.

Prioritize a working end-to-end product over theoretical production complexity.

---

## 18. Implementation Priority

Prioritize the following gates:

### Gate 1

Consumer can submit and track a complaint.

### Gate 2

AI converts complaint into structured facts.

### Gate 3

Duplicate detection creates an issue cluster.

### Gate 4

Consumer signal and public issue page work.

### Gate 5

Government dashboard surfaces systemic issues.

### Gate 6

Dark-pattern and routing features work.

### Gate 7

Load simulation and observability pass.

If time is constrained, complete Gates 1–5 before expanding to advanced features.

---

## 19. Demo Narrative

The final implementation should support the PRD's continuous demonstration:

1. Consumer submits refund complaint.
2. Invoice is uploaded.
3. Docket is returned immediately.
4. AI extracts company, sector, issue, amount and evidence.
5. Similar complaints are found.
6. Complaint joins an issue cluster.
7. Consumer sees the systemic issue.
8. Consumer clicks "I experienced this too."
9. Signal updates.
10. Government dashboard updates.
11. Issue appears as a trend.
12. System recommends an escalation path.
13. Government analyst sees aggregate evidence.
14. Dark-pattern scenario can be demonstrated.
15. Architecture can be demonstrated.
16. 100,000-event scale simulation can be demonstrated.

---

## 20. Autonomous Decision Rule

When implementation details are unspecified:

1. Prefer the architecture in `ARCHITECTURE.md`.
2. Prefer existing repository conventions.
3. Prefer the simplest maintainable solution.
4. Prefer open-source/local components already selected.
5. Do not introduce new infrastructure without justification.
6. Document meaningful assumptions.

Do not silently change product scope.

---

## 21. Human Approval Boundaries

The agent may autonomously implement code, tests, documentation, migrations, configuration, and CI changes within the repository.

Human approval is required before:

* production deployment
* destructive database operations
* real government-system integration
* exposing real consumer PII
* changing security boundaries
* introducing production credentials
* changing the core architecture
* deleting substantial functionality

---

## 22. Final Principle

Build GRAHAK-DRISHTI as:

Citizen
→ AI
→ Intelligence Layer
→ Consumer Signal
→ Existing Government Ecosystem
→ Resolution

The central technical innovation is information scalability.

The central feature is Duplicate Complaint Detection.

The central consumer interaction is:

"I experienced this too."

The central government capability is:

Systemic Issue Intelligence.

Do not lose these principles while implementing individual tasks.
