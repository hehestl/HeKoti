#!/usr/bin/env bash
# Thin wrapper → Hedra distribute-jwt-public-pem.sh hekoti
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for candidate in \
  "$ROOT/../hehestl-db-hedra/ops/heron-auth/scripts/distribute-jwt-public-pem.sh" \
  "$ROOT/../../hehestl-db-hedra/ops/heron-auth/scripts/distribute-jwt-public-pem.sh" \
  "/opt/app/ops/heron-auth/scripts/distribute-jwt-public-pem.sh"
do
  if [[ -f "$candidate" ]]; then
    exec bash "$candidate" hekoti "${HEKOTI_JWT_PEM_REMOTE:-/opt/app/hekoti/secrets/heron_jwt_public.pem}"
  fi
done

echo "ERROR: distribute-jwt-public-pem.sh not found — run from Hedra or clone hehestl-db-hedra" >&2
exit 1
