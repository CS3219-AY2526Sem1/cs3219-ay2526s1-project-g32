# PeerPrep – Frontend

## Overview
Next.js (App Router) app styled with Ant Design. Implements onboarding, login, magic-link verification, dashboard with active-session banner, admin screen, matching UI, session page, and read-only history view. Auth context persists Supabase tokens and shares them with child components.

## Tech Stack
- Next.js 14 (App Router, React 18)
- Ant Design 5
- Auth context with `useAuth` / `useRequireAuth`
- Monaco editor + Yjs client for collaboration sessions

## Running with Docker Compose
1. Copy `frontend/.env.example` to `.env` (or `.env.local`) and ensure the URLs match the Docker hostnames:  
   - `NEXT_PUBLIC_USER_SERVICE_URL=http://user:4001/api/v1`  
   - `NEXT_PUBLIC_MATCHING_SERVICE_URL=http://matching:3002/api/v1/matching`  
   - `NEXT_PUBLIC_COLLAB_SERVICE_URL=http://collaboration:4010/api/v1`  
   - `NEXT_PUBLIC_COLLAB_WS_URL=ws://collaboration:4010/collab`
2. From repo root:
   ```bash
   docker compose up --build frontend
   ```
3. App is available at `http://localhost:3000`. The container depends on user, matching, question, and collaboration services.

## Running Individually
```bash
npm install
npm run dev --workspace frontend
```
Build/start:
```bash
npm run build --workspace frontend
npm run start --workspace frontend
```

## Environment Variables
| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_USER_SERVICE_URL` | Base URL of user service (`/api/v1`) |
| `NEXT_PUBLIC_MATCHING_SERVICE_URL` | Matching service base (`/api/v1/matching`) |
| `NEXT_PUBLIC_COLLAB_SERVICE_URL` | Collaboration REST base |
| `NEXT_PUBLIC_COLLAB_WS_URL` | Collaboration WebSocket endpoint |
| `NEXT_PUBLIC_VERIFY_REDIRECT` | URL used in Supabase magic-link emails |

## Key Routes
- `/` – Landing page
- `/login`, `/register`, `/verify-email`, `/verify-success` – Auth flows
- `/dashboard` – Protected dashboard with active session banner
- `/matching`, `/matching/waiting` – Matching setup & waiting room
- `/session/[sessionId]` – Collaborative coding surface (Monaco + Yjs)
- `/history/[sessionId]` – Read-only view of saved session attempt
- `/admin` – Admin console (question CRUD + admin promotion)

Global styles live in `app/globals.css`. Ant Design theming is provided via `app/providers.tsx`.
