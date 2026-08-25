# GRAHAK-DRISHTI

Consumer intelligence and escalation platform for India's consumer-protection ecosystem.

## API development

The first backend slice is a FastAPI service with a health endpoint.

```powershell
python -m pip install -e ".[dev]"
python -m pytest
python -m ruff check services/api
python -m mypy services/api/app
```

The CI pipeline also runs a live API smoke test against an isolated migrated SQLite database. It verifies health, complaint submission, and contact-based tracking without exposing private complaint fields.

Run the API locally with:

```powershell
python -m uvicorn services.api.app.main:app --reload
```

The service exposes `GET /health` and returns a versioned service status. Complaint intake and asynchronous intelligence processing are planned for later milestones.

Submit a complaint with `POST /api/v1/complaints` using a description and exactly one tracking contact (`email` or `phone`). The response returns a non-sequential docket immediately. Track it with `POST /api/v1/complaints/track`; tracking requires the docket and the same contact, and returns a plain-language status timeline without private complaint content.

Submission writes the private case, initial status event, and versioned `complaint.created.v1` outbox event in one transaction. The outbox is the handoff for future asynchronous processing; AI, OCR, clustering, routing, and notifications do not block acknowledgement.

## Database development

The API uses PostgreSQL with pgvector as its transactional database. Start the local database with:

```powershell
docker compose -f infrastructure/docker-compose.yml up -d
```

Apply migrations with:

```powershell
python -m alembic upgrade head
```

Set `DATABASE_URL` when using a database other than the local default. The initial migration is intentionally empty; domain tables will be added with the complaint feature.