#!/bin/sh
set -e
cd /app

node ./scripts/install-banner.cjs --startup

# Next.js standalone uses process.env.HOSTNAME for bind(). Docker injects a non-empty HOSTNAME (container id),
# so we must set this here — not only in the image ENV — so it wins over the runtime default.
export HOSTNAME=0.0.0.0
export HEKOTI_ENFORCE_PROD_SECRETS=1

# Fail fast before migrate if production secrets are missing (otherwise node server.js crashes → NPM 502).
if [ "${HEKOTI_ENFORCE_PROD_SECRETS}" = "1" ]; then
  for name in WEBHOOK_SECRET AUTH_PENDING_SECRET HEKOTI_TOTP_ENCRYPTION_KEY; do
    eval "val=\${$name:-}"
    if [ -z "$val" ] || [ "${#val}" -lt 32 ]; then
      echo "ERROR: $name must be set in .env (at least 32 characters). See .env.example"
      echo "  Generate: openssl rand -hex 32"
      exit 1
    fi
  done
fi

# If Compose (or .env) did not set DATABASE_URL, build it from POSTGRES_* (same defaults as postgres service).
if [ -z "${DATABASE_URL:-}" ]; then
  u="${POSTGRES_USER:-hekoti_user}"
  p="${POSTGRES_PASSWORD:-hekoti_password}"
  d="${POSTGRES_DB:-hekoti_db}"
  h="${POSTGRES_HOST:-hekoti-postgres}"
  export DATABASE_URL="postgresql://${u}:${p}@${h}:5432/${d}?schema=public"
fi

if [ "${HEKOTI_SKIP_MIGRATE:-0}" = "1" ]; then
  echo "HEKOTI_SKIP_MIGRATE=1: skipping prisma migrate deploy"
  exec env HOSTNAME=0.0.0.0 PORT="${PORT:-3310}" node server.js
fi

if [ ! -f prisma/schema.prisma ]; then
  echo "ERROR: /app/prisma/schema.prisma is missing in the image."
  echo "Rebuild the image from the current repo Dockerfile (it must COPY prisma/ into the runner stage)."
  exit 1
fi

if [ ! -f prisma.config.ts ]; then
  echo "ERROR: /app/prisma.config.ts is missing in the image (required for Prisma 7 migrate + datasource URL)."
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is empty. Set DATABASE_URL or POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB (see docker-compose.yml)."
  exit 1
fi

echo "Checking migrations for destructive SQL (DROP*/TRUNCATE)..."
node ./scripts/check-prisma-migrations-destructive.cjs

echo "Applying database migrations (prisma migrate deploy)..."
# Do not use `npx prisma`: standalone images omit `node_modules/.bin`, so npx falls back to PATH (`sh: prisma: not found`).
node ./node_modules/prisma/build/index.js migrate deploy

echo "Ensuring admin user (scripts/ensure-admin.ts)..."
node ./node_modules/tsx/dist/cli.mjs ./scripts/ensure-admin.ts

echo "Starting Next.js (HOSTNAME=0.0.0.0 PORT=${PORT:-3310})..."
exec env HOSTNAME=0.0.0.0 PORT="${PORT:-3310}" node server.js
