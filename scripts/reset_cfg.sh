#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${ROOT_DIR}/.venv/bin/python3"
[[ -x "$PYTHON" ]] || PYTHON="python3"

PORT="${1:-}"
if [[ -z "$PORT" ]]; then
  if [[ -e /dev/ttyACM0 ]]; then
    PORT="/dev/ttyACM0"
  elif [[ -e /dev/ttyUSB0 ]]; then
    PORT="/dev/ttyUSB0"
  else
    echo "Error: 未检测到 /dev/ttyACM0 或 /dev/ttyUSB0" >&2
    exit 1
  fi
fi

echo "Erasing ATC_BLE_OEPL config sectors (0x79000..0x7ffff, keeping MAC at 0x76000) on $PORT..."
"$PYTHON" "${ROOT_DIR}/scripts/TLSR825xComFlasher.py" \
  -p "$PORT" \
  -t 5000 \
  -r \
  es 0x79000 0x7000
