#!/usr/bin/env bash
# Smoke POST /api/auth/heron/exchange — must return JSON (not HTML 404) and emit exchange logs.
set -euo pipefail

CONTAINER="${WIKI_CONTAINER:-hh-wiki-app}"
PORT="${HEKOTI_HOST_PORT:-3310}"
URL="http://127.0.0.1:${PORT}/api/auth/heron/exchange"
BODY='{"code":"probe","codeVerifier":"probe","redirectUri":"https://wiki.hehestl.su/auth/heron-callback"}'

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "[probe-wiki-heron-exchange-api] FAIL: container not running: $CONTAINER" >&2
  exit 1
fi

echo "== probe-wiki-heron-exchange-api ($CONTAINER, $URL) =="

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

http_code="$(curl -sS -o "$tmp" -w '%{http_code}' \
  -X POST "$URL" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data-binary "$BODY" || echo 000)"

content_type="$(curl -sSI -X POST "$URL" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data-binary "$BODY" 2>/dev/null | awk -F': ' 'tolower($1)=="content-type"{print $2; exit}' | tr -d '\r')"

echo "-- response --"
echo "http=${http_code}"
echo "content-type=${content_type:-<none>}"
head -c 400 "$tmp" | tr '\n' ' '
echo ""

if [[ "${content_type:-}" == *"text/html"* ]]; then
  echo "[probe-wiki-heron-exchange-api] FAIL: API returned HTML — route missing or wrong port" >&2
  exit 1
fi

if ! grep -q '"ok"' "$tmp" 2>/dev/null; then
  echo "[probe-wiki-heron-exchange-api] FAIL: body is not JSON API response" >&2
  exit 1
fi

echo "-- docker logs (heron exchange) --"
docker logs "$CONTAINER" --tail 200 2>&1 | grep -E 'heron-exchange|heron_exchange|heron_oidc' | tail -15 || echo "(no exchange log lines yet)"

if docker exec "$CONTAINER" sh -c "grep -rl 'heron_callback' /app/.next/static 2>/dev/null | head -1" | grep -q .; then
  echo "OK: heron_callback in client chunks"
else
  echo "WARN: heron_callback not in static chunks — NO_CACHE=1 sh scripts/deploy-update.sh"
fi

echo "[probe-wiki-heron-exchange-api] OK (http=${http_code})"
