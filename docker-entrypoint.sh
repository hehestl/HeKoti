#!/bin/sh
set -e
cd /app

if [ "${HEKOTI_SKIP_MIGRATE:-0}" = "1" ]; then
  echo "HEKOTI_SKIP_MIGRATE=1: skipping prisma migrate deploy"
  exec node server.js
fi

if [ ! -f prisma/schema.prisma ]; then
  echo "ERROR: /app/prisma/schema.prisma is missing in the image."
  echo "Rebuild the image from the current repo Dockerfile (it must COPY prisma/ into the runner stage)."
  exit 1
fi

echo "Applying database migrations (prisma migrate deploy)..."
npx --yes prisma migrate deploy --schema prisma/schema.prisma

exec node server.js
