#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${ROOT_DIR}/.venv/bin/python3"
[[ -x "$PYTHON" ]] || PYTHON="python3"

OUT="${1:-${ROOT_DIR}/firmware/backup_$(date +%Y%m%d_%H%M%S).bin}"
PORT="${2:-}"
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

echo "Backing up 512KB Flash from $PORT -> $OUT"
"$PYTHON" "${ROOT_DIR}/scripts/TLSR825xComFlasher.py" \
  -p "$PORT" \
  -t 5000 \
  rf 0 0x80000 "$OUT"
