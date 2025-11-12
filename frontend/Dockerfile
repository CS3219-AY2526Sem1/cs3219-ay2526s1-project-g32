# Frontend (Next.js) Dockerfile - multi-stage
FROM node:18.20.1-alpine AS deps
WORKDIR /app
# Copy only package.json to avoid using a lockfile generated on a different platform
# which may contain platform-specific entries (eg. @next/swc-win32...). This forces
# the image build to resolve dependencies for the build platform.
COPY package.json ./
## Ensure npm resolves platform-specific optional deps for the target image platform.
## If a package-lock.json was generated on a different OS (eg. Windows), npm may try to install
## platform-specific binaries for that OS (eg. @next/swc-win32...). Set the npm platform/arch
## and skip optional dependencies to avoid EBADPLATFORM errors during image builds on arm64.
ENV npm_config_platform=linux
ENV npm_config_arch=arm64
RUN npm install --no-optional --no-audit --no-fund

FROM node:18.20.1-alpine AS builder
WORKDIR /app
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
