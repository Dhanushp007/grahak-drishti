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

The service exposes `GET /health` and returns a versioned service status. Complaint intake, persistence, and asynchronous intelligence processing are planned for later milestones.