#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[1/4] Running test suite"
npm test

echo "[2/4] Listing adapters"
node src/index.js adapters --json

echo "[3/4] Dry-run baseline"
node src/index.js run "create midi track load drum rack arm track and start recording then play" --json

echo "[4/4] Max4Live preflight (expected fail until bridge exists)"
set +e
node src/index.js run "set tempo to 120" --execute --adapter max4live --json
rc=$?
set -e
if [[ $rc -ne 0 ]]; then
  echo "Max4Live preflight not ready yet (expected before bridge implementation)."
fi
