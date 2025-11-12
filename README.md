# PeerPrep – CS3219 AY2526S1 Project

PeerPrep is a collaborative coding platform composed of multiple services. Each service lives in this monorepo and can be run individually for development, or together through the shared Docker Compose stack.

## Services

| Service | Folder | Purpose | Default Port |
| --- | --- | --- | --- |
| Frontend | `frontend/` | Next.js (App Router) UI for onboarding, dashboard, session client | 3000 |
| User Service | `user_service/` | Supabase-backed auth + admin APIs | 4001 |
| Question Service | `question_service/` | REST API over Supabase questions catalogue | 4003 |
| Matching Service | `matching_service/` | Queue + timeout logic to pair users | 3002 |
| Collaboration Service | `collaboration_service/` | Session snapshots, token issuance, Yjs gateway | 4010 |
| Redis / RabbitMQ | Docker images | Backing infrastructure for queues, cache, pub/sub | 6379 / 5672 |

## Environment Configuration

1. Copy the repo-level `.env.example` to `.env` and fill in your Supabase keys plus any overrides (ports, Redis URL, hostname tweaks, etc.).
2. `docker compose` automatically reads this root `.env` and injects the values into every service, so you only configure secrets once.
3. When running a service individually, it will try to load the repo-level `.env` first and then a service-local `.env` if you need temporary overrides. Maintaining per-service `.env` files is now optional.
   - **Frontend note:** `NEXT_PUBLIC_*` values are baked into the browser bundle during the Docker build, so keep them reachable from your host machine (typically `http://localhost:40xx`). Docker Compose forwards the same variables as build args and runtime env vars automatically.

## Running the Full Stack (Docker)

1. Ensure Docker Desktop (or compatible engine) is running.
2. Copy `.env.example` (repo root) to `.env` and populate the required values (Supabase credentials are needed for the user and question services).
3. From the repo root (`cs3219-ay2526s1-project-g32/`), start everything:

   ```bash
   docker compose up --build
   ```

   - Frontend: `http://localhost:3000`
   - User service: `http://localhost:4001`
   - Question service: `http://localhost:4003`
   - Matching service: `http://localhost:3002`
   - Collaboration service: `http://localhost:4010`

4. To stop and remove containers: `docker compose down`.

## Running a Single Service Locally

1. Install dependencies once (workspace-aware):

   ```bash
   npm install
   ```

2. Start any service with:

   ```bash
   npm run dev --workspace <service_folder>
   ```

   Example: `npm run dev --workspace user_service`.

3. Each service README documents the required environment variables and available scripts.

## Repository Structure

```
.
├── docker-compose.yml          # Shared stack (frontend + all backend services)
├── frontend/                   # Next.js app
├── user_service/               # Express + Supabase auth service
├── question_service/           # Express + Supabase questions API
├── matching_service/           # Express + Redis + RabbitMQ matching engine
├── collaboration_service/      # Session manager + Yjs gateway
└── docs/                       # Architecture notes and API contracts
```

Refer to each service-specific README for detailed capabilities, environment variables, and API references.

## Containerisation

Each service ships with its own `Dockerfile` and `.dockerignore`. The repo includes:
- `docker-compose.yml` – builds production-style images for every service plus Redis/RabbitMQ
- `docker-compose.override.yml` – mounts source folders and runs `npm run dev` for hot reload during local development
- `.env.example` at the repo root (authoritative list of env vars) plus per-service examples for standalone debugging

### Development
```bash
cp .env.example .env    # fill in Supabase secrets, etc.
docker compose up --build
```
The override file mounts your source tree so changes trigger the dev servers automatically.

### Production-style
```bash
docker compose -f docker-compose.yml up --build -d
```
This uses the production builds produced by each Dockerfile. Stop containers with `docker compose down`.
