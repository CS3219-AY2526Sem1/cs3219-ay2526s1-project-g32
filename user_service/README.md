# PeerPrep User Service

Node.js microservice for managing PeerPrep user accounts via Supabase Auth. It provides endpoints for registration, authentication, OTP verification, and profile management for other platform components.

## Tech Stack

- **Express + TypeScript**
- **Supabase Auth** (email/password + OTP)
- **Zod validation**
- **JWT verification** using Supabase JWT secret

## Getting Started

1. Duplicate `.env.example` into `.env` and fill in Supabase project credentials.
2. Install dependencies:

    `npm install`

3. Start the service:
    
    `npm run dev`

The service will listen on http://localhost:4001 by default.

