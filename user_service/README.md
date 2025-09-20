# PeerPrep User Service

Node.js microservice for managing PeerPrep user accounts via Supabase Auth. Provides endpoints for registration, authentication, OTP verification, and profile management for other platform components.

## Tech Stack

- **Express + TypeScript**
- **Supabase Auth** (email/password + OTP)
- **Zod validation**
- **JWT verification** using Supabase JWT secret

## Getting Started

1. Duplicate `.env.example` into `.env` and fill in the Supabase project credentials listed below.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the service:

   ```bash
   npm run dev
   ```

The service listens on `http://localhost:4001` by default.

## Required Environment Variables

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Base URL of your Supabase project (from Project Settings > API). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key with elevated privileges for admin actions (keep this secret!). |
| `SUPABASE_ANON_KEY` | Public anon key used for end-user interactions when elevated privileges are not needed. |
| `SUPABASE_JWT_SECRET` | JWT secret configured in Supabase Auth (Project Settings > API). |
| `PORT` | (Optional) Port to run the service on; defaults to `4001`. |
| `CORS_ALLOWED_ORIGINS` | (Optional) Comma-separated list of allowed origins for CORS. |

## Supabase Setup Checklist

1. Create a Supabase project (or use an existing one) and capture the values above from **Project Settings > API Keys**.
2. Under **Authentication > Settings**, enable email/password sign-ins and configure OTP policies per requirements.
3. Run the Supabase CLI to generate strongly typed bindings once your schema is ready:

   ```bash
   supabase gen types typescript --project-id <project-id> --schema public > src/types/supabase.ts
   ```

4. If you customise the JWT secret in Supabase, mirror it in your `.env` so the service can validate Supabase-issued access tokens.
5. Share the anon key with frontend services only; keep the service role key limited to backend services like this user service.

## API Overview

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/send-otp`
- `POST /api/v1/auth/verify-otp`
- `GET /api/v1/profile/me`
