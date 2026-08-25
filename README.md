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

Run the API locally with:

```powershell
python -m uvicorn services.api.app.main:app --reload
```

The service exposes `GET /health` and returns a versioned service status. Complaint intake and asynchronous intelligence processing are planned for later milestones.

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