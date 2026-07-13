#!/usr/bin/env sh
# Pull + rebuild in THIS deploy root (Profile A: /opt/app/prod/hh/core/wiki on Hedra).
#   sh scripts/git-pull-deploy.sh
set -eu

cd "$(dirname "$0")/.."

echo "==> deploy root: $(pwd)"
git pull --autostash --ff-only

export NO_CACHE="${NO_CACHE:-1}"
sh scripts/deploy-update.sh
