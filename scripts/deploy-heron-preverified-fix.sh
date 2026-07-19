#!/usr/bin/env bash
# Deploy hekoti instance with preVerified jti-replay fix (hemonea prod).
#
# Usage (world at /opt/app/prod/hh-world):
#   cd /opt/app/prod && git pull
#   bash deploy/scripts/sync-hekoti.sh world
#   cd /opt/app/prod/hh-world
#   bash scripts/deploy-heron-preverified-fix.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

inst="${HEKOTI_INSTANCE:-hekoti}"
container="hh-${inst}-app"
host="${HEKOTI_PUBLIC_HOST:-}"

echo "[deploy-heron-preverified] instance=$inst container=$container"

if grep -q 'adm\.mascotHint' src/components/admin-site-config.tsx 2>/dev/null \
  && ! grep -q '"mascotHint"' src/lib/messages/en.json 2>/dev/null; then
  echo "[deploy-heron-preverified] patching mascot i18n keys (build blocker)"
  bash "$ROOT/scripts/patch-mascot-i18n.sh" "$ROOT"
fi

if ! grep -q 'preVerified' src/lib/heron-exchange.ts 2>/dev/null; then
  echo "[deploy-heron-preverified] SOURCE_MISSING preVerified in src/lib/heron-exchange.ts" >&2
  if [ -f /opt/app/prod/hh-wiki/src/lib/heron-exchange.ts ]; then
    echo "[deploy-heron-preverified] copying heron-exchange.ts from hh-wiki"
    cp /opt/app/prod/hh-wiki/src/lib/heron-exchange.ts src/lib/heron-exchange.ts
  else
    echo "  Run: bash /opt/app/prod/deploy/scripts/sync-hekoti.sh $inst" >&2
    exit 1
  fi
fi

if ! grep -q 'resolveOrCreateUserFromHeron(resolved.accessToken, verified)' src/app/api/auth/heron/exchange/route.ts 2>/dev/null \
  && ! grep -q 'resolveOrCreateUserFromHeron(accessToken, token)' src/app/api/auth/heron/exchange/route.ts 2>/dev/null; then
  echo "[deploy-heron-preverified] patching route.ts — pass verified as 2nd arg" >&2
  sed -i 's/resolveOrCreateUserFromHeron(resolved\.accessToken)/resolveOrCreateUserFromHeron(resolved.accessToken, verified)/' \
    src/app/api/auth/heron/exchange/route.ts
fi

grep -n 'preVerified\|resolveOrCreateUserFromHeron' src/lib/heron-exchange.ts src/app/api/auth/heron/exchange/route.ts | head -6

COMPOSE_ARGS="-f docker-compose.yml"
if [ -f deploy/docker-compose.wiki-prod.yml ]; then
  COMPOSE_ARGS="$COMPOSE_ARGS -f deploy/docker-compose.wiki-prod.yml"
fi
if [ -f deploy/docker-compose.external-deps.yml ]; then
  COMPOSE_ARGS="$COMPOSE_ARGS -f deploy/docker-compose.external-deps.yml"
fi

echo "[deploy-heron-preverified] NO_CACHE rebuild"
NO_CACHE=1 docker compose $COMPOSE_ARGS build --no-cache hekoti-app
docker compose $COMPOSE_ARGS up -d --force-recreate hekoti-app

echo "[deploy-heron-preverified] verify fix in server bundle"
if docker exec "$container" sh -c 'grep -rq "preVerified=yes\|heron-exchange:resolve\|profile endpoints unavailable" /app/.next/server 2>/dev/null'; then
  echo "[deploy-heron-preverified] FIX_OK — Heron SSO bundle markers present in $container"
else
  echo "[deploy-heron-preverified] FIX_MISSING — rebuild did not include fix; check source + NO_CACHE" >&2
  exit 1
fi

echo "[deploy-heron-preverified] Heron env"
docker exec "$container" printenv HERON_JWT_AUDIENCE HERON_OAUTH_CLIENT_ID HERON_JWT_PUBLIC_KEY_PATH 2>/dev/null || true

if [ -n "$host" ]; then
  echo "[deploy-heron-preverified] smoke https://${host}/en"
  curl -sI "https://${host}/en" 2>/dev/null | head -3 || true
fi

echo "[deploy-heron-preverified] done — test SSO at https://${host:-<set HEKOTI_PUBLIC_HOST>}/auth/login"
