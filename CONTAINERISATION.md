# Containerisation (one service = one container)

This repository uses a one-container-per-service approach. Each microservice has its own Dockerfile and image so you can build and scale them independently.

Included files:

- `*/Dockerfile` and `*/.dockerignore` for each service
- `docker-compose.yml` to build and run services and infra (redis, rabbitmq)
- `docker-compose.override.yml` to enable hot-reload during development
- `.env.example` to document required environment variables

Quick start (development)

1. Copy environment example and edit: `cp .env.example .env` and fill secrets.
2. From project root run:

```bash
docker compose up --build
```

This uses the override to mount source and run `npm run dev` in each service for hot-reload.

Quick start (production-style)

1. Build production images and run (no override):

```bash
docker compose -f docker-compose.yml up --build -d
```

Notes
- Dockerfiles install dependencies and run builds inside the image so contributors don't need Node/tsc locally to run the full system.
- The Dockerfiles try `npm ci` when a `package-lock.json` exists and fall back to `npm install` if not.
- Keep `.env` out of source control. Use `.env.example` to document required variables.
