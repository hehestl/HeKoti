#!/usr/bin/env bash
# Verify Heron IdP URL baked into Next.js client chunks (not runtime printenv).
set -euo pipefail

CONTAINER="${WIKI_CONTAINER:-hh-wiki-app}"
STATIC_DIR="${WIKI_STATIC_DIR:-/app/.next/static}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "[diagnose-wiki-heron-bake] FAIL: container not running: $CONTAINER" >&2
  exit 1
fi

legacy_hits="$(docker exec "$CONTAINER" sh -c "grep -rl 'heron.hehestl.com' '$STATIC_DIR' 2>/dev/null | head -5" || true)"
id_hits="$(docker exec "$CONTAINER" sh -c "grep -rl 'id.hehestl.su' '$STATIC_DIR' 2>/dev/null | head -5" || true)"
legacy_flow="$(docker exec "$CONTAINER" sh -c "grep -rl 'HERON_OAUTH_LEGACY_FRAGMENT' '$STATIC_DIR' 2>/dev/null | head -3" || true)"
pkce_flow="$(docker exec "$CONTAINER" sh -c "grep -rl 'oauth2/authorize' '$STATIC_DIR' 2>/dev/null | head -3" || true)"
callback_log="$(docker exec "$CONTAINER" sh -c "grep -rl 'heron_callback' '$STATIC_DIR' 2>/dev/null | head -3" || true)"

echo "== diagnose-wiki-heron-bake ($CONTAINER) =="

if [[ -n "$legacy_hits" ]]; then
  echo "[diagnose-wiki-heron-bake] FAIL: baked JS still contains heron.hehestl.com"
  echo "$legacy_hits"
  echo "  Fix: edit .env (NEXT_PUBLIC_HERON_AUTH_URL=https://id.hehestl.su), remove LEGACY_FRAGMENT, then:"
  echo "  SKIP_GIT_PULL=1 NO_CACHE=1 sh scripts/deploy-update.sh"
  exit 1
fi

if [[ -n "$id_hits" ]]; then
  echo "[diagnose-wiki-heron-bake] OK: id.hehestl.su found in client chunks"
else
  echo "[diagnose-wiki-heron-bake] WARN: id.hehestl.su not found in $STATIC_DIR — rebuild with NEXT_PUBLIC_HERON_AUTH_URL"
fi

if [[ -n "$legacy_flow" ]] && docker exec "$CONTAINER" sh -c "grep -r 'LEGACY_FRAGMENT' '$STATIC_DIR' 2>/dev/null | grep -q '=\"1\"\\|=\"true\"'" 2>/dev/null; then
  echo "[diagnose-wiki-heron-bake] FAIL: LEGACY_FRAGMENT=1 baked — expect /login?return_to= not PKCE"
  exit 1
fi

if [[ -n "$pkce_flow" ]]; then
  echo "[diagnose-wiki-heron-bake] OK: oauth2/authorize (PKCE) in client chunks"
else
  echo "[diagnose-wiki-heron-bake] WARN: oauth2/authorize not found — may be old bundle"
fi

if [[ -n "$callback_log" ]]; then
  echo "[diagnose-wiki-heron-bake] OK: heron_callback logging in client chunks"
else
  echo "[diagnose-wiki-heron-bake] FAIL: heron_callback not in static chunks — stale image"
  echo "  Fix: NO_CACHE=1 sh scripts/deploy-update.sh"
  exit 1
fi

echo "[diagnose-wiki-heron-bake] PASS"
