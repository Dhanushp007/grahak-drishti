# GRAHAK-DRISHTI Copilot Instructions

## Project

GRAHAK-DRISHTI is a Consumer Intelligence and Escalation Layer for India's consumer-protection ecosystem.

Read `PRD.md` before implementing product functionality.

Read `ARCHITECTURE.md` before making architectural changes.

Read `DEVELOPMENT_PLAN.md` to understand implementation phases.

Read `AGENTS.md` for the complete autonomous development rules.

## Core principles

* Do not replace NCH, e-Jagriti, CCPA, sector regulators, or consumer commissions.
* Separate complaint/case processing from intelligence processing.
* Complaint acknowledgement must remain fast and must not wait for heavy AI processing.
* Use asynchronous event processing for AI, OCR, embeddings, duplicate detection, clustering, trends and analytics.
* Keep private consumer records separate from public aggregate issue intelligence.
* Never expose individual consumer PII publicly.
* Never present allegations as established facts.
* AI-generated regulatory recommendations must be explainable and grounded in verified sources.
* Synthetic/demo statistics must be clearly labeled.

## Stack

Frontend:
Next.js, JavaScript, Tailwind CSS, React Hook Form, Zod, Recharts, MapLibre/Leaflet.

Backend:
FastAPI, Python, Pydantic, SQLAlchemy, Alembic.

Data:
PostgreSQL, pgvector, Valkey, OpenSearch, MinIO.

Events:
Apache Kafka.

Infrastructure:
Docker, Docker Compose.

Monitoring:
Prometheus, Grafana, structured JSON logs.

## Repository

```text
apps/
services/
packages/
data/
infrastructure/
docs/
```

Respect the existing repository boundaries.

## Quality

Before considering a task complete:

* implement acceptance criteria
* add appropriate tests
* run tests
* run linting/formatting
* validate API/schema changes
* update documentation when required
* check for security and privacy issues

Do not weaken tests merely to make CI pass.

Do not introduce unnecessary dependencies or infrastructure.

## Development priority

Complete the MVP gates in order:

1. Complaint submission/tracking
2. AI structured extraction
3. Duplicate/systemic clustering
4. Consumer issue signals
5. Government intelligence dashboard
6. Dark-pattern/routing features
7. Scale testing and observability
