# PeerPrep Frontend

Next.js App Router frontend styled with Ant Design. Provides onboarding, login, magic-link verification flows, and a shared auth context that other microservice UIs can reuse.

## Getting Started

1. Duplicate `.env.example` into `.env.local` and update the URLs if your user service runs somewhere else.
2. Install dependencies from the repo root (workspace-aware):

   ```bash
   npm install
   ```

3. Start the dev server:

   ```bash
   npm run dev --workspace frontend
   ```

The app runs on `http://localhost:3000` by default.

## Key Folders

- `app/` – App Router routes (`page.tsx`, `login/page.tsx`, `register/page.tsx`, `verify-email/page.tsx`, `verify-success/page.tsx`, `dashboard/page.tsx`) plus layout/providers.
- `app/session/[sessionId]/page.tsx` – Collaboration coding surface (question panel + Monaco editor scaffold, presently using mock data).
- `context/AuthContext.tsx` – Stores session state, hydrates from `localStorage`, and fetches `/auth/me` when a token is present.
- `hooks/` – `useAuth` for consuming the context and `useRequireAuth` for guarding routes.
- `lib/api-client.ts` – Typed fetch wrapper for all user-service endpoints.

## UI System

- Ant Design components are used throughout (`Form`, `Card`, `Layout`, `Button`, etc.).
- Custom branding tweaks live in `app/providers.tsx` via `ConfigProvider`, with lightweight global styles in `app/globals.css`.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_USER_SERVICE_URL` | Base URL for the user service (`http://localhost:4001/api/v1` by default). |
| `NEXT_PUBLIC_VERIFY_REDIRECT` | URL embedded in Supabase magic-link emails (`http://localhost:3000/verify-success`). |
| `NEXT_PUBLIC_COLLAB_SERVICE_URL` | Collaboration service REST base (`http://localhost:4010/api/v1`). |
| `NEXT_PUBLIC_COLLAB_WS_URL` | Collaboration WebSocket endpoint (`ws://localhost:4010/collab`). |

## Flow Overview

1. **Register** – Collects username/email/password and triggers the user service to send a Supabase magic link.
2. **Verify Email** – Confirms that the link was sent and directs the user to their inbox.
3. **Magic Link** – Supabase redirects verified users to `/verify-success`, which prompts them to log in.
4. **Login & Dashboard** – Authenticates with email/password and renders the protected dashboard.

## Next Steps

- Integrate future microservice data into the dashboard (sessions, peer feedback, analytics).
- Add end-to-end tests (Playwright/Cypress) once the broader system stabilises.
- Replace `localStorage` session persistence with secure cookies when a gateway or SSR strategy is defined.
