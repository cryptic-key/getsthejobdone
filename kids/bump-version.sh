#!/usr/bin/env bash
# Bump kids/version.js and sync cache-bust query params before a kids/ push.
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
file="$root/version.js"
current="$(rg -o 'APP_VERSION = [0-9]+' "$file" | rg -o '[0-9]+')"
next=$((current + 1))
perl -i -pe "s/APP_VERSION = $current/APP_VERSION = $next/" "$file"
for target in "$root/index.html" "$root/app.js"; do
  perl -i -pe "s/(\\?v=)[0-9A-Za-z._-]+/\${1}$next/g" "$target"
done
echo "kids version $current -> $next"
