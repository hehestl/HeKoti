#!/usr/bin/env sh
# Validate merged compose YAML before build (catches autostash conflict damage).
set -eu

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  # shellcheck disable=SC1091
  . ./scripts/load-dotenv.sh
  load_dotenv .env
fi

# shellcheck disable=SC1091
. ./scripts/compose-prod-files.sh

echo "==> validate-compose: ${COMPOSE_UP_ARGS}"

if grep -nE '^(<<<<<<<|=======|>>>>>>>)' docker-compose.yml deploy/docker-compose.*.yml 2>/dev/null; then
  echo "ERROR: git merge conflict markers in compose files — resolve before deploy" >&2
  exit 1
fi

if ! head -12 docker-compose.yml | grep -q '^#'; then
  echo "WARN: docker-compose.yml lines 1-12 should be comments — check line 8 starts with #" >&2
  sed -n '6,10p' docker-compose.yml >&2
fi

if ! docker compose ${COMPOSE_UP_ARGS} config -q 2>/dev/null; then
  echo "ERROR: docker compose config failed (often line 8 comment lost after git autostash conflict)" >&2
  echo "  Fix: ensure docker-compose.yml line 8 begins with #:" >&2
  echo "  # Prod data/logs bind: /var/lib/hh/{instance}/data" >&2
  sed -n '1,15p' docker-compose.yml >&2
  exit 1
fi

echo "[validate-compose] OK"
