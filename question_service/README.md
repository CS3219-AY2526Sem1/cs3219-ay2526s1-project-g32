# PeerPrep – Question Service

## Overview
Express + TypeScript API backed by Supabase Postgres (`questions` table). Supplies CRUD endpoints for coding questions, filtering by difficulty/topic, and random question selection for the matching service.

## Tech Stack
- Express + TypeScript
- Supabase client (`@supabase/supabase-js`)
- Zod validation
- Pino logger

## Capabilities
- CRUD endpoints for questions with starter code in Python/C/C++/Java/JavaScript
- Filter questions by title, difficulty, or topics
- `GET /api/v1/questions/random` used by the matching service
- Basic health endpoint for Docker health checks

## Running with Docker Compose
1. Copy the repo-level `.env.example` to `.env` and set your Supabase URL + keys (the question service reads from that shared file, so no per-service `.env` is required).
2. From repo root run:
   ```bash
   docker compose up --build question
   ```
   (requires Supabase credentials to be valid). The service listens on `http://localhost:4003`.

## Running Individually
```bash
npm install
npm run dev --workspace question_service
```
Build/start:
```bash
npm run build --workspace question_service
npm run start --workspace question_service
```

## Environment Variables
| Variable | Description |
| --- | --- |
| `PORT` (default `4003`) | HTTP port |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side queries |
| `SUPABASE_ANON_KEY` | Optional anon key (not required for this service) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins (default `http://localhost:3000`) |
| `LOG_LEVEL` | Logger verbosity |

## API Highlights
| Method & Path | Description |
| --- | --- |
| `POST /api/v1/questions` | Create question (title, slug, description, difficulty, topics, starter code) |
| `GET /api/v1/questions` | List questions with optional `title`, `difficulty`, `topic` filters |
| `GET /api/v1/questions/random` | Random question filtered by difficulty/topic |
| `GET /api/v1/questions/:id` | Fetch by numeric ID |
| `GET /api/v1/questions/slug/:slug` | Fetch by slug |
| `PUT /api/v1/questions/:id` | Update question |
| `DELETE /api/v1/questions/:id` | Remove question |

### Automatic Seeding
- On the first `GET /api/v1/questions` (without filters), if the table is empty the service inserts a small built-in question set from `src/seeds/sampleQuestions.ts`.
- This gives fresh deployments some data immediately; once seeded, normal CRUD and Supabase exports work as usual.

Payload schemas live in `src/validation/schemas.ts`; controller implementations are under `src/controllers/questionController.ts`.

### Service-Level (Question) AI Disclosure
AI Tools: Claude Sonnet 4.5

Summary: AI tools were used in generating boilerplate code based on author-designed architecture, author-designed API endpoints and services. It was also used for debugging purposes and providing error explanations, assisting in finding the root cause of the problems.

Restricted Scope: No requirements work or design-related work was handed to AI tools.

Validation: Any code that was generated was done incrementally, and validated for correctness and logic at every step.