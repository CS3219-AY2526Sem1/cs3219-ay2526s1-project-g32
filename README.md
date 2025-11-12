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

## Running the Full Stack (Docker)

1. Ensure Docker Desktop (or compatible engine) is running.
2. Copy each `.env.example` to `.env` inside the corresponding service folders (at minimum `user_service`, `question_service`, `collaboration_service`, `frontend`). Supabase credentials are required for the user/question services.
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
- `.env.example` files per service documenting required variables

### Development
```bash
cp <service>/.env.example <service>/.env    # fill in Supabase secrets, etc.
docker compose up --build
```
The override file mounts your source tree so changes trigger the dev servers automatically.

### Production-style
```bash
docker compose -f docker-compose.yml up --build -d
```
This uses the production builds produced by each Dockerfile. Stop containers with `docker compose down`.
