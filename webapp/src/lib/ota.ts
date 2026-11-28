export const TELINK_OTA_SERVICE = "00010203-0405-0607-0809-0a0b0c0d1912";
export const TELINK_OTA_CHAR = "00010203-0405-0607-0809-0a0b0c0d2b12";
export const TELINK_MAGIC_HEX = "4b4e4c54"; // "KNLT" (0x544c4e4b LE)

export function decimalToHex4(d: number): string {
  return (d >>> 0).toString(16).padStart(4, "0");
}

export function crc16Modbus(buffer: Uint8Array): number {
  let crc = 0xffff;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      const odd = crc & 0x0001;
      crc >>= 1;
      if (odd) crc ^= 0xa001;
    }
  }
  return crc;
}

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHexLower(data: ArrayBuffer | Uint8Array): string {
  const view = data instanceof Uint8Array ? data : new Uint8Array(data);
  let out = "";
  for (let i = 0; i < view.length; i++) {
    out += view[i].toString(16).padStart(2, "0");
  }
  return out;
}

export function getHexBlockCount(count: number): string {
  const hex = decimalToHex4(count & 0xffff);
  return hex.substring(2, 4) + hex.substring(0, 2);
}

export function getHexCrc(hexData: string): string {
  const crc = decimalToHex4(crc16Modbus(hexToBytes(hexData)));
  return crc.substring(2, 4) + crc.substring(0, 2);
}

export interface ParsedFirmware {
  ok: boolean;
  error?: string;
  rawSize: number;
  paddedHex: string;
  blockCount: number;
}

export function parseTelinkFirmware(buf: ArrayBuffer | Uint8Array): ParsedFirmware {
  let hex = bytesToHexLower(buf);
  const rawSize = hex.length / 2;
  if (rawSize < 16 || hex.substring(16, 24) !== TELINK_MAGIC_HEX) {
    return {
      ok: false,
      error: "所选文件不是有效的 Telink 固件 (.bin)",
      rawSize,
      paddedHex: "",
      blockCount: 0,
    };
  }
  if (hex.length % 32 !== 0) {
    const padHex = "ffffffffffffffffffffffffffffffff";
    hex += padHex.substring(0, 32 - (hex.length % 32));
  }
  return {
    ok: true,
    rawSize,
    paddedHex: hex,
    blockCount: hex.length / 32,
  };
}

export function buildOtaBlockHex(paddedHex: string, blockNr: number): string {
  const blockNrStr = getHexBlockCount(blockNr);
  const blockStr = blockNrStr + paddedHex.substring(blockNr * 32, blockNr * 32 + 32);
  const blockCrc = getHexCrc(blockStr);
  return blockStr + blockCrc;
}

export function buildOtaEndHex(blockCount: number): string {
  return "02ff" + getHexBlockCount(blockCount - 1) + getHexBlockCount(~(blockCount - 1) & 0xffff);
}

export function buildOtaDeviceOptions(namePrefix: string, hideUnknown: boolean): {
  optionalServices: string[];
  acceptAllDevices?: boolean;
  filters?: Array<{ namePrefix: string }>;
} {
  const opts: {
    optionalServices: string[];
    acceptAllDevices?: boolean;
    filters?: Array<{ namePrefix: string }>;
  } = {
    optionalServices: [TELINK_OTA_SERVICE],
  };
  const trimmed = namePrefix.trim();
  if (trimmed) {
    opts.filters = trimmed
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => ({ namePrefix: x }));
  } else if (hideUnknown) {
    opts.filters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz"
      .split("")
      .map((x) => ({ namePrefix: x }));
  } else {
    opts.acceptAllDevices = true;
  }
  return opts;
}
