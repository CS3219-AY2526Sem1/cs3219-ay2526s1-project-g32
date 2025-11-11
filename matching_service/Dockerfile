# Matching Service Dockerfile - multi-stage
FROM node:18.20.1-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --prefer-offline --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY . .
RUN npm run build

FROM node:18.20.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --prefer-offline --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi

COPY --from=builder /app/dist ./dist

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3002
CMD ["node", "dist/index.js"]
