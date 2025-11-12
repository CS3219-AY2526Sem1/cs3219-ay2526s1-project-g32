# PeerPrep – Collaboration Service

## Overview
Manages coding session metadata, issues per-session JWTs, and exposes the secured Yjs WebSocket gateway used by the Monaco editor. Redis stores session snapshots and participant presence while the gateway (`@y/websocket-server`) syncs document updates.

## Tech Stack
- Express + TypeScript
- Redis (sessions + presence)
- @y/websocket-server (Yjs)
- Zod for schema validation
- Pino logger

## Capabilities
- `POST /api/v1/sessions` – create session snapshots requested by the matching service
- `GET /api/v1/sessions/:sessionId` – retrieve stored snapshot (question, documents, participants)
- `POST /api/v1/sessions/:sessionId/token` – validate Supabase token via user service then mint session-scoped JWT
- Authenticated WebSocket endpoint `ws(s)://<host>/collab/{sessionId}` for Yjs synchronization
- Grace-period expiry handling: sessions soft-close if both users disconnect for the configured timeout
- Session history export: when a session ends, Yjs docs are persisted to the user service history API

## Running with Docker Compose
1. Copy `collaboration_service/.env.example` to `.env`. Set:
   - `REDIS_URL` (matches Docker compose service `redis`)
   - `USER_SERVICE_URL` / `QUESTION_SERVICE_URL`
   - `USER_SERVICE_INTERNAL_KEY`
   - `JWT_SECRET`
2. Start services:
   ```bash
   docker compose up --build collaboration redis user question
   ```
   (or `docker compose up --build` for the full stack).  
3. REST API: `http://localhost:4010`, WebSocket base `ws://localhost:4010/collab`.

## Running Individually
```bash
npm install
npm run dev --workspace collaboration_service
```
Build/start:
```bash
npm run build --workspace collaboration_service
npm run start --workspace collaboration_service
```
Ensure Redis is running locally (`redis://localhost:6379`) or override via `.env`.

## Environment Variables
| Variable | Description |
| --- | --- |
| `PORT` / `HOST` | HTTP bind settings |
| `REDIS_URL` | Redis connection |
| `QUESTION_SERVICE_URL` | Used when seeding question details |
| `USER_SERVICE_URL` | Used for Supabase token validation |
| `USER_SERVICE_INTERNAL_KEY` | Shared key for calling user-service history endpoints |
| `JWT_SECRET` | Signing key for session JWTs |
| `SESSION_TOKEN_TTL_SECONDS` | Session token lifetime (default 300) |
| `SESSION_GRACE_PERIOD_SECONDS` | Disconnection grace window (default 300) |
| `COLLAB_WS_BASE_URL` | Advertised WebSocket URL |
| `LOG_LEVEL` | Logger verbosity |

## API Summary
| Method & Path | Description |
| --- | --- |
| `POST /api/v1/sessions` | Create session (called by matching service) |
| `GET /api/v1/sessions/:sessionId` | Fetch current snapshot |
| `POST /api/v1/sessions/:sessionId/token` | Mint session JWT for participant |
| `GET /health` | Health probe |

WebSocket clients connect to `ws://<host>/collab/{sessionId}?token=<sessionJWT>` (or via `Authorization: Bearer`). The gateway verifies the token, updates presence, and attaches the socket to `session:{sessionId}` Yjs doc names (`session:<id>/state`, `session:<id>/lang/<language>`).

See `src/services/sessionManager.ts` and `src/websocket/collaborationGateway.ts` for lifecycle details.
