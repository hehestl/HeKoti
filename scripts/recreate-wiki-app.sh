#!/usr/bin/env sh
# Safe prod recreate: Traefik labels + hehe-net + external DB/Redis overrides.
# Never use bare `docker compose up` on hemonea — it drops Traefik routing (404).
#
#   cd /opt/app/prod/hh-wiki
#   sh scripts/recreate-wiki-app.sh
set -eu

cd "$(dirname "$0")/.."

if [ ! -f deploy/docker-compose.wiki-prod.yml ]; then
  echo "ERROR: missing deploy/docker-compose.wiki-prod.yml in $(pwd)" >&2
  echo "  git pull; bare docker-compose.yml has NO Traefik labels → 404 on wiki.hehestl.su" >&2
  exit 1
fi

if [ -f .env ]; then
  # shellcheck disable=SC1091
  . ./scripts/load-dotenv.sh
  load_dotenv .env
fi

# shellcheck disable=SC1091
. ./scripts/compose-prod-files.sh

pem_host="${HERON_JWT_PUBLIC_KEY_HOST_PATH:-/opt/app/prod/hh-heron-auth/secrets/heron_jwt_public.pem}"
if [ -f "$pem_host" ] && [ ! -d "$pem_host" ]; then
  chmod 444 "$pem_host" 2>/dev/null || true
fi

echo "==> compose files:${COMPOSE_UP_ARGS}"
echo "==> project: ${COMPOSE_PROJECT_NAME:-<unset>} instance: ${HEKOTI_INSTANCE:-wiki}"
echo "==> docker compose up -d --force-recreate --no-deps hekoti-app"
docker compose ${COMPOSE_UP_ARGS} up -d --force-recreate --no-deps hekoti-app

if docker network inspect hehe-net >/dev/null 2>&1; then
  echo "==> hehe-net members (expect traefik + hh-wiki-app):"
  docker network inspect hehe-net --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null \
    | tr ' ' '\n' | grep -E 'traefik|wiki' || true
fi

if [ -n "${HEKOTI_PUBLIC_HOST:-}" ]; then
  echo "==> Traefik labels on hh-${HEKOTI_INSTANCE:-wiki}-app:"
  docker inspect "hh-${HEKOTI_INSTANCE:-wiki}-app" --format '{{json .Config.Labels}}' 2>/dev/null \
    | tr ',' '\n' | grep traefik || echo "WARN: no traefik labels — check deploy/docker-compose.wiki-prod.yml" >&2
fi

if [ -x scripts/diagnose-wiki-traefik.sh ]; then
  bash scripts/diagnose-wiki-traefik.sh || true
fi

echo "==> done — https://${HEKOTI_PUBLIC_HOST:-wiki.hehestl.su}/en"
