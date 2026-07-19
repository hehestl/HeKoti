#!/usr/bin/env sh
# Traefik 404 smoke for hekoti instance (world/wiki/lore).
set -eu

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

inst="${HEKOTI_INSTANCE:-hekoti}"
container="hh-${inst}-app"
host="${HEKOTI_PUBLIC_HOST:-}"
port="${HEKOTI_HOST_PORT:-3310}"
fail=0

warn() { echo "[diagnose-traefik] FAIL: $*" >&2; fail=1; }
ok() { echo "[diagnose-traefik] OK: $*"; }

echo "== diagnose-traefik instance=$inst host=${host:-<unset>} =="

if [ -z "$host" ]; then
  warn "HEKOTI_PUBLIC_HOST empty in .env"
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$container"; then
  warn "container not running: $container"
  exit 1
fi

te="$(docker inspect "$container" --format '{{index .Config.Labels "traefik.enable"}}' 2>/dev/null || true)"
rule="$(docker inspect "$container" --format '{{index .Config.Labels "traefik.http.routers.hekoti-'"$inst"'.rule"}}' 2>/dev/null || true)"
svc_port="$(docker inspect "$container" --format '{{index .Config.Labels "traefik.http.services.hekoti-'"$inst"'.loadbalancer.server.port"}}' 2>/dev/null || true)"

if [ "$te" = "true" ]; then ok "traefik.enable=true"; else warn "traefik.enable missing — recreate with wiki-prod.yml"; fi
if [ -n "$rule" ]; then ok "router rule: $rule"; else warn "traefik router rule missing"; fi
if [ -n "$svc_port" ]; then ok "service port: $svc_port"; else warn "traefik service port missing"; fi

if docker network inspect hehe-net --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null | grep -q "$container"; then
  ok "$container in hehe-net"
else
  warn "$container NOT in hehe-net"
fi

echo "-- local app"
if curl -sf -o /dev/null "http://127.0.0.1:${port}/en"; then
  ok "http://127.0.0.1:${port}/en"
else
  warn "app not reachable on 127.0.0.1:${port}"
fi

if [ -n "$host" ]; then
  echo "-- public https"
  code="$(curl -sS -o /dev/null -w '%{http_code}' "https://${host}/en" 2>/dev/null || echo 000)"
  echo "https://${host}/en → HTTP $code"
  if [ "$code" = "200" ] || [ "$code" = "307" ] || [ "$code" = "308" ]; then
    ok "public HTTPS"
  else
    warn "public HTTPS $code (Traefik 404 = no router or wrong DNS)"
    echo "  See: docs/ops-world-hemonea-deploy.md"
  fi
fi

exit "$fail"
