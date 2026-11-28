#!/usr/bin/env python3
"""
Inject a 28-byte Apple FindMy / OpenHaystack Advertisement Key into
findmy_tag.bin (replacing the 'OFFLINEFINDINGPUBLICKEYHERE!' placeholder)
and recompute the Telink CRC32 trailer.

Usage:
  ./patch_key.py --keys my_tag.keys -i build/findmy_tag.bin -o build/findmy_patched.bin
  ./patch_key.py --adv-key <base64_28B_key> -i build/findmy_tag.bin -o build/findmy_patched.bin
"""

import argparse
import base64
import struct
import sys
from pathlib import Path

PLACEHOLDER = b"OFFLINEFINDINGPUBLICKEYHERE!"
assert len(PLACEHOLDER) == 28


def telink_crc32(data: bytes) -> int:
    """Telink firmware CRC32 (matches ble_sdk/make/tl_firmware_tools.py)."""
    crc = 0xFFFFFFFF
    poly = 0xEDB88320
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ poly
            else:
                crc >>= 1
    return crc & 0xFFFFFFFF


def parse_keys_file(path: Path) -> bytes:
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.lower().startswith("advertisement key:"):
            b64 = line.split(":", 1)[1].strip()
            raw = base64.b64decode(b64)
            if len(raw) != 28:
                raise ValueError(f"Expected 28-byte Advertisement key, got {len(raw)} bytes")
            return raw
    raise ValueError(f"No 'Advertisement key:' line found in {path}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Patch Apple FindMy public key into TLSR8250 firmware")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--keys", type=Path, help="Path to OpenHaystack/macless-haystack .keys file")
    g.add_argument("--adv-key", type=str, help="Base64-encoded 28-byte Advertisement key")
    ap.add_argument("-i", "--input", type=Path, default=Path("build/findmy_tag.bin"), help="Input template .bin")
    ap.add_argument("-o", "--output", type=Path, default=Path("build/findmy_patched.bin"), help="Output patched .bin")
    args = ap.parse_args()

    pub_key = parse_keys_file(args.keys) if args.keys else base64.b64decode(args.adv_key)
    if len(pub_key) != 28:
        print(f"Error: key must be 28 bytes, got {len(pub_key)}", file=sys.stderr)
        return 1

    fw = bytearray(args.input.read_bytes())
    idx = fw.find(PLACEHOLDER)
    if idx < 0:
        print(f"Error: placeholder {PLACEHOLDER!r} not found in {args.input}", file=sys.stderr)
        return 1
    if fw.find(PLACEHOLDER, idx + 1) >= 0:
        print("Error: multiple placeholders found", file=sys.stderr)
        return 1

    fw[idx : idx + 28] = pub_key

    # Recompute Telink CRC32 over firmware body (excluding trailing 4-byte CRC32)
    fw_size = struct.unpack_from("<I", fw, 0x18)[0]
    if fw_size == len(fw) - 4:
        crc = telink_crc32(bytes(fw[:-4]))
        struct.pack_into("<I", fw, len(fw) - 4, crc)
    else:
        print(f"Warning: header bin_size ({fw_size}) != len(fw)-4 ({len(fw)-4}), skipping CRC update")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(fw)

    mac = bytes([pub_key[0] | 0xC0]) + pub_key[1:6]
    mac_str = ":".join(f"{b:02X}" for b in mac)
    print(f"Patched key at offset 0x{idx:x} -> {args.output}")
    print(f"Expected BLE Random Static MAC: {mac_str}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
