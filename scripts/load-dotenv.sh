#!/usr/bin/env sh
# POSIX .env loader — no shell expansion (safe under dash when invoked as `sh script`).
# Usage: . ./scripts/load-dotenv.sh && load_dotenv .env

load_dotenv() {
  file="${1:-.env}"
  if [ ! -f "$file" ]; then
    return 0
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    line=$(printf '%s' "$line" | tr -d '\r')
    case "$line" in
      ''|'#'*) continue ;;
      export\ *) line=${line#export } ;;
    esac
    case "$line" in
      *=*)
        key=${line%%=*}
        val=${line#*=}
        export "$key"="$val"
        ;;
    esac
  done < "$file"
}
