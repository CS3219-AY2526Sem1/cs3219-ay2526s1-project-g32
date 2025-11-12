# Frontend (Next.js) Dockerfile - multi-stage
FROM node:18.20.1-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --prefer-offline --no-audit --no-fund; else npm install --no-audit --no-fund; fi

FROM node:18.20.1-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_USER_SERVICE_URL
ARG NEXT_PUBLIC_MATCHING_SERVICE_URL
ARG NEXT_PUBLIC_QUESTION_SERVICE_URL
ARG NEXT_PUBLIC_COLLAB_SERVICE_URL
ARG NEXT_PUBLIC_COLLAB_WS_URL
ARG NEXT_PUBLIC_VERIFY_REDIRECT
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_USER_SERVICE_URL=${NEXT_PUBLIC_USER_SERVICE_URL}
ENV NEXT_PUBLIC_MATCHING_SERVICE_URL=${NEXT_PUBLIC_MATCHING_SERVICE_URL}
ENV NEXT_PUBLIC_QUESTION_SERVICE_URL=${NEXT_PUBLIC_QUESTION_SERVICE_URL}
ENV NEXT_PUBLIC_COLLAB_SERVICE_URL=${NEXT_PUBLIC_COLLAB_SERVICE_URL}
ENV NEXT_PUBLIC_COLLAB_WS_URL=${NEXT_PUBLIC_COLLAB_WS_URL}
ENV NEXT_PUBLIC_VERIFY_REDIRECT=${NEXT_PUBLIC_VERIFY_REDIRECT}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18.20.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000
CMD ["npm", "start"]
