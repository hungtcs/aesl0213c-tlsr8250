import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import {
  buildOtaBlockHex,
  buildOtaDeviceOptions,
  buildOtaEndHex,
  crc16Modbus,
  getHexBlockCount,
  getHexCrc,
  hexToBytes,
  parseTelinkFirmware,
} from "../ota";

interface LegacyOtaFns {
  crc16_modbus: (buf: Uint8Array) => number;
  getHexBLockCount: (n: number) => string;
  getHexCRC: (hex: string) => string;
  bytesToHex: (buf: ArrayBuffer | Uint8Array) => string;
}

function loadLegacyOta(): LegacyOtaFns | null {
  const htmlPath = path.resolve(process.cwd(), "../web/ble_ota.html");
  if (!fs.existsSync(htmlPath)) return null;
  const html = fs.readFileSync(htmlPath, "utf8");
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("No inline script in web/ble_ota.html");

  const sandbox: Record<string, unknown> = {
    window: {},
    document: { getElementById: () => ({ innerHTML: "", value: "", checked: false, setAttribute() {}, removeAttribute() {} }), querySelector: () => ({ addEventListener() {} }) },
    navigator: {},
    console,
    Uint8Array,
    Number,
    Date,
    Promise,
    setTimeout,
    alert() {},
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(match[1], ctx);
  return {
    crc16_modbus: sandbox.crc16_modbus as LegacyOtaFns["crc16_modbus"],
    getHexBLockCount: sandbox.getHexBLockCount as LegacyOtaFns["getHexBLockCount"],
    getHexCRC: sandbox.getHexCRC as LegacyOtaFns["getHexCRC"],
    bytesToHex: sandbox.bytesToHex as LegacyOtaFns["bytesToHex"],
  };
}

describe("Telink BLE OTA protocol parity with web/ble_ota.html", () => {
  const legacy = loadLegacyOta();

  it("matches crc16_modbus golden vectors and legacy HTML", () => {
    expect(crc16Modbus(new Uint8Array([0x00, 0x00, 0x01, 0x02, 0x03, 0x04]))).toBe(0x14a1);
    expect(crc16Modbus(new TextEncoder().encode("123456789"))).toBe(0x4b37);
    const samples = [
      new Uint8Array([0x00, 0x00, 0x01, 0x02, 0x03, 0x04]),
      new Uint8Array(18).fill(0xff),
      new Uint8Array([0x12, 0x34, 0x4b, 0x4e, 0x4c, 0x54, 0xab, 0xcd, 0xef, 0x00]),
    ];
    if (legacy) {
      for (const s of samples) {
        expect(crc16Modbus(s)).toBe(legacy.crc16_modbus(s));
      }
    }
  });

  it("matches block counter and CRC hex formatting", () => {
    expect(getHexBlockCount(0x1234)).toBe("3412");
    expect(buildOtaEndHex(10)).toBe("02ff0900f6ff");
    if (legacy) {
      for (const n of [0, 1, 7, 8, 255, 256, 1024, 4095, 65535]) {
        expect(getHexBlockCount(n)).toBe(legacy.getHexBLockCount(n));
      }
      const sampleHex = "0000" + "0102030405060708090a0b0c0d0e0f10";
      expect(getHexCrc(sampleHex)).toBe(legacy.getHexCRC(sampleHex));
    }
  });

  it("produces byte-for-byte identical OTA blocks and end packet on real firmware/ble_uart_bridge.bin", () => {
    const fwPath = path.resolve(process.cwd(), "../firmware/ble_uart_bridge.bin");
    const raw = fs.readFileSync(fwPath);
    const parsed = parseTelinkFirmware(raw);
    expect(parsed.ok).toBe(true);
    expect(parsed.rawSize).toBe(raw.byteLength);
    expect(parsed.paddedHex.length % 32).toBe(0);

    if (legacy) {
      let legacyHex = legacy.bytesToHex(raw);
      if (legacyHex.length % 32 !== 0) {
        const padHex = "ffffffffffffffffffffffffffffffff";
        legacyHex += padHex.substring(0, 32 - (legacyHex.length % 32));
      }
      expect(parsed.paddedHex).toBe(legacyHex);
      expect(parsed.blockCount).toBe(legacyHex.length / 32);

      for (const idx of [0, 1, 7, 8, Math.floor(parsed.blockCount / 2), parsed.blockCount - 1]) {
        const expectedBody = legacy.getHexBLockCount(idx) + legacyHex.substring(idx * 32, idx * 32 + 32);
        const expected = expectedBody + legacy.getHexCRC(expectedBody);
        expect(buildOtaBlockHex(parsed.paddedHex, idx)).toBe(expected);
        expect(hexToBytes(buildOtaBlockHex(parsed.paddedHex, idx)).byteLength).toBe(20);
      }

      const expectedEnd =
        "02ff" +
        legacy.getHexBLockCount(parsed.blockCount - 1) +
        legacy.getHexBLockCount(~(parsed.blockCount - 1) & 0xffff);
      expect(buildOtaEndHex(parsed.blockCount)).toBe(expectedEnd);
    }
  });

  it("rejects non-Telink binaries and builds spec-compliant requestDevice options", () => {
    expect(parseTelinkFirmware(new Uint8Array(32).fill(0x00)).ok).toBe(false);
    expect(buildOtaDeviceOptions("", false).acceptAllDevices).toBe(true);
    expect(buildOtaDeviceOptions("ATC_", false).acceptAllDevices).toBeUndefined();
    expect(buildOtaDeviceOptions("ATC_,ZK_", false).filters).toEqual([{ namePrefix: "ATC_" }, { namePrefix: "ZK_" }]);
  });
});
