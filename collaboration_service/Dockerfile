# AI Assistance Disclosure:
# Scope: Implementation of Dockerfile build for Collaboration Service.
# Author Review: Validated for style and accuracy.


# Collaboration Service Dockerfile - multi-stage
FROM node:18.20.1-alpine AS builder
WORKDIR /app

# Copy package manifests and install deps (prefer lockfile)
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --prefer-offline --no-audit --no-fund; else npm install --no-audit --no-fund; fi

# Copy source and build
COPY . .
RUN npm run build

FROM node:18.20.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install prod deps
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --prefer-offline --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Use non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 4010
CMD ["node", "dist/server.js"]
