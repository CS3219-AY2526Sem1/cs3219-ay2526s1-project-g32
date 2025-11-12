# PeerPrep – Matching Service

## Overview
Stateless Express service that pairs users based on requested topic/difficulty. Redis maintains per-topic FIFO queues; RabbitMQ TTL queues handle automatic timeouts. The service exposes REST endpoints consumed by the frontend and by the collaboration service when a match is confirmed.

## Tech Stack
- Express + TypeScript
- Redis (queue storage)
- RabbitMQ (timeout processing)
- Zod for validation
- Axios for service-to-service calls

## Capabilities
- `POST /api/v1/matching/requests` – enqueue user with topic/difficulty and Supabase auth token
- `GET /api/v1/matching/requests/:userId/status` – poll match status (`pending`, `success`, `not_found`, prompt to expand search)
- `DELETE /api/v1/matching/requests` – cancel outstanding request
- `POST /api/v1/matching/requests/expand` – accept difficulty expansion
- Communicates with user service (token validation) and collaboration service (session creation)

## Running with Docker Compose
1. Docker Compose already provisions Redis (`redis`) and RabbitMQ (`rabbitmq`); no extra setup needed.
2. From repo root run:
   ```bash
   docker compose up --build matching redis rabbitmq user collaboration question
   ```
   (or simply `docker compose up --build` to start the full stack).  
3. Service is available at `http://localhost:3002`. It expects the other containers to be reachable via the compose hostnames defined in `docker-compose.yml`.

## Running Individually
1. Start local Redis and RabbitMQ instances, or update the environment variables below.
2. Install dependencies and run dev mode:
   ```bash
   npm install
   npm run dev --workspace matching_service
   ```
3. Build/start:
   ```bash
   npm run build --workspace matching_service
   npm run start --workspace matching_service
   ```

## Environment Variables
| Variable | Description |
| --- | --- |
| `PORT` (default `3002`) | HTTP port |
| `RABBITMQ_URL` | AMQP connection string |
| `REDIS_URL` | Redis connection string |
| `USER_SERVICE_URL` | Base URL for token validation (`/auth/token/validate`) |
| `COLLABORATION_SERVICE_URL` | Session creation endpoint (`/api/v1/sessions`) |
| `MATCH_TIMEOUT_MS` | Optional override for timeout duration (default 120000) |
| `LOG_LEVEL` | `info`/`debug` verbosity |

## Request Lifecycle
1. User submits match request with topic/difficulty and access token.
2. Service validates JWT via user service and pushes the request into a Redis list.
3. RabbitMQ schedules a timeout job; if the user waits too long they are removed automatically.
4. When another compatible user is present, the service pairs them, notifies collaboration service to create a session, and removes both from the queue.
5. Clients poll the status endpoint until they receive `success` (with sessionId) or `not_found`.

Refer to `src/controllers/matchingControllers.ts` and `src/services/queueService.ts` for implementation details.
