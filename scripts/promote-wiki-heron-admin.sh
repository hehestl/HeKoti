#!/usr/bin/env sh
# Promote Heron SSO user(s) to ADMIN.
# Usage:
#   sh scripts/promote-wiki-heron-admin.sh
#   HERON_SUB=<uuid> sh scripts/promote-wiki-heron-admin.sh
set -eu

cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
. ./scripts/compose-prod-files.sh

docker compose ${COMPOSE_UP_ARGS} exec -T \
  -e "HERON_SUB=${HERON_SUB:-}" \
  hekoti-app node ./node_modules/tsx/dist/cli.mjs ./scripts/promote-heron-admin.ts
