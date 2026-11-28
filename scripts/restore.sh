#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${ROOT_DIR}/.venv/bin/python3"
[[ -x "$PYTHON" ]] || PYTHON="python3"

BACKUP="${1:-${ROOT_DIR}/firmware/backup_orig.bin}"
if [[ ! -f "$BACKUP" ]]; then
  echo "Error: 备份文件不存在: $BACKUP" >&2
  exit 1
fi

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

echo "Restoring $BACKUP -> $PORT (full 512KB)"
"$PYTHON" "${ROOT_DIR}/scripts/TLSR825xComFlasher.py" \
  -p "$PORT" \
  -t 5000 \
  -r \
  wf 0 "$BACKUP"
