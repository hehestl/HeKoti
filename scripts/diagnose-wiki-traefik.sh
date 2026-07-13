#!/usr/bin/env bash
# Wiki Traefik routing check (hemonea). 404 on wiki.hehestl.su = missing labels or not on hehe-net.
set -euo pipefail

CONTAINER="${WIKI_CONTAINER:-hh-wiki-app}"
HOST="${HEKOTI_PUBLIC_HOST:-wiki.hehestl.su}"
FAIL=0

echo "== diagnose-wiki-traefik ($CONTAINER → https://$HOST) =="

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "FAIL: container not running: $CONTAINER" >&2
  exit 1
fi

labels="$(docker inspect "$CONTAINER" --format '{{json .Config.Labels}}' 2>/dev/null || echo '{}')"
if echo "$labels" | grep -q 'traefik.enable'; then
  echo "OK: traefik labels present"
  echo "$labels" | tr ',' '\n' | grep traefik || true
else
  echo "FAIL: no traefik labels on $CONTAINER" >&2
  echo "  Fix: sh scripts/recreate-wiki-app.sh (needs deploy/docker-compose.wiki-prod.yml)" >&2
  FAIL=1
fi

nets="$(docker inspect "$CONTAINER" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')"
echo "networks: $nets"
if echo "$nets" | grep -q 'hehe-net'; then
  echo "OK: attached to hehe-net"
else
  echo "FAIL: $CONTAINER not on hehe-net — Traefik cannot reach it" >&2
  FAIL=1
fi

if docker network inspect hehe-net >/dev/null 2>&1; then
  echo "hehe-net: $(docker network inspect hehe-net --format '{{range .Containers}}{{.Name}} {{end}}' | tr ' ' '\n' | grep -E 'traefik|wiki' | paste -sd' ' -)"
else
  echo "FAIL: hehe-net missing" >&2
  FAIL=1
fi

code_local="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3310/en 2>/dev/null || echo 000)"
echo "local http://127.0.0.1:3310/en → $code_local"
if [[ "$code_local" != "200" && "$code_local" != "307" && "$code_local" != "308" ]]; then
  echo "WARN: app not responding on 3310" >&2
fi

code_pub="$(curl -sk -o /dev/null -w '%{http_code}' "https://${HOST}/en" 2>/dev/null || echo 000)"
echo "public https://${HOST}/en → $code_pub (curl -k)"
if [[ "$code_pub" == "404" ]]; then
  echo "FAIL: Traefik 404 — router not registered (see labels/network above)" >&2
  FAIL=1
fi

[[ "$FAIL" -eq 0 ]] && echo "[diagnose-wiki-traefik] OK" || exit 1
