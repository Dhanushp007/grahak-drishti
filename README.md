# GRAHAK-DRISHTI

Consumer intelligence and escalation platform for India's consumer-protection ecosystem.

## API development

The FastAPI service exposes complaint intake, private tracking, advisory complaint intelligence, aggregate issues, evidence-backed corroboration, demo login, dashboard overview, and synthetic state analysis.

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

The service exposes `GET /health` and returns a versioned service status. Complaint acknowledgement remains independent from advisory processing: the docket is returned first, and the browser makes a separate authorized intelligence request.

The AI package currently provides a deterministic, explainable complaint classifier for worker use. It returns structured sector, issue, severity, financial-impact, evidence, duplicate-hint, confidence, and provenance fields; it is advisory and does not run on the complaint acknowledgement path.

The same package provides a provider-replaceable 128-dimensional deterministic embedding baseline and cosine similarity contract. It fingerprints normalized text for traceability without returning the source complaint text; a production semantic model and pgvector persistence remain later milestones.

The clustering worker can turn accepted duplicate candidates into an aggregate issue cluster. Its private record retains member IDs for internal processing, while the public projection exposes only issue, company, sector, count, amount, and time aggregates; complaint narratives and identifiers are excluded.

The consumer signal module applies the PRD weights for affected consumers, growth, financial impact, severity, unresolved rate, and geographic spread. The citizen app includes a synthetic aggregate issue view at `/issues`. “I experienced this too” starts a corroboration and requires supporting evidence metadata before aggregate counts update.

The issue signal API exposes `GET /api/v1/issues/{cluster_key}` for aggregate-only issue reads, `POST /api/v1/issues/{cluster_key}/corroborations`, and `POST /api/v1/issues/corroborations/{id}/evidence`. Confirmation keys are hashed before storage; no contact details or complaint narratives are returned. The legacy `/confirm` route rejects blind votes with `409 CORROBORATION_REQUIRED`.

Gate 6 provides advisory dark-pattern analysis for evidence text and deterministic consumer-navigation recommendations. Results use “Potential dark pattern detected” language, include evidence and guidance, and never establish a legal violation or binding regulatory action.

Gate 7 includes a synthetic queue simulation for 100, 1,000, 10,000, and 100,000 events. It reports producer time, processing throughput, peak queue depth, worker distribution, and queue-drain status; these are local demonstration metrics, not production capacity guarantees.

Submit a complaint with `POST /api/v1/complaints` using a description and exactly one tracking contact (`email` or `phone`). The response returns a non-sequential docket immediately. Track it with `POST /api/v1/complaints/track`; tracking requires the docket and the same contact, and returns a plain-language status timeline without private complaint content.

Submission writes the private case, initial status event, and versioned `complaint.created.v1` outbox event in one transaction. The outbox is the handoff for future asynchronous processing; AI, OCR, clustering, routing, and notifications do not block acknowledgement.

## Deterministic demo data

After applying migrations, seed the five synthetic issue scenarios:

```powershell
python -m scripts.seed_demo
```

Use `python -m scripts.seed_demo --reset` only when intentionally resetting local demo complaint and intelligence records. See `data/seed/README.md` for the data-truthfulness boundary.

## Citizen web development

Install and run the citizen app from its directory:

```powershell
Push-Location apps/citizen-web
npm ci
$env:API_ORIGIN = "http://127.0.0.1:8000"
npm run dev
Pop-Location
```

The app exposes the report form at `/` and private docket tracking at `/track`. `API_ORIGIN` is read when Next.js starts or builds so the same-origin API proxy points at the running FastAPI service.

Run the government intelligence app separately:

```powershell
Push-Location apps/admin-dashboard
$env:API_ORIGIN = "http://127.0.0.1:8000"
npm ci
npm run dev
Pop-Location
```

The admin app loads `/api/v1/dashboard/overview`, `/api/v1/dashboard/geography`, and aggregate issue drill-down data from the API. Both apps visibly label the environment as synthetic demo data.

## Database development

The API uses PostgreSQL with pgvector as its transactional database. Start the local database with:

```powershell
docker compose -f infrastructure/docker-compose.yml up -d
```

Apply migrations with:

```powershell
python -m alembic upgrade head
```

Set `DATABASE_URL` when using a database other than the local default. Apply all migrations before seeding. The local prototype needs PostgreSQL only; Kafka, OCR, and production government integrations remain outside this demo path.