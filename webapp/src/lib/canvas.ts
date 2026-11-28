import jsQR from "jsqr";
import qrcode from "qrcode-generator";
import type { Orientation } from "../types";
import { getLoadedBitmapFont } from "./bitmapFont";
import type { BitmapFont } from "./bitmapFont";

const PALETTE: readonly [number, number, number][] = [
  [255, 255, 255], // White
  [0, 0, 0], // Black
  [220, 38, 38], // Red
];

/** All exact integer-scale pixel sizes supported by fusion10 (10/20) and fusion12 (12/24/36/48/60/72). */
const CRISP_PIXEL_SIZES = [72, 60, 48, 36, 24, 20, 12, 10] as const;

function parseFontPx(fontStr: string, fallback: number): number {
  const m = /(\d+(?:\.\d+)?)px/.exec(fontStr);
  return m ? parseFloat(m[1]) : fallback;
}

function resolveBitmapFontAndScale(px: number): { font: BitmapFont; scale: number } | null {
  const f12 = getLoadedBitmapFont("pixel12");
  const f10 = getLoadedBitmapFont("pixel10");
  const rounded = Math.round(px);

  if (rounded <= 10 && f10) {
    return { font: f10, scale: 1 };
  }
  if (rounded === 20 && f10) {
    return { font: f10, scale: 2 };
  }
  if (f12) {
    return { font: f12, scale: Math.max(1, Math.round(rounded / 12)) };
  }
  if (f10) {
    return { font: f10, scale: Math.max(1, Math.round(rounded / 10)) };
  }
  return null;
}

/**
 * Wraps a CanvasRenderingContext2D during template rendering so all fillText/measureText
 * calls render via exact integer-grid 1-bit pixel blitting (zero browser anti-aliasing).
 */
export function renderWithBitmapFont(
  ctx: CanvasRenderingContext2D,
  fn: (renderCtx: CanvasRenderingContext2D) => void,
): void {
  if (!getLoadedBitmapFont("pixel12") && !getLoadedBitmapFont("pixel10")) {
    fn(ctx);
    return;
  }

  const origFillText = ctx.fillText.bind(ctx);
  const origMeasureText = ctx.measureText.bind(ctx);

  ctx.fillText = ((text: string, x: number, y: number) => {
    const resolved = resolveBitmapFontAndScale(parseFontPx(ctx.font, 12));
    if (!resolved) {
      origFillText(text, x, y);
      return;
    }
    resolved.font.drawText(ctx, String(text), x, y, resolved.scale, ctx.textAlign);
  }) as CanvasRenderingContext2D["fillText"];

  ctx.measureText = ((text: string) => {
    const base = origMeasureText(text);
    const resolved = resolveBitmapFontAndScale(parseFontPx(ctx.font, 12));
    if (!resolved) return base;
    const width = resolved.font.measureWidth(String(text), resolved.scale);
    return new Proxy(base, {
      get(target, prop) {
        if (prop === "width") return width;
        const val = Reflect.get(target, prop);
        return typeof val === "function" ? val.bind(target) : val;
      },
    });
  }) as CanvasRenderingContext2D["measureText"];

  try {
    fn(ctx);
  } finally {
    ctx.fillText = origFillText;
    ctx.measureText = origMeasureText;
  }
}

/** Snap any requested size to the nearest exact 1-bit pixel size (10, 12, 20, 24, 36, 48, 60, 72). */
export function pixelFont(size: number): string {
  const s = Math.round(size);
  let best: number = CRISP_PIXEL_SIZES[CRISP_PIXEL_SIZES.length - 1];
  let bestDiff = Infinity;
  for (const cand of CRISP_PIXEL_SIZES) {
    const diff = Math.abs(cand - s);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = cand;
    }
  }
  return `${best}px monospace`;
}

export function bytesToHex(u8: Uint8Array): string {
  return Array.from(u8, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join("");
}

function nearestColor(r: number, g: number, b: number, redSens = 1.0, textMode = false): number {
  const rr = Math.min(255, r * redSens);
  const dW = (255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2;
  const dB = r ** 2 + g ** 2 + b ** 2;
  const dR = (255 - rr) ** 2 + g ** 2 + b ** 2;
  if (textMode) {
    if (rr - g > 30 && rr - b > 30 && (g < 195 || b < 195) && dR < dB) return 2;
    if (dR < dW && dR < dB && rr > g + 35 && rr > b + 35) return 2;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    return luma < 155 ? 1 : 0;
  }
  if (dR < dW && dR < dB && rr > g + 35 && rr > b + 35) return 2;
  return dB < dW ? 1 : 0;
}

export function quantizeCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  useDither: boolean,
  redSens = 1.0,
): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const buf = new Float32Array(w * h * 3);
  for (let i = 0, j = 0; i < d.length; i += 4, j += 3) {
    buf[j] = d[i];
    buf[j + 1] = d[i + 1];
    buf[j + 2] = d[i + 2];
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3;
      const r = Math.max(0, Math.min(255, buf[idx]));
      const g = Math.max(0, Math.min(255, buf[idx + 1]));
      const b = Math.max(0, Math.min(255, buf[idx + 2]));

      const ci = nearestColor(r, g, b, redSens, !useDither);
      const [nr, ng, nb] = PALETTE[ci];

      const pi = (y * w + x) * 4;
      d[pi] = nr;
      d[pi + 1] = ng;
      d[pi + 2] = nb;
      d[pi + 3] = 255;

      if (useDither) {
        const er = r - nr;
        const eg = g - ng;
        const eb = b - nb;
        const spread = (nx: number, ny: number, f: number) => {
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) return;
          const ni = (ny * w + nx) * 3;
          buf[ni] += er * f;
          buf[ni + 1] += eg * f;
          buf[ni + 2] += eb * f;
        };
        spread(x + 1, y, 7 / 16);
        spread(x - 1, y + 1, 3 / 16);
        spread(x, y + 1, 5 / 16);
        spread(x + 1, y + 1, 1 / 16);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function invertBlackWhite(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const isBlack = r < 128 && g < 128 && b < 128;
    const isWhite = r > 180 && g > 180 && b > 180;
    if (isBlack) {
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
    } else if (isWhite) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function finalizeBase(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  invert = false,
  useDither = false,
  redSens = 1.0,
): void {
  quantizeCanvas(ctx, w, h, useDither, redSens);
  if (invert) invertBlackWhite(ctx, w, h);
}

export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  maxLines: number,
  align: CanvasTextAlign = "center",
): number {
  ctx.textAlign = align;
  const rawText = String(text || "");

  // When single-line text overflows maxW and contains a natural delimiter (e.g. " · " or " / "),
  // split cleanly on the delimiter instead of leaving a single orphan character on the next line.
  if (!rawText.includes("\n") && maxLines >= 2 && ctx.measureText(rawText).width > maxW) {
    const parts = rawText
      .split(/\s*[·/]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2 && parts.length <= maxLines && parts.every((p) => ctx.measureText(p).width <= maxW)) {
      const rx = Math.round(x);
      parts.forEach((l, idx) => ctx.fillText(l, rx, Math.round(y + idx * lineH)));
      return parts.length;
    }
  }

  const chars = Array.from(rawText);
  let line = "";
  let lines: string[] = [];
  for (const ch of chars) {
    if (ch === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line.length > 0) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines = lines.slice(0, maxLines);
  const rx = Math.round(x);
  lines.forEach((l, idx) => ctx.fillText(l, rx, Math.round(y + idx * lineH)));
  return lines.length;
}

export function drawVerticalText(
  ctx: CanvasRenderingContext2D,
  text: string,
  startRightX: number,
  startY: number,
  colStep: number,
  charStep: number,
  maxRows: number,
  maxCols: number,
): number {
  const rawCols = String(text || "").split("\n");
  const cols: string[][] = [];
  for (const rc of rawCols) {
    const chars = Array.from(rc.trim());
    if (!chars.length) continue;
    for (let i = 0; i < chars.length; i += maxRows) {
      cols.push(chars.slice(i, i + maxRows));
    }
  }
  const used = cols.slice(0, maxCols);
  ctx.textAlign = "center";
  used.forEach((chars, cIdx) => {
    const x = Math.round(startRightX - cIdx * colStep);
    chars.forEach((ch, rIdx) => {
      ctx.fillText(ch, x, Math.round(startY + rIdx * charStep));
    });
  });
  return used.length;
}

export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  startSize: number,
  minSize = 10,
): number {
  const candidates = CRISP_PIXEL_SIZES.filter((s) => s <= startSize && s >= minSize);
  const ladder = candidates.length > 0 ? candidates : [minSize <= 10 ? 10 : 12];
  let chosen = ladder[ladder.length - 1];
  for (const s of ladder) {
    ctx.font = `${s}px monospace`;
    if (ctx.measureText(text || "").width <= maxW) {
      chosen = s;
      break;
    }
  }
  ctx.font = `${chosen}px monospace`;
  return chosen;
}

export function formatPhoneDisplay(raw: unknown): string {
  const clean = String(raw || "").trim();
  const digits = clean.replace(/\D/g, "");
  if (digits.length === 11 && /^1\d{10}$/.test(digits)) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return clean || "138 0013 8000";
}

export function sanitizePhoneDigits(raw: unknown): string {
  return String(raw || "").replace(/[^\d+]/g, "");
}

export function escapeWifiField(str: unknown): string {
  return String(str || "").replace(/([\\;,:"])/g, "\\$1");
}

export function buildWifiPayload(ssid: string, password: string, encType: string): string {
  const t = encType || "WPA";
  const s = escapeWifiField(ssid);
  const p = t === "nopass" ? "" : escapeWifiField(password);
  return `WIFI:T:${t};S:${s};P:${p};;`;
}

function toUtf8ByteString(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

export function drawCrispQR(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxSize: number,
  quietModules = 1,
): number {
  const content = String(text || "").trim();
  if (!content) return 0;

  try {
    const qr = qrcode(0, "L");
    qr.addData(toUtf8ByteString(content), "Byte");
    qr.make();

    const count = qr.getModuleCount();
    const totalModules = count + quietModules * 2;
    const cell = Math.floor(maxSize / totalModules);
    if (cell < 1) return 0;

    const drawSize = totalModules * cell;
    const ox = Math.round(cx - drawSize / 2);
    const oy = Math.round(cy - drawSize / 2);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(ox, oy, drawSize, drawSize);

    ctx.fillStyle = "#000000";
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(ox + (c + quietModules) * cell, oy + (r + quietModules) * cell, cell, cell);
        }
      }
    }
    return drawSize;
  } catch {
    return 0;
  }
}

/**
 * Decode a standard QR code from an uploaded image using offline jsQR.
 * Returns decoded string or null if not a standard QR code.
 */
export function decodeQrFromImage(img: HTMLImageElement): string | null {
  const tryAtMaxDim = (maxDim: number): string | null => {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const res = jsQR(imgData.data, w, h, { inversionAttempts: "attemptBoth" });
    return res?.data ? res.data : null;
  };

  return tryAtMaxDim(1200) || tryAtMaxDim(720);
}

export function exportCrispPng(previewCanvas: HTMLCanvasElement, filename = "inkcard.png", scale = 4): void {
  const out = document.createElement("canvas");
  out.width = previewCanvas.width * scale;
  out.height = previewCanvas.height * scale;
  const octx = out.getContext("2d");
  if (!octx) return;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(previewCanvas, 0, 0, out.width, out.height);
  const link = document.createElement("a");
  link.download = filename;
  link.href = out.toDataURL("image/png");
  link.click();
}

export function buildHardwareBitplanesHex(
  previewCanvas: HTMLCanvasElement,
  orientation: Orientation,
  flip180: boolean,
): string {
  const hw = document.createElement("canvas");
  hw.width = 128;
  hw.height = 250;
  const hctx = hw.getContext("2d", { willReadFrequently: true });
  if (!hctx) return "";
  hctx.fillStyle = "#FFFFFF";
  hctx.fillRect(0, 0, 128, 250);

  hctx.save();
  if (orientation === "portrait") {
    if (flip180) {
      hctx.translate(122, 250);
      hctx.rotate(Math.PI);
    }
    hctx.drawImage(previewCanvas, 0, 0);
  } else {
    if (flip180) {
      hctx.translate(122, 0);
      hctx.rotate(Math.PI / 2);
    } else {
      hctx.translate(0, 250);
      hctx.rotate(-Math.PI / 2);
    }
    hctx.drawImage(previewCanvas, 0, 0);
  }
  hctx.restore();

  const data = hctx.getImageData(0, 0, 128, 250).data;
  const bwPlane: number[] = [];
  const redPlane: number[] = [];
  let curBW = 0;
  let curRed = 0;
  let bit = 7;

  for (let y = 0; y < 250; y++) {
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const isBlack = r < 128 && g < 128 && b < 128;
      const isRed = !isBlack && r > 128 && g < 128 && b < 128;

      if (!isBlack && !isRed) {
        curBW |= 1 << bit;
      } else if (isRed) {
        curBW |= 1 << bit;
        curRed |= 1 << bit;
      }

      bit--;
      if (bit < 0) {
        bwPlane.push(~curBW & 0xff);
        redPlane.push(curRed & 0xff);
        curBW = 0;
        curRed = 0;
        bit = 7;
      }
    }
  }

  const combined = new Uint8Array(bwPlane.length + redPlane.length);
  combined.set(bwPlane, 0);
  combined.set(redPlane, bwPlane.length);
  return bytesToHex(combined);
}
