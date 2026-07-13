#!/usr/bin/env sh
# List wiki users (Prisma + pg adapter).
set -eu

cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
. ./scripts/compose-prod-files.sh

docker compose ${COMPOSE_UP_ARGS} exec -T hekoti-app \
  node ./node_modules/tsx/dist/cli.mjs ./scripts/list-wiki-users.ts
