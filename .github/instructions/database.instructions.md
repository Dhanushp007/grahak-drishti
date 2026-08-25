---
name: GRAHAK-DRISHTI Database Instructions
description: "Use when changing PostgreSQL schemas, SQLAlchemy models, Alembic migrations, pgvector indexes, seed data, or database queries."
applyTo: "services/**/*.py,infrastructure/postgres/**/*,data/**/*.sql"
---
# Database Guidelines

- Treat PostgreSQL as the system of record and use explicit constraints, indexes, and foreign keys.
- Create an Alembic migration for every production schema change.
- Preserve private case data and public aggregate intelligence as separate access boundaries.
- Never silently delete data; define rollback and migration safety before applying destructive changes.
- Use pgvector for semantic similarity and keep vector metadata consistent with structured complaint facts.
- Test migrations, transaction boundaries, and representative query performance.