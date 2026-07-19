#!/usr/bin/env bash
# Idempotent: add mascot admin i18n keys required by admin-site-config.tsx (TS build).
#
# Usage:
#   bash scripts/patch-mascot-i18n.sh
#   bash scripts/patch-mascot-i18n.sh /opt/app/prod/hh-world
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
MSGS="$ROOT/src/lib/messages"

if [[ ! -f "$MSGS/en.json" || ! -f "$MSGS/ru.json" ]]; then
  echo "[patch-mascot-i18n] missing messages in $MSGS" >&2
  exit 1
fi

_patch_one() {
  local file="$1"
  local lang="$2"
  if command -v node >/dev/null 2>&1; then
    node - "$file" "$lang" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const lang = process.argv[3];
const extras =
  lang === "ru"
    ? {
        mascotHint: "Маскот сайта (клик — выбрать)",
        mascotHekoti: "Hekoti",
        mascotHehel: "Hehel",
      }
    : {
        mascotHint: "Site mascot (click to select)",
        mascotHekoti: "Hekoti",
        mascotHehel: "Hehel",
      };
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const admin = data?.admin?.administration;
if (!admin) {
  console.error("[patch-mascot-i18n] missing admin.administration in", file);
  process.exit(1);
}
let changed = false;
for (const [key, value] of Object.entries(extras)) {
  if (admin[key] === undefined) {
    admin[key] = value;
    changed = true;
  }
}
if (changed) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log("[patch-mascot-i18n] patched", file);
} else {
  console.log("[patch-mascot-i18n] ok", file);
}
NODE
    return
  fi

  python3 - "$file" "$lang" <<'PY'
import json
import sys
from pathlib import Path

file = Path(sys.argv[1])
lang = sys.argv[2]
extras = (
    {
        "mascotHint": "Маскот сайта (клик — выбрать)",
        "mascotHekoti": "Hekoti",
        "mascotHehel": "Hehel",
    }
    if lang == "ru"
    else {
        "mascotHint": "Site mascot (click to select)",
        "mascotHekoti": "Hekoti",
        "mascotHehel": "Hehel",
    }
)
data = json.loads(file.read_text(encoding="utf-8"))
admin = data.get("admin", {}).get("administration")
if not admin:
    raise SystemExit(f"[patch-mascot-i18n] missing admin.administration in {file}")
changed = False
for key, value in extras.items():
    if key not in admin:
        admin[key] = value
        changed = True
if changed:
    file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[patch-mascot-i18n] patched {file}")
else:
    print(f"[patch-mascot-i18n] ok {file}")
PY
}

_patch_one "$MSGS/en.json" en
_patch_one "$MSGS/ru.json" ru

grep -q '"mascotHint"' "$MSGS/en.json" || {
  echo "[patch-mascot-i18n] verify failed: mascotHint missing in en.json" >&2
  exit 1
}

echo "[patch-mascot-i18n] done root=$ROOT"
