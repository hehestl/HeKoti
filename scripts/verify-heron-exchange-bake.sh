#!/usr/bin/env bash
# Detect stale Heron exchange bundle (throws "profile unavailable" without jwt.sub fallback).
set -euo pipefail

CONTAINER="${HEKOTI_APP_CONTAINER:-hh-${HEKOTI_INSTANCE:-wiki}-app}"
SRC="${HEKOTI_SRC:-$(pwd)/src/lib/heron-exchange.ts}"
FAIL=0

echo "== verify-heron-exchange-bake ($CONTAINER) =="

if [[ -f "$SRC" ]]; then
  if grep -q 'preVerified' "$SRC"; then
    echo "OK: source has preVerified jti-replay fix"
  else
    echo "FAIL: source missing preVerified — git pull required" >&2
    FAIL=1
  fi
  if grep -q 'Heron profile unavailable' "$SRC"; then
    echo "FAIL: source still throws profile unavailable — git pull required" >&2
    FAIL=1
  elif grep -q 'profile endpoints unavailable; using verified jwt.sub' "$SRC"; then
    echo "OK: source has jwt.sub fallback"
  else
    echo "WARN: cannot confirm fallback in $SRC" >&2
  fi
fi

if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  if docker exec "$CONTAINER" sh -c 'grep -rq preVerified /app/.next/server 2>/dev/null'; then
    echo "OK: image has preVerified in server bundle"
  else
    echo "FAIL: image missing preVerified — NO_CACHE=1 sh scripts/deploy-update.sh" >&2
    FAIL=1
  fi
  if docker exec "$CONTAINER" sh -c 'grep -rq "Heron profile unavailable" /app/.next/server 2>/dev/null'; then
    echo "FAIL: running image still has OLD exchange code — NO_CACHE=1 sh scripts/deploy-update.sh" >&2
    FAIL=1
  else
    echo "OK: image server bundle has no profile-unavailable throw"
  fi
  if docker exec "$CONTAINER" sh -c 'grep -rq "profile endpoints unavailable" /app/.next/server 2>/dev/null'; then
    echo "OK: image has jwt.sub fallback strings"
  else
    echo "WARN: fallback string not found in image — rebuild may be stale" >&2
  fi
  echo "-- container HERON_* --"
  docker exec "$CONTAINER" printenv HERON_JWT_AUDIENCE HERON_AUTH_API_URL HERON_JWT_ISSUER HERON_OAUTH_CLIENT_ID 2>/dev/null || true
fi

[[ "$FAIL" -eq 0 ]] && echo "[verify-heron-exchange-bake] OK" || exit 1
