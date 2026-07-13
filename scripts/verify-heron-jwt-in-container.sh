#!/usr/bin/env bash
# Проверка: HERON_JWT_PUBLIC_KEY_PATH и PEM видны внутри hekoti-app (wiki instance).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${HEKOTI_ENV_FILE:-$ROOT/.env}"
PEM_HOST="$ROOT/secrets/heron_jwt_public.pem"
CONTAINER="${HEKOTI_APP_CONTAINER:-hh-${HEKOTI_INSTANCE:-wiki}-app}"
CONTAINER_PATH="/run/secrets/heron_jwt_public.pem"

fail=0

echo "[verify-heron-jwt] host PEM"
if [[ ! -f "$PEM_HOST" ]]; then
  echo "  FAIL: $PEM_HOST missing — bash scripts/sync-heron-jwt-public-pem.sh" >&2
  fail=1
elif [[ ! -s "$PEM_HOST" ]]; then
  echo "  FAIL: $PEM_HOST is empty" >&2
  fail=1
else
  echo "  OK $(ls -l "$PEM_HOST")"
  echo "  sha256: $(sha256sum "$PEM_HOST" | awk '{print $1}')"
fi

echo "[verify-heron-jwt] .env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "  WARN: $ENV_FILE missing" >&2
else
  if grep -qE '^HERON_JWT_PUBLIC_KEY_PATH=/run/secrets/heron_jwt_public.pem' "$ENV_FILE"; then
    echo "  OK HERON_JWT_PUBLIC_KEY_PATH in .env"
  else
    echo "  WARN: add HERON_JWT_PUBLIC_KEY_PATH=/run/secrets/heron_jwt_public.pem to $ENV_FILE" >&2
  fi
fi

if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
  echo "[verify-heron-jwt] container $CONTAINER not running — skip in-container checks" >&2
  exit "$fail"
fi

echo "[verify-heron-jwt] inside container $CONTAINER"
env_path="$(docker exec "$CONTAINER" printenv HERON_JWT_PUBLIC_KEY_PATH 2>/dev/null || true)"
if [[ "$env_path" == "$CONTAINER_PATH" ]]; then
  echo "  OK HERON_JWT_PUBLIC_KEY_PATH=$env_path"
else
  echo "  FAIL HERON_JWT_PUBLIC_KEY_PATH=${env_path:-<unset>} (expected $CONTAINER_PATH)" >&2
  echo "  FIX: docker compose up -d --force-recreate hekoti-app" >&2
  fail=1
fi

if docker exec "$CONTAINER" test -r "$CONTAINER_PATH" 2>/dev/null; then
  echo "  OK PEM readable at $CONTAINER_PATH"
  docker exec "$CONTAINER" head -1 "$CONTAINER_PATH" 2>/dev/null | grep -q 'BEGIN PUBLIC KEY' \
    && echo "  OK PEM header" \
    || { echo "  FAIL invalid PEM header" >&2; fail=1; }
  docker exec "$CONTAINER" sha256sum "$CONTAINER_PATH" 2>/dev/null | awk '{print "  container sha256:", $1}'
else
  echo "  FAIL PEM not mounted at $CONTAINER_PATH" >&2
  echo "  FIX: ensure docker-compose.yml volumes + recreate hekoti-app" >&2
  fail=1
fi

exit "$fail"
