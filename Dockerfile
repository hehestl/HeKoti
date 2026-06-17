# syntax=docker/dockerfile:1
# Fast rebuilds: enable BuildKit — `export DOCKER_BUILDKIT=1` or `docker buildx build`.
# Layer cache: deps stages only re-run when package.json / lockfile change.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall runs install-banner.cjs; copy before npm ci (full tree comes later).
COPY scripts/install-banner.cjs scripts/install-banner.cjs
RUN --mount=type=cache,target=/root/.npm \
    SKIP_HEKOTI_BANNER=1 npm ci --prefer-offline --no-audit

# Production node_modules for the runner (Prisma CLI + full transitive tree).
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/install-banner.cjs scripts/install-banner.cjs
RUN --mount=type=cache,target=/root/.npm \
    SKIP_HEKOTI_BANNER=1 npm ci --omit=dev --prefer-offline --no-audit

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
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
COPY --chown=nextjs:nodejs VERSION ./VERSION
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3310
ENTRYPOINT ["/app/docker-entrypoint.sh"]
