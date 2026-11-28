export const NUS_SVC = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
export const FFE0_SVC = 0xffe0;
export const FFE1_CHR = 0xffe1;

export const UART_BAUDS = [9600, 19200, 38400, 57600, 115200, 230400] as const;

export function toHexSpaced(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

export function parseHexString(str: string): Uint8Array<ArrayBuffer> | null {
  const clean = str.replace(/[^0-9a-fA-F]/g, "");
  if (clean.length === 0 || clean.length % 2 !== 0) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function chunkBytes(bytes: Uint8Array, chunkSize = 200): Uint8Array<ArrayBuffer>[] {
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  for (let off = 0; off < bytes.length; off += chunkSize) {
    chunks.push(new Uint8Array(bytes.slice(off, off + chunkSize)));
  }
  return chunks;
}

export type AtParseEvent =
  | { type: "mode"; mode: "at" | "transparent" }
  | { type: "name"; value: string }
  | { type: "baud"; value: string }
  | { type: "txpwr"; value: string }
  | { type: "advint"; value: string }
  | { type: "echo"; value: string }
  | { type: "log"; value: string }
  | { type: "vbat"; value: string }
  | { type: "mtu"; value: string };

export function parseAtInfoLine(line: string): AtParseEvent | null {
  const l = line.trim();
  if (l === "+CONNECTED") return { type: "mode", mode: "transparent" };
  if (l.startsWith("+DISCONNECTED") || l === "+AT_MODE") return { type: "mode", mode: "at" };
  if (l.startsWith("+NAME:")) return { type: "name", value: l.slice(6) };
  if (l.startsWith("+BAUD:")) return { type: "baud", value: l.slice(6) };
  if (l.startsWith("+TXPWR:")) return { type: "txpwr", value: l.slice(7).split(" ")[0] };
  if (l.startsWith("+ADVINT:")) return { type: "advint", value: l.slice(8).replace("ms", "") };
  if (l.startsWith("+ECHO:")) return { type: "echo", value: l.slice(6) };
  if (l.startsWith("+LOG:")) return { type: "log", value: l.slice(5) };
  if (l.startsWith("+VBAT:")) return { type: "vbat", value: l.slice(6) };
  if (l.startsWith("+MTU:")) return { type: "mtu", value: l.slice(5) };
  return null;
}
