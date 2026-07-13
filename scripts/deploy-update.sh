#!/usr/bin/env sh
# Hekoti wiki: pull + rebuild + recreate app (Profile A: /opt/app/prod/hh/core/wiki on hemonea).
# Usage:
#   sh scripts/deploy-update.sh
#   NO_CACHE=1 sh scripts/deploy-update.sh
#   SKIP_GIT_PULL=1 NO_CACHE=1 sh scripts/deploy-update.sh
set -eu

cd "$(dirname "$0")/.."

if [ ! -f scripts/load-dotenv.sh ]; then
  echo "ERROR: scripts/load-dotenv.sh missing in $(pwd)" >&2
  exit 1
fi

normalize_heron_env() {
  if [ ! -f .env ]; then
    return 0
  fi
  if grep -q 'heron\.hehestl\.com' .env 2>/dev/null; then
    echo "==> normalize .env: heron.hehestl.com → id.hehestl.su"
    sed -i 's|https://heron\.hehestl\.com|https://id.hehestl.su|g' .env
  fi
  if grep -qE '^NEXT_PUBLIC_HERON_OAUTH_LEGACY_FRAGMENT=' .env 2>/dev/null; then
    echo "==> normalize .env: remove NEXT_PUBLIC_HERON_OAUTH_LEGACY_FRAGMENT (PKCE only)"
    sed -i '/^NEXT_PUBLIC_HERON_OAUTH_LEGACY_FRAGMENT=/d' .env
  fi
  if grep -qE '^NEXT_PUBLIC_HERON_AUTH_URL=' .env 2>/dev/null; then
    sed -i 's|^NEXT_PUBLIC_HERON_AUTH_URL=.*|NEXT_PUBLIC_HERON_AUTH_URL=https://id.hehestl.su|' .env
  else
    echo "NEXT_PUBLIC_HERON_AUTH_URL=https://id.hehestl.su" >> .env
  fi
  if grep -qE '^NPM_PROXY_NETWORK=proxy-network' .env 2>/dev/null; then
    echo "==> normalize .env: NPM_PROXY_NETWORK proxy-network → hehe-net"
    sed -i '/^NPM_PROXY_NETWORK=proxy-network/d' .env
  fi
  if ! grep -qE '^TRAEFIK_PROXY_NETWORK=' .env 2>/dev/null; then
    echo "TRAEFIK_PROXY_NETWORK=hehe-net" >> .env
  fi
  if [ "${HEKOTI_INSTANCE:-wiki}" = "wiki" ] && ! grep -qE '^HEKOTI_PUBLIC_HOST=' .env 2>/dev/null; then
    echo "HEKOTI_PUBLIC_HOST=wiki.hehestl.su" >> .env
  fi
  if [ "${HEKOTI_INSTANCE:-wiki}" = "wiki" ] && ! grep -qE '^COMPOSE_PROJECT_NAME=' .env 2>/dev/null; then
    echo "COMPOSE_PROJECT_NAME=hh-wiki" >> .env
  fi
}

if [ -f .env ]; then
  normalize_heron_env
  # shellcheck disable=SC1091
  . ./scripts/load-dotenv.sh
  load_dotenv .env
fi

echo "==> deploy root: $(pwd)"
echo "==> COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-<unset>} HEKOTI_INSTANCE=${HEKOTI_INSTANCE:-wiki}"
echo "==> NEXT_PUBLIC_HERON_AUTH_URL=${NEXT_PUBLIC_HERON_AUTH_URL:-<unset>}"

if [ "${HEKOTI_INSTANCE:-wiki}" = "wiki" ] && [ "${COMPOSE_PROJECT_NAME:-}" != "hh-wiki" ]; then
  echo "WARN: wiki prod expects COMPOSE_PROJECT_NAME=hh-wiki (got ${COMPOSE_PROJECT_NAME:-<unset>})" >&2
  echo "  Wrong project creates hh-hekoti-app and port 3310 conflict with hh-wiki-app" >&2
fi

read_repo_version() {
  if [ ! -f VERSION ]; then
    echo "0.0.0"
    return
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    line=$(printf '%s' "$line" | tr -d '\r')
    case "$line" in
      ""|"#"*) continue ;;
      *) printf '%s' "$line"; return ;;
    esac
  done < VERSION
  echo "0.0.0"
}

REPO_VERSION_BEFORE=$(read_repo_version)
echo "==> repo VERSION (before pull): ${REPO_VERSION_BEFORE}"

if [ "${SKIP_GIT_PULL:-0}" = "1" ]; then
  echo "==> SKIP_GIT_PULL=1 — rebuild only (no git pull)"
  REPO_VERSION="$REPO_VERSION_BEFORE"
else
  echo "==> git pull (--autostash for local compose tweaks on the server)"
  if ! git pull --autostash --ff-only; then
    echo "ERROR: git pull failed. Local changes block update." >&2
    echo "  git status && git stash list" >&2
    exit 1
  fi
  if git stash list | grep -q .; then
    echo "WARN: git stash not empty after autostash — check compose conflicts: git stash show -p" >&2
  fi
  REPO_VERSION=$(read_repo_version)
fi

export HEKOTI_APP_VERSION="${REPO_VERSION}"
echo "==> repo VERSION (deploy): ${REPO_VERSION}"

if [ -f scripts/fix-lock-emnapi.cjs ]; then
  echo "==> sync package-lock @emnapi (npm ci in Alpine)"
  node scripts/fix-lock-emnapi.cjs
fi

if [ -x scripts/validate-compose.sh ]; then
  sh scripts/validate-compose.sh
fi

# shellcheck disable=SC1091
. ./scripts/compose-prod-files.sh

case "$COMPOSE_UP_ARGS" in
  *external-deps.yml*)
    echo "==> external deps: remove legacy embedded PG/Redis/LT containers if present"
    inst="${HEKOTI_INSTANCE:-wiki}"
    for c in "hh-${inst}-pg" "hh-${inst}-redis" "hh-${inst}-lt"; do
      docker rm -f "$c" 2>/dev/null || true
    done
    ;;
esac

if [ "${HEKOTI_INSTANCE:-wiki}" = "wiki" ] && [ -f deploy/docker-compose.wiki-prod.yml ]; then
  echo "==> HEKOTI_INSTANCE=wiki: Traefik hehe-net (deploy/docker-compose.wiki-prod.yml)"
fi

echo "==> docker compose build hekoti-app ${COMPOSE_UP_ARGS}"
if [ "${NO_CACHE:-0}" = "1" ]; then
  docker compose ${COMPOSE_UP_ARGS} build --no-cache hekoti-app
else
  docker compose ${COMPOSE_UP_ARGS} build hekoti-app
fi

echo "==> docker compose up -d --force-recreate --no-deps hekoti-app"
docker compose ${COMPOSE_UP_ARGS} up -d --force-recreate --no-deps hekoti-app

echo "==> waiting for health (up to 120s)"
i=0
while [ "$i" -lt 24 ]; do
  if docker compose ${COMPOSE_UP_ARGS} exec -T hekoti-app node /app/scripts/docker-healthcheck.cjs 2>/dev/null; then
    echo "health: ok"
    break
  fi
  i=$((i + 1))
  sleep 5
done

CONTAINER_VERSION=$(docker compose ${COMPOSE_UP_ARGS} exec -T hekoti-app sh -c 'tr -d "\r" < /app/VERSION | head -1' 2>/dev/null || echo "unknown")
echo "==> container /app/VERSION: ${CONTAINER_VERSION}"

SMOKE_PORT="${HEKOTI_HOST_PORT:-${PORT:-3310}}"
if curl -sf "http://127.0.0.1:${SMOKE_PORT}/en" | grep -q 'help-center'; then
  echo "help-center: found in HTML"
else
  echo "help-center: NOT found on port ${SMOKE_PORT}"
fi

if [ -f scripts/diagnose-wiki-heron-bake.sh ]; then
  bash scripts/diagnose-wiki-heron-bake.sh || true
fi

if [ -f scripts/probe-wiki-heron-exchange-api.sh ]; then
  bash scripts/probe-wiki-heron-exchange-api.sh || true
fi

if [ -f scripts/verify-heron-exchange-bake.sh ]; then
  bash scripts/verify-heron-exchange-bake.sh || true
fi

docker compose ${COMPOSE_UP_ARGS} ps hekoti-app
