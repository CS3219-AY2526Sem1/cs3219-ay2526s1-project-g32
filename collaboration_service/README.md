# Collaboration Service

Service responsible for provisioning real‑time coding sessions, issuing session-scoped tokens, and hosting the Yjs collaboration gateway used by the frontend editor.

## Features Implemented

- **Session lifecycle API** – `POST /api/v1/sessions` creates a session, stores metadata in Redis, and seeds presence state for both participants. `GET /api/v1/sessions/:id` returns the latest snapshot.
- **Token issuance** – `POST /api/v1/sessions/:id/token` validates a participant’s Supabase JWT via `user_service` (`/auth/token/validate`) before minting a short-lived session JWT.
- **WebSocket/Yjs gateway** – Authenticated clients connect to `wss://<host>/collab/{sessionId}` with the issued session token. The gateway verifies the JWT, checks Redis session state, and then hands the connection to `@y/websocket-server` which manages the shared Yjs document and awareness updates.
- **Presence tracking** – Connections call back into `SessionManager` on connect, heartbeat, and disconnect so Redis presence hashes stay fresh. Sessions remain alive while at least one participant is connected, and a five-minute grace window applies if both disconnect.
- **Question selector stub** – Currently returns placeholder data; ready to be swapped with an actual question service once available.

## Project Structure

```
src/
  app.ts                     # Express bootstrap, middleware stack
  server.ts                  # Service entrypoint (Redis + HTTP + WebSocket wiring)
  config/                    # Env parsing and typed config accessors
  controllers/               # SessionController (REST handlers)
  middleware/                # Zod-based request validators
  repositories/              # RedisSessionRepository + RedisPresenceRepository
  schemas/                   # Shared Zod schemas + inferred DTO types
  services/                  # SessionManager, stub Question client
  websocket/                 # Collaboration gateway (JWT auth + Yjs hookup)
  types/                     # Ambient type declarations (e.g., y-websocket-server)
```

## Getting Started

1. Ensure Redis is available (default `redis://localhost:6379`).
2. Duplicate `.env.example` to `.env` (or set env vars) and update URLs/secrets.
3. Install dependencies from repo root:

   ```bash
   npm install
   ```

4. Start the service:

   ```bash
   npm run dev --workspace collaboration_service
   ```

   The HTTP API listens on `http://localhost:4010` by default; the WebSocket gateway shares the same host.

### Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4010` | HTTP port. |
| `HOST` | `0.0.0.0` | Bind address. |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string. |
| `QUESTION_SERVICE_URL` | `http://localhost:4003/api/v1` | Placeholder for future integration. |
| `USER_SERVICE_URL` | `http://localhost:4001/api/v1` | Used for token validation. |
| `JWT_SECRET` | `dev-change-me` | Secret for session JWT signing/verification. |
| `SESSION_TOKEN_TTL_SECONDS` | `300` | Duration of issued session tokens. |
| `SESSION_GRACE_PERIOD_SECONDS` | `300` | How long to keep sessions alive once both users disconnect. |
| `COLLAB_WS_BASE_URL` | `ws://localhost:4010/collab` | Advertised WebSocket endpoint. |
| `LOG_LEVEL` | `debug` (non-prod) | Logger verbosity. |

## REST API Summary

| Method & Path | Description |
| --- | --- |
| `POST /api/v1/sessions` | Matching service call to create a session. Returns `sessionId`, `question`, and initial `expiresAt`. |
| `GET /api/v1/sessions/:sessionId` | Retrieve session snapshot from Redis. |
| `POST /api/v1/sessions/:sessionId/token` | Participant request for a session JWT (requires Supabase access token). |
| `GET /api/v1/health` | Basic health probe. |

> See `src/schemas/session.ts` and `docs/api-contracts-and-models.md` for detailed payloads.

## WebSocket Flow

1. Client obtains session token via REST call.
2. Connect to `wss://<host>/collab/{sessionId}` with header `Authorization: Bearer <sessionToken>` (or `?token=` query).
3. Gateway verifies JWT, ensures user is part of the session, and delegates to `setupWSConnection`.
4. Yjs document `session:{sessionId}` is created (if not already) and shared updates are synced.
5. Presence heartbeats keep Redis state aligned; disconnects trigger grace-period handling.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev --workspace collaboration_service` | Start with hot reload via `tsx`. |
| `npm run build --workspace collaboration_service` | TypeScript build to `dist/`. |
| `npm run start --workspace collaboration_service` | Run the compiled build. |

## What’s Next

- Replace the question stub with real question-service integration.
- Add metrics/logging around WebSocket usage and failures.
- Integrate the frontend Monaco/Yjs client once ready.
- Explore persistence (e.g., y-redis) to support multi-instance deployments.

## References

- `docs/` directory contains ADRs, API contracts, architecture outline, and implementation checklist.
- Yjs provider documentation: [y-websocket](https://github.com/yjs/y-websocket).
