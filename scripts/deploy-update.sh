#!/usr/bin/env sh
# Hekoti: pull + rebuild + recreate app container (Postgres/Redis volumes preserved).
# Usage (from repo root on the server):
#   sh scripts/deploy-update.sh
# Force full rebuild without layer cache:
#   NO_CACHE=1 sh scripts/deploy-update.sh
set -eu

cd "$(dirname "$0")/.."

echo "==> git pull"
git pull --ff-only

echo "==> docker compose build hekoti-app"
if [ "${NO_CACHE:-0}" = "1" ]; then
  docker compose build --no-cache hekoti-app
else
  docker compose build hekoti-app
fi

echo "==> docker compose up -d --force-recreate hekoti-app"
docker compose up -d --force-recreate hekoti-app

echo "==> waiting for health (up to 120s)"
i=0
while [ "$i" -lt 24 ]; do
  if docker compose exec -T hekoti-app node -e \
    "fetch('http://127.0.0.1:'+(process.env.PORT||'3310')+'/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    2>/dev/null; then
    echo "health: ok"
    break
  fi
  i=$((i + 1))
  sleep 5
done

echo "==> docker compose ps"
docker compose ps hekoti-app 2>/dev/null || docker compose ps

echo "==> last app logs (if 502 in NPM, check here)"
docker compose logs --tail=40 hekoti-app 2>/dev/null || true

PORT="${PORT:-3310}"
echo "==> smoke: help-center markup on homepage"
if curl -sf "http://127.0.0.1:${PORT}/en" | grep -q 'help-center'; then
  echo "help-center: found in HTML"
else
  echo "help-center: NOT found — old image, wrong port, or changes not in git on this host"
  echo "  try: NO_CACHE=1 sh scripts/deploy-update.sh"
  echo "  verify: git log -1 --oneline && curl -sI http://127.0.0.1:${PORT}/en | head -5"
fi

docker compose ps hekoti-app
