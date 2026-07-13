# syntax=docker/dockerfile:1
# Fast rebuilds: enable BuildKit — `export DOCKER_BUILDKIT=1` or `docker buildx build`.
# Layer cache: deps stages only re-run when package.json / lockfile change.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall runs install-banner.cjs; copy before npm ci (full tree comes later).
COPY scripts/install-banner.cjs scripts/install-banner.cjs
# DNS for build steps: /etc/docker/daemon.json → "dns": ["1.1.1.1","8.8.8.8"] (resolv.conf is read-only in BuildKit).
RUN --mount=type=cache,target=/root/.npm \
    SKIP_HEKOTI_BANNER=1 sh -ec 'npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-retry-maxtimeout 120000 && for i in 1 2 3 4 5; do npm ci --prefer-offline --no-audit && break || sleep 15; done'

# Production node_modules for the runner (Prisma CLI + full transitive tree).
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/install-banner.cjs scripts/install-banner.cjs
RUN --mount=type=cache,target=/root/.npm \
    SKIP_HEKOTI_BANNER=1 sh -ec 'npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-retry-maxtimeout 120000 && for i in 1 2 3 4 5; do npm ci --omit=dev --prefer-offline --no-audit && break || sleep 15; done'

FROM node:22-alpine AS builder
WORKDIR /app
ARG HEKOTI_APP_VERSION=0.0.0
# From compose build.args ← .env (no domain defaults in image).
ARG NEXT_PUBLIC_HERON_AUTH_URL=https://id.hehestl.su
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_HERON_OAUTH_CLIENT_ID=hekoti-wiki
ARG NEXT_PUBLIC_HERON_OAUTH_LEGACY_FRAGMENT=
COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV HEKOTI_APP_VERSION=${HEKOTI_APP_VERSION}
ENV NEXT_PUBLIC_HEKOTI_APP_VERSION=${HEKOTI_APP_VERSION}
ENV NEXT_PUBLIC_HERON_AUTH_URL=${NEXT_PUBLIC_HERON_AUTH_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_HERON_OAUTH_CLIENT_ID=${NEXT_PUBLIC_HERON_OAUTH_CLIENT_ID}
ENV NEXT_PUBLIC_HERON_OAUTH_LEGACY_FRAGMENT=${NEXT_PUBLIC_HERON_OAUTH_LEGACY_FRAGMENT}
RUN echo "hekoti build version=${HEKOTI_APP_VERSION}" \
    && npm run db:generate && npm run build \
    && test -f public/monaco-workers/editor.worker.js

FROM node:22-alpine AS runner
WORKDIR /app
ARG HEKOTI_APP_VERSION=0.0.0
ENV NODE_ENV=production
ENV HEKOTI_APP_VERSION=${HEKOTI_APP_VERSION}
# Docker sets HOSTNAME to the container id; Next standalone uses it for bind(). Force all interfaces.
ENV HOSTNAME=0.0.0.0
ENV PORT=3310
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 -G nodejs nextjs

COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=prod-deps /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs --from=builder /app/prisma ./prisma
COPY --chown=nextjs:nodejs --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --chown=nextjs:nodejs --from=builder /app/scripts ./scripts
COPY --chown=nextjs:nodejs --from=builder /app/VERSION ./VERSION
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3310
ENTRYPOINT ["/app/docker-entrypoint.sh"]
