#!/usr/bin/env bash
# Wiki + Heron PKCE preflight (run on Hedra or dev host with docker access).
set -euo pipefail

WIKI_CONTAINER="${WIKI_CONTAINER:-hh-wiki-app}"
HERON_FE="${HERON_FE:-heron-auth-fe}"
HERON_ENV="${HERON_ENV:-/opt/app/prod/hh-heron-auth/.env}"
WIKI_CALLBACK="${WIKI_CALLBACK:-https://wiki.hehestl.su/auth/heron-callback}"
HERON_BFF_HOST="${HERON_BFF_HOST:-heron-auth:8080}"

fail=0

warn() {
  echo "[preflight-wiki-heron] FAIL: $*" >&2
  fail=1
}

ok() {
  echo "[preflight-wiki-heron] OK: $*"
}

echo "== Wiki + Heron preflight =="
echo "wiki container: $WIKI_CONTAINER"
echo "heron fe: $HERON_FE"

# 1. Wiki NEXT_PUBLIC_* baked
if docker exec "$WIKI_CONTAINER" printenv NEXT_PUBLIC_HERON_AUTH_URL 2>/dev/null | grep -q .; then
  pub="$(docker exec "$WIKI_CONTAINER" printenv NEXT_PUBLIC_HERON_AUTH_URL)"
  ok "NEXT_PUBLIC_HERON_AUTH_URL=$pub"
else
  warn "NEXT_PUBLIC_HERON_AUTH_URL empty in $WIKI_CONTAINER (rebuild with --no-cache)"
fi

if docker exec "$WIKI_CONTAINER" printenv NEXT_PUBLIC_APP_URL 2>/dev/null | grep -q .; then
  app="$(docker exec "$WIKI_CONTAINER" printenv NEXT_PUBLIC_APP_URL)"
  ok "NEXT_PUBLIC_APP_URL=$app"
else
  warn "NEXT_PUBLIC_APP_URL empty in $WIKI_CONTAINER"
fi

if docker exec "$WIKI_CONTAINER" printenv NEXT_PUBLIC_HERON_OAUTH_CLIENT_ID 2>/dev/null | grep -q .; then
  ok "NEXT_PUBLIC_HERON_OAUTH_CLIENT_ID set"
else
  warn "NEXT_PUBLIC_HERON_OAUTH_CLIENT_ID empty in $WIKI_CONTAINER"
fi

# 2. Heron public base URL (not legacy)
if [[ -f "$HERON_ENV" ]]; then
  heron_pub="$(grep -E '^HERON_PUBLIC_BASE_URL=' "$HERON_ENV" | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
  if [[ "$heron_pub" == *"heron.hehestl.com"* ]]; then
    warn "HERON_PUBLIC_BASE_URL still legacy: $heron_pub"
  elif [[ -n "$heron_pub" ]]; then
    ok "HERON_PUBLIC_BASE_URL=$heron_pub"
  else
    warn "HERON_PUBLIC_BASE_URL not set in $HERON_ENV"
  fi
else
  echo "[preflight-wiki-heron] skip HERON_ENV (file not found: $HERON_ENV)"
fi

# 3. Heron FE → API internal
if docker exec "$HERON_FE" printenv HERON_AUTH_API_URL 2>/dev/null | grep -q .; then
  api_url="$(docker exec "$HERON_FE" printenv HERON_AUTH_API_URL)"
  if [[ "$api_url" == https://* ]] || [[ "$api_url" == *"id.hehestl"* ]]; then
    warn "HERON_AUTH_API_URL should be internal (http://heron-auth:8080), got: $api_url"
  else
    ok "HERON_AUTH_API_URL=$api_url"
  fi
else
  warn "HERON_AUTH_API_URL not set in $HERON_FE"
fi

# 4. Wiki → Heron BFF network
if docker exec "$WIKI_CONTAINER" wget -qO- --timeout=3 "http://${HERON_BFF_HOST}/health" >/dev/null 2>&1; then
  ok "wiki can reach http://${HERON_BFF_HOST}/health"
else
  warn "wiki cannot reach http://${HERON_BFF_HOST}/health (attach hh-network?)"
fi

# 5. Wiki JWT key configured (env + mount)
CONTAINER_PATH="/run/secrets/heron_jwt_public.pem"
if docker exec "$WIKI_CONTAINER" printenv HERON_JWT_PUBLIC_KEY_PEM 2>/dev/null | grep -q "BEGIN PUBLIC KEY"; then
  ok "HERON_JWT_PUBLIC_KEY_PEM set in wiki (dev inline)"
elif docker exec "$WIKI_CONTAINER" printenv HERON_JWT_PUBLIC_KEY_PATH 2>/dev/null | grep -q .; then
  jwt_path="$(docker exec "$WIKI_CONTAINER" printenv HERON_JWT_PUBLIC_KEY_PATH)"
  ok "HERON_JWT_PUBLIC_KEY_PATH=$jwt_path"
  if docker exec "$WIKI_CONTAINER" test -r "$CONTAINER_PATH" 2>/dev/null; then
    docker exec "$WIKI_CONTAINER" head -1 "$CONTAINER_PATH" 2>/dev/null | grep -q 'BEGIN PUBLIC KEY' \
      && ok "PEM readable at $CONTAINER_PATH" \
      || warn "PEM at $CONTAINER_PATH has invalid header"
  else
    warn "PEM not mounted at $CONTAINER_PATH — bash scripts/sync-heron-jwt-public-pem.sh && docker compose up -d --force-recreate hekoti-app"
  fi
else
  warn "wiki missing HERON_JWT_PUBLIC_KEY_PEM or HERON_JWT_PUBLIC_KEY_PATH"
fi

# 6. Optional: OAuth redirect_uris in DB
if [[ -n "${DATABASE_URL:-}" ]] && command -v psql >/dev/null 2>&1; then
  su_ok="$(psql "$DATABASE_URL" -tAc "SELECT '${WIKI_CALLBACK}' = ANY(redirect_uris) FROM heron.oauth_clients WHERE client_id = 'hekoti-wiki';" 2>/dev/null || echo "f")"
  if [[ "$su_ok" == "t" ]]; then
    ok "hekoti-wiki redirect_uris contains $WIKI_CALLBACK"
  else
    warn "hekoti-wiki redirect_uris missing $WIKI_CALLBACK (run migration 0138)"
  fi
fi

# 7. Optional: PKCE smoke (authorize → wiki callback)
if command -v curl >/dev/null 2>&1; then
  if [[ -f "$(dirname "$0")/smoke-wiki-heron-pkce.sh" ]]; then
    bash "$(dirname "$0")/smoke-wiki-heron-pkce.sh" || fail=1
  fi
fi

if [[ "$fail" -ne 0 ]]; then
  echo "[preflight-wiki-heron] FAILED — see docs/ops-wiki-pkce-deploy.md"
  exit 1
fi

echo "[preflight-wiki-heron] PASS"
