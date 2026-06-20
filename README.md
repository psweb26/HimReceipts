# Himachal Pradesh Municipal Accountability & Monsoon Infrastructure Tracking System

A full-stack accountability dashboard for mountain-terrain grievance intake, field resolution, and CM Office telemetry during monsoon infrastructure risk windows.

## Quick Start

Start the Docker cluster:

```bash
docker compose up -d --build
```

The services expose:

| Service | URL |
| --- | --- |
| PostgreSQL database | internal Docker network on `db:5432` |
| FastAPI backend | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| React Vite frontend | http://localhost:5173 |

For local frontend-only development:

```bash
cd frontend
npm install
npm run dev
```

## Core Capabilities

The system tracks grievances through Himachal-specific administrative and terrain metadata:

| Field | Purpose |
| --- | --- |
| `district` | District boundary such as Kullu, Mandi, Shimla, Kangra, or Lahaul & Spiti. |
| `block` | Sub-district operating tier such as Anni, Seraj, Bhuntar, or Mashobra. |
| `panchayat` | Local Gram Panchayat boundary such as Sainj, Thunag, Draman, or Kibber. |
| `terrainRisk` | Mountain hazard type used for priority evaluation. |
| `infrastructureType` | Engineering asset marker used for department allocation. |
| `upvotes` | Community escalation signal. Tickets above 30 upvotes are promoted to `critical`. |

Department routing is driven by infrastructure type:

| Infrastructure Type | Department |
| --- | --- |
| Connecting Bailey Bridge | Public Works Department |
| Drinking Water Line | Jal Shakti Vibhag |
| NH Highway Link | National Highways Wing |
| Power Grid Substation | HPSEBL Operations |

## API Routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Runtime and regional command-state health check. |
| `GET` | `/api/grievances` | Returns all grievances with server-side upvote promotion applied. |
| `POST` | `/api/grievances` | Creates a terrain-aware grievance. |
| `POST` | `/api/grievances/{ticket_id}/upvote` | Increments community upvotes and applies critical promotion. |
| `PATCH` | `/api/grievances/{ticket_id}/verification` | Officer-only verification toggle for credibility controls. |
| `POST` | `/api/grievances/{ticket_id}/resolve` | Requires `resolutionNotes` and `validationImageUrl` before verified closure. |
| `POST` | `/api/grievances/{ticket_id}/reopen` | Records citizen veto/reopen feedback for a resolved work item. |
| `GET` | `/api/admin/executive-alerts` | Returns CM Office KPIs, district load, and alert telemetry. |

The staff login route remains available at `/api/v1/auth/login`.

## Background Ingestion Layer (APScheduler)

The backend now includes `backend/ingestor.py` with modular providers and safe SQLAlchemy upserts:

- `OpenWeatherMapProvider` pulls live weather metrics for Himachal station coordinates.
- `ConfigurableTransitProvider` ingests route alerts from `TRANSIT_ALERTS_JSON`.
- `IngestionService` handles resilient DB writes with rollback on errors.

FastAPI startup wires APScheduler in `backend/main.py`:

- Weather sync job every 10 minutes
- Transit sync job every 5 minutes
- Non-blocking background execution with `BackgroundScheduler`

Required environment variables:

- `OPENWEATHERMAP_API_KEY` for weather ingestion
- `TRANSIT_ALERTS_JSON` containing transit alerts as a JSON array

## Docker Files

| File | Role |
| --- | --- |
| `backend/Dockerfile.backend` | FastAPI runtime on Python 3.10 slim. |
| `frontend/Dockerfile.frontend` | React Vite development canvas on Node 22 Alpine. |
| `docker-compose.yml` | Unified Postgres/backend/frontend orchestration on ports 8000 and 5173. |
