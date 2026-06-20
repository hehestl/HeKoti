#!/usr/bin/env sh
# Hekoti: pull + rebuild + recreate app container (Postgres/Redis volumes preserved).
# Usage (from repo root on the server):
#   sh scripts/deploy-update.sh
# Force full rebuild without layer cache:
#   NO_CACHE=1 sh scripts/deploy-update.sh
set -eu

cd "$(dirname "$0")/.."

read_repo_version() {
  if [ ! -f VERSION ]; then
    echo "0.0.0"
    return
  fi
  # first non-empty, non-comment line
  while IFS= read -r line || [ -n "$line" ]; do
    line=$(printf '%s' "$line" | tr -d '\r')
    case "$line" in
      ""|"#"*) continue ;;
      *) printf '%s' "$line"; return ;;
    esac
  done < VERSION
  echo "0.0.0"
}

REPO_VERSION_BEFORE=$(read_repo_version)
echo "==> repo VERSION (before pull): ${REPO_VERSION_BEFORE}"

echo "==> git pull (--autostash for local compose tweaks on the server)"
if ! git pull --autostash --ff-only; then
  echo "ERROR: git pull failed. Local changes block update."
  echo "  Inspect: git status"
  echo "  Option A: stash manually — git stash push -m deploy docker-compose.yml && git pull --ff-only"
  echo "  Option B: commit server-specific compose, then pull/rebase"
  exit 1
fi

REPO_VERSION=$(read_repo_version)
export HEKOTI_APP_VERSION="${REPO_VERSION}"
echo "==> repo VERSION (after pull): ${REPO_VERSION}"
echo "==> build arg HEKOTI_APP_VERSION=${HEKOTI_APP_VERSION}"

if [ -f scripts/fix-lock-emnapi.cjs ]; then
  echo "==> sync package-lock @emnapi (npm ci in Alpine)"
  node scripts/fix-lock-emnapi.cjs
fi

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
  if docker compose exec -T hekoti-app node /app/scripts/docker-healthcheck.cjs 2>/dev/null; then
    echo "health: ok"
    break
  fi
  i=$((i + 1))
  sleep 5
done

echo "==> docker compose ps"
docker compose ps hekoti-app 2>/dev/null || docker compose ps

CONTAINER_VERSION=$(docker compose exec -T hekoti-app sh -c 'tr -d "\r" < /app/VERSION | head -1' 2>/dev/null || echo "unknown")
RUNTIME_ENV_VERSION=$(docker compose exec -T hekoti-app sh -c 'printf "%s" "$HEKOTI_APP_VERSION"' 2>/dev/null || echo "unknown")
echo "==> container /app/VERSION: ${CONTAINER_VERSION}"
echo "==> container HEKOTI_APP_VERSION env: ${RUNTIME_ENV_VERSION}"

if [ "$CONTAINER_VERSION" != "$REPO_VERSION" ]; then
  echo "WARNING: container VERSION (${CONTAINER_VERSION}) != repo VERSION (${REPO_VERSION})"
  echo "  Run: NO_CACHE=1 sh scripts/deploy-update.sh"
  echo "  Verify git: git log -1 --oneline && cat VERSION"
fi

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
