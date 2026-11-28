#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${ROOT_DIR}/.venv/bin/python3"
[[ -x "$PYTHON" ]] || PYTHON="python3"

FW="${1:-}"
if [[ -z "$FW" ]]; then
  echo "Usage: $0 <firmware.bin> [serial_port]" >&2
  echo "Example: $0 firmware/ble_epd.bin" >&2
  exit 1
fi
if [[ ! -f "$FW" ]]; then
  echo "Error: 固件文件不存在: $FW" >&2
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

echo "Flashing $FW -> $PORT (address 0x0)"
"$PYTHON" "${ROOT_DIR}/scripts/TLSR825xComFlasher.py" \
  -p "$PORT" \
  -t 5000 \
  -r \
  wf 0 "$FW"
