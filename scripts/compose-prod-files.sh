#!/usr/bin/env sh
# Build docker compose -f flags for prod wiki (Traefik + external DB/Redis).
# Source from deploy root after .env is loaded:
#   . ./scripts/compose-prod-files.sh
#   docker compose ${COMPOSE_UP_ARGS} up -d --force-recreate --no-deps hekoti-app
set -eu

COMPOSE_UP_ARGS="-f docker-compose.yml"

if [ "${HEKOTI_INSTANCE:-wiki}" = "wiki" ] && [ -f deploy/docker-compose.wiki-prod.yml ]; then
  COMPOSE_UP_ARGS="${COMPOSE_UP_ARGS} -f deploy/docker-compose.wiki-prod.yml"
elif [ -n "${HEKOTI_PUBLIC_HOST:-}" ] && [ -f deploy/docker-compose.traefik.yml ]; then
  COMPOSE_UP_ARGS="${COMPOSE_UP_ARGS} -f deploy/docker-compose.traefik.yml"
fi

if [ -f deploy/docker-compose.external-deps.yml ] \
  && { [ "${HEKOTI_INSTANCE:-wiki}" = "wiki" ] || [ -n "${HEKOTI_DB_DOCKER_NETWORK:-}" ]; }; then
  COMPOSE_UP_ARGS="${COMPOSE_UP_ARGS} -f deploy/docker-compose.external-deps.yml"
fi

if [ -f deploy/docker-compose.external-db.yml ] && [ -n "${HEKOTI_DB_DOCKER_NETWORK:-}" ] \
  && [ "${HEKOTI_INSTANCE:-}" != "wiki" ]; then
  COMPOSE_UP_ARGS="${COMPOSE_UP_ARGS} -f deploy/docker-compose.external-db.yml"
fi

if [ -f deploy/docker-compose.external-lt.yml ] && [ "${HEKOTI_LT_MODE:-}" = "external" ]; then
  COMPOSE_UP_ARGS="${COMPOSE_UP_ARGS} -f deploy/docker-compose.external-lt.yml"
fi
