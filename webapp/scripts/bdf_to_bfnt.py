#!/usr/bin/env python3
"""Compile a BDF bitmap font into a compact zlib-compressed 1-bit .bfnt.z binary.

Binary format (after zlib inflate):
  Header (12 bytes, little-endian):
    0..3   magic "BFNT"
    4      version = 1 (uint8)
    5      pixel_size (uint8)
    6      ascent (int8)
    7      descent (int8)
    8..11  glyph_count (uint32)
  Index Table (glyph_count * 12 bytes, sorted by codepoint ascending):
    0..3   codepoint (uint32)
    4      dwidth (uint8)
    5      bbw (uint8)
    6      bbh (uint8)
    7      bbx (int8)
    8      bby (int8)
    9..11  bitmap_offset (uint24 LE)
  Bitmap Blob:
    For each glyph, bbw*bbh bits packed MSB-first row-major without row padding.
"""

import struct
import sys
import zlib
from pathlib import Path


def parse_bdf(path: Path):
    pixel_size = 12
    ascent = 10
    descent = 2
    glyphs = []

    encoding = -1
    dwidth = 0
    bbw = bbh = bbx = bby = 0
    in_bitmap = False
    rows: list[str] = []

    with path.open("r", encoding="utf-8", errors="replace") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue
            if in_bitmap:
                if line == "ENDCHAR":
                    in_bitmap = False
                    if encoding >= 0:
                        glyphs.append((encoding, dwidth, bbw, bbh, bbx, bby, rows))
                    encoding = -1
                    rows = []
                else:
                    rows.append(line)
                continue

            if line.startswith("PIXEL_SIZE "):
                pixel_size = int(line.split()[1])
            elif line.startswith("FONT_ASCENT "):
                ascent = int(line.split()[1])
            elif line.startswith("FONT_DESCENT "):
                descent = int(line.split()[1])
            elif line.startswith("ENCODING "):
                encoding = int(line.split()[1])
            elif line.startswith("DWIDTH "):
                dwidth = int(line.split()[1])
            elif line.startswith("BBX "):
                parts = line.split()
                bbw, bbh, bbx, bby = int(parts[1]), int(parts[2]), int(parts[3]), int(parts[4])
            elif line == "BITMAP":
                in_bitmap = True
                rows = []

    glyphs.sort(key=lambda g: g[0])
    return pixel_size, ascent, descent, glyphs


def pack_glyph_bits(bbw: int, bbh: int, rows: list[str]) -> bytes:
    if bbw <= 0 or bbh <= 0:
        return b""
    total_bits = bbw * bbh
    out = bytearray((total_bits + 7) // 8)
    bit_idx = 0
    for r in range(bbh):
        hex_row = rows[r] if r < len(rows) else ""
        row_bytes = bytes.fromhex(hex_row) if hex_row else b""
        for c in range(bbw):
            byte_i = c >> 3
            if byte_i < len(row_bytes) and (row_bytes[byte_i] & (0x80 >> (c & 7))):
                out[bit_idx >> 3] |= 0x80 >> (bit_idx & 7)
            bit_idx += 1
    return bytes(out)


def compile_bfnt(bdf_path: Path, out_path: Path) -> None:
    pixel_size, ascent, descent, glyphs = parse_bdf(bdf_path)
    index_buf = bytearray()
    blob_buf = bytearray()

    for cp, dwidth, bbw, bbh, bbx, bby, rows in glyphs:
        offset = len(blob_buf)
        if offset >= (1 << 24):
            raise ValueError("Bitmap blob exceeds 16 MiB uint24 limit")
        bits = pack_glyph_bits(bbw, bbh, rows)
        blob_buf.extend(bits)
        index_buf.extend(
            struct.pack(
                "<IBBBbb",
                cp,
                max(0, min(255, dwidth)),
                max(0, min(255, bbw)),
                max(0, min(255, bbh)),
                max(-128, min(127, bbx)),
                max(-128, min(127, bby)),
            )
        )
        index_buf.extend(offset.to_bytes(3, "little"))

    header = struct.pack("<4sBBbbI", b"BFNT", 1, pixel_size, ascent, descent, len(glyphs))
    raw = header + index_buf + blob_buf
    compressed = zlib.compress(raw, level=9)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(compressed)
    print(
        f"{bdf_path.name}: {len(glyphs)} glyphs, pixel={pixel_size}, ascent={ascent}, descent={descent} "
        f"-> raw {len(raw)/1024:.1f} KiB, compressed {len(compressed)/1024:.1f} KiB -> {out_path}"
    )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.bdf> <output.bfnt.z>", file=sys.stderr)
        sys.exit(1)
    compile_bfnt(Path(sys.argv[1]), Path(sys.argv[2]))
