import { inflate } from "pako";

export type BitmapFontId = "pixel12" | "pixel10";

export interface GlyphMetrics {
  dwidth: number;
  bbw: number;
  bbh: number;
  bbx: number;
  bby: number;
  bitmapOffset: number;
}

const HEADER_SIZE = 12;
const ENTRY_SIZE = 12;

export class BitmapFont {
  readonly pixelSize: number;
  readonly ascent: number;
  readonly descent: number;
  readonly glyphCount: number;
  private readonly view: DataView;
  private readonly blob: Uint8Array;

  constructor(raw: Uint8Array) {
    if (raw.byteLength < HEADER_SIZE) {
      throw new Error("Invalid BFNT: file too small");
    }
    if (raw[0] !== 0x42 || raw[1] !== 0x46 || raw[2] !== 0x4e || raw[3] !== 0x54) {
      throw new Error("Invalid BFNT: bad magic");
    }
    const version = raw[4];
    if (version !== 1) {
      throw new Error(`Unsupported BFNT version: ${version}`);
    }
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    this.pixelSize = view.getUint8(5);
    this.ascent = view.getInt8(6);
    this.descent = view.getInt8(7);
    this.glyphCount = view.getUint32(8, true);
    const blobStart = HEADER_SIZE + this.glyphCount * ENTRY_SIZE;
    if (blobStart > raw.byteLength) {
      throw new Error("Invalid BFNT: truncated index table");
    }
    this.view = view;
    this.blob = raw.subarray(blobStart);
  }

  findGlyph(codepoint: number): GlyphMetrics | null {
    let lo = 0;
    let hi = this.glyphCount - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const off = HEADER_SIZE + mid * ENTRY_SIZE;
      const cp = this.view.getUint32(off, true);
      if (cp === codepoint) {
        const b0 = this.view.getUint8(off + 9);
        const b1 = this.view.getUint8(off + 10);
        const b2 = this.view.getUint8(off + 11);
        return {
          dwidth: this.view.getUint8(off + 4),
          bbw: this.view.getUint8(off + 5),
          bbh: this.view.getUint8(off + 6),
          bbx: this.view.getInt8(off + 7),
          bby: this.view.getInt8(off + 8),
          bitmapOffset: b0 | (b1 << 8) | (b2 << 16),
        };
      }
      if (cp < codepoint) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return null;
  }

  measureWidth(text: string, scale = 1): number {
    const s = Math.max(1, Math.round(scale));
    let width = 0;
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      if (cp === undefined) continue;
      const g = this.findGlyph(cp);
      width += g ? g.dwidth : Math.ceil(this.pixelSize / 2);
    }
    return width * s;
  }

  drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    scale = 1,
    align: CanvasTextAlign = "left",
  ): void {
    const s = Math.max(1, Math.round(scale));
    const totalW = this.measureWidth(text, s);
    let cursorX = Math.round(x);
    if (align === "center") {
      cursorX = Math.round(x - totalW / 2);
    } else if (align === "right" || align === "end") {
      cursorX = Math.round(x - totalW);
    }
    const baseY = Math.round(y);

    for (const ch of text) {
      const cp = ch.codePointAt(0);
      if (cp === undefined) continue;
      const g = this.findGlyph(cp);
      if (!g) {
        cursorX += Math.ceil(this.pixelSize / 2) * s;
        continue;
      }
      const { bbw, bbh, bbx, bby, bitmapOffset } = g;
      if (bbw > 0 && bbh > 0) {
        const originX = cursorX + bbx * s;
        const originY = baseY - (bby + bbh) * s;
        for (let r = 0; r < bbh; r++) {
          let runStart = -1;
          const rowBase = r * bbw;
          for (let c = 0; c <= bbw; c++) {
            let on = false;
            if (c < bbw) {
              const bitIdx = rowBase + c;
              on = (this.blob[bitmapOffset + (bitIdx >>> 3)] & (0x80 >>> (bitIdx & 7))) !== 0;
            }
            if (on && runStart < 0) {
              runStart = c;
            } else if (!on && runStart >= 0) {
              ctx.fillRect(originX + runStart * s, originY + r * s, (c - runStart) * s, s);
              runStart = -1;
            }
          }
        }
      }
      cursorX += g.dwidth * s;
    }
  }
}

export function parseBitmapFont(compressed: Uint8Array): BitmapFont {
  return new BitmapFont(inflate(compressed));
}

const FONT_URLS: Record<BitmapFontId, string> = {
  pixel12: "./fonts/fusion12.bfnt.z",
  pixel10: "./fonts/fusion10.bfnt.z",
};

const loadedFonts = new Map<BitmapFontId, BitmapFont>();
const pendingLoads = new Map<BitmapFontId, Promise<BitmapFont | null>>();

export function getLoadedBitmapFont(id: BitmapFontId): BitmapFont | null {
  return loadedFonts.get(id) ?? null;
}

export function registerBitmapFont(id: BitmapFontId, font: BitmapFont): void {
  loadedFonts.set(id, font);
}

export function loadBitmapFont(id: BitmapFontId): Promise<BitmapFont | null> {
  const existing = loadedFonts.get(id);
  if (existing) return Promise.resolve(existing);
  const inflight = pendingLoads.get(id);
  if (inflight) return inflight;

  const promise = fetch(FONT_URLS[id])
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .then((buf) => {
      const font = parseBitmapFont(new Uint8Array(buf));
      loadedFonts.set(id, font);
      return font;
    })
    .catch(() => null)
    .finally(() => {
      pendingLoads.delete(id);
    });

  pendingLoads.set(id, promise);
  return promise;
}
