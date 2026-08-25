---
name: GRAHAK-DRISHTI Backend Instructions
description: "Use when editing FastAPI, Python services, Pydantic schemas, SQLAlchemy models, Alembic migrations, Kafka consumers, or backend tests."
applyTo: "services/**/*.py,packages/**/*.py"
---
# Backend Guidelines

- Keep complaint creation independent from AI, OCR, embeddings, duplicate detection, clustering, and analytics.
- Validate request data at the API boundary and keep shared contracts explicit.
- Use PostgreSQL as the transactional system of record, SQLAlchemy for access, and Alembic for schema changes.
- Make events versioned, traceable, and idempotently processable where possible.
- Protect PII with least-privilege access, masking, authorization, and audit logging.
- Add focused tests for success, validation, authorization, failure, and retry behavior.