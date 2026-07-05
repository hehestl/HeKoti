#!/usr/bin/env bash
# Wiki PKCE smoke: silent authorize redirects to wiki callback with login_required or code.
set -euo pipefail

PUBLIC="${HERON_PUBLIC_BASE_URL:-https://id.hehestl.su}"
PUBLIC="${PUBLIC%/}"
REDIRECT_URI="${HERON_SMOKE_CALLBACK:-https://wiki.hehestl.su/auth/heron-callback}"
CLIENT_ID="${HERON_SMOKE_CLIENT_ID:-hekoti-wiki}"

echo "== Wiki Heron PKCE smoke =="
echo "public: $PUBLIC"
echo "redirect_uri: $REDIRECT_URI"

fail=0

if [[ "$PUBLIC" == *"heron.hehestl.com"* ]]; then
  echo "[smoke-wiki-pkce] FAIL legacy heron.hehestl.com" >&2
  fail=1
fi

state="smoke-wiki-state"
challenge="smoke-wiki-challenge-not-valid-but-redirect-ok"
auth_q="client_id=${CLIENT_ID}&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${REDIRECT_URI}'''))")&response_type=code&scope=openid&state=${state}&code_challenge=${challenge}&code_challenge_method=S256&prompt=none"
auth_url="${PUBLIC}/oauth2/authorize?${auth_q}"

headers="$(mktemp)"
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 -D "$headers" "$auth_url" 2>/dev/null || echo "000")"
location="$(grep -i '^location:' "$headers" | tail -1 | cut -d' ' -f2- | tr -d '\r\n' || true)"
rm -f "$headers"

echo "[smoke-wiki-pkce] GET /oauth2/authorize?prompt=none → HTTP $code"
echo "[smoke-wiki-pkce]   Location: ${location:-<none>}"

if [[ ! "$code" =~ ^(302|303|307|308)$ ]]; then
  echo "[smoke-wiki-pkce] FAIL expected redirect" >&2
  fail=1
elif [[ -z "$location" ]]; then
  echo "[smoke-wiki-pkce] FAIL missing Location" >&2
  fail=1
elif [[ "$location" != *"wiki.hehestl.su"* && "$location" != *"wiki.hehestl.com"* ]]; then
  echo "[smoke-wiki-pkce] FAIL Location not wiki callback" >&2
  fail=1
elif [[ "$location" != *"error=login_required"* && "$location" != *"error=interaction_required"* && "$location" != *"code="* ]]; then
  echo "[smoke-wiki-pkce] FAIL Location missing OAuth error or code" >&2
  fail=1
elif [[ "$location" == *"heron.hehestl.com"* ]]; then
  echo "[smoke-wiki-pkce] FAIL redirect uses heron.hehestl.com" >&2
  fail=1
else
  echo "[smoke-wiki-pkce] OK silent authorize → wiki callback"
fi

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi
echo "[smoke-wiki-pkce] PASS"
