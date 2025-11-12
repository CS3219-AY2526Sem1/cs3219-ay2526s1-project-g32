# PeerPrep – User Service

## Overview
Identity and admin microservice built with Express + TypeScript. It relies on Supabase Auth for account storage, exposes registration/login endpoints for the frontend, and provides secure helper APIs (admin promotion, token validation) for other services.

## Tech Stack
- Express + TypeScript
- Supabase Auth (email/password + magic link)
- Zod for request validation
- Pino logger

## Capabilities
- Register/login users and trigger Supabase verification emails
- Resend verification (“magic link”) emails
- `GET /auth/me` to hydrate the frontend session
- Validate Supabase JWTs for downstream services
- Admin-only API to promote/demote users (persisted in Supabase metadata)

## Running with Docker Compose
1. Copy `user_service/.env.example` to `user_service/.env` and fill in the Supabase values (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`).  
2. From the repo root run:
   ```bash
   docker compose up --build user
   ```
3. Service is available at `http://localhost:4001`. Health probes and other services depend on this container name (`user`). Stop with `docker compose down`.

## Running Individually
```bash
npm install           # once at repo root
npm run dev --workspace user_service
```
The dev server listens on `http://localhost:4001`. Use `npm run build --workspace user_service` followed by `npm run start --workspace user_service` for a production build.

## Environment Variables
| Variable | Description |
| --- | --- |
| `PORT` (default `4001`) | HTTP port |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (keep secret) |
| `SUPABASE_ANON_KEY` | Public anon key exposed to frontend |
| `SUPABASE_JWT_SECRET` | JWT secret configured in Supabase |
| `INTERNAL_SERVICE_KEY` | Shared key used by other services (e.g., history snapshots) |

## API Highlights
- `POST /api/v1/auth/register` – create account (stores `isAdmin` metadata flag)
- `POST /api/v1/auth/login` – email/password login, returns tokens and profile
- `POST /api/v1/auth/verification/resend` – resend magic link
- `GET /api/v1/auth/me` – fetch profile from Supabase with provided access token
- `POST /api/v1/auth/token/validate` – internal token validation for other services
- `PATCH /api/v1/auth/users/:userId/admin` – mark/unmark admin (requires admin auth)

All routes use JSON responses. See `src/routes/auth.route.ts` for full list and payload schemas in `src/validation/authSchemas.ts`.

## Admin Question Management
The frontend includes an `/admin` dashboard which relies on the user service’s admin flag and the question service APIs.

- **Location:** `frontend/app/admin/page.tsx`
- **Features:** create, edit, and delete questions (load by slug or ID), with Ant Design UI and React Hook Form validation.
- **Supporting API Clients:** `frontend/lib/api-client.ts` exposes `createQuestion`, `updateQuestion`, `deleteQuestion`, `getQuestionBySlug`, etc.

### Using the Admin Page
1. Ensure the following services are running (via Docker Compose or individually):
   - `question_service` on `http://localhost:4003`
   - `frontend` on `http://localhost:3000`
   - `user_service` (for admin authentication)
2. Promote at least one account to admin via:
   ```bash
   curl -X PATCH \
     -H "Authorization: Bearer <admin_access_token>" \
     -H "Content-Type: application/json" \
     -d '{"isAdmin": true}' \
     http://localhost:4001/api/v1/auth/users/<userId>/admin
   ```
3. Sign in with that account and visit `http://localhost:3000/admin`.

### Question Service Integration
- Requires `NEXT_PUBLIC_QUESTION_SERVICE_URL` in the frontend `.env` (default `http://localhost:4003/api/v1/questions`).
- Question service exposes `GET /api/v1/questions/slug/:slug` for edit/delete flows.
- Starter-code fields exist for Python, JavaScript, Java, C++, and C.
