#!/bin/sh
set -e
cd /app

# If Compose (or .env) did not set DATABASE_URL, build it from POSTGRES_* (same defaults as postgres service).
if [ -z "${DATABASE_URL:-}" ]; then
  u="${POSTGRES_USER:-hekoti_user}"
  p="${POSTGRES_PASSWORD:-hekoti_password}"
  d="${POSTGRES_DB:-hekoti_db}"
  export DATABASE_URL="postgresql://${u}:${p}@hekoti-postgres:5432/${d}?schema=public"
fi

if [ "${HEKOTI_SKIP_MIGRATE:-0}" = "1" ]; then
  echo "HEKOTI_SKIP_MIGRATE=1: skipping prisma migrate deploy"
  exec node server.js
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

echo "Applying database migrations (prisma migrate deploy)..."
npx --yes prisma migrate deploy

exec node server.js
