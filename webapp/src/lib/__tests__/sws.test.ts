import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import {
  buildCpuStopPkt,
  buildFlashByteCmdPkts,
  buildSectorErasePkts,
  buildSoftResetPkt,
  buildSwsSpeedPkt,
  buildWriteFlashBlkPkts,
  formatHexUpper,
  isValidTelinkBin,
  swsWrAddr,
} from "../sws";

interface LegacySwsFns {
  sws_wr_addr: (addr: number, data: Uint8Array) => Uint8Array;
  hex: (n: number, len: number) => string;
}

function loadLegacySws(): LegacySwsFns | null {
  const htmlPath = path.resolve(process.cwd(), "../web/sws_flasher.html");
  if (!fs.existsSync(htmlPath)) return null;
  const html = fs.readFileSync(htmlPath, "utf8");
  const match = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("No inline script in web/sws_flasher.html");

  const dummyEl = () => ({
    innerHTML: "",
    value: "",
    disabled: false,
    addEventListener() {},
  });
  const sandbox: Record<string, unknown> = {
    window: {},
    document: { getElementById: dummyEl, querySelector: dummyEl },
    navigator: {},
    console,
    Uint8Array,
    Uint32Array,
    Date,
    Promise,
    setTimeout,
    alert() {},
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(match[1], ctx);
  return {
    sws_wr_addr: sandbox.sws_wr_addr as LegacySwsFns["sws_wr_addr"],
    hex: sandbox.hex as LegacySwsFns["hex"],
  };
}

describe("TLSR825x SWS-over-UART protocol parity with web/sws_flasher.html", () => {
  const legacy = loadLegacySws();

  it("matches sws_wr_addr golden structure and legacy HTML byte-for-byte", () => {
    const cpuStop = buildCpuStopPkt();
    expect(cpuStop.byteLength).toBe(70);
    expect(cpuStop[0]).toBe(0x80); // start bit cmd=1
    expect(cpuStop[69]).toBe(0xfe); // final stop bit=0

    const cases: Array<[number, Uint8Array]> = [
      [0x0602, new Uint8Array([0x05])], // CPU stop
      [0x00b2, new Uint8Array([55])], // SWS speed
      [0x06f, new Uint8Array([0x20])], // Soft reset
      [0x00b3, new Uint8Array([0x80])], // FIFO mode on
      [0x00b3, new Uint8Array([0x00])], // FIFO mode off
      [0x0d, new Uint8Array([0x00])], // CNS low
      [0x0c, new Uint8Array([0x06, 0x01])], // Write enable + CNS high
      [0x0c, new Uint8Array([0x02, 0x01, 0x20, 0x00, 0xaa, 0x55, 0x00, 0xff])],
    ];
    if (legacy) {
      for (const [addr, data] of cases) {
        expect(Array.from(swsWrAddr(addr, data))).toEqual(Array.from(legacy.sws_wr_addr(addr, data)));
      }
      expect(Array.from(cpuStop)).toEqual(Array.from(legacy.sws_wr_addr(0x0602, new Uint8Array([0x05]))));
      expect(Array.from(buildSwsSpeedPkt(55))).toEqual(Array.from(legacy.sws_wr_addr(0x00b2, new Uint8Array([55]))));
      expect(Array.from(buildSoftResetPkt())).toEqual(Array.from(legacy.sws_wr_addr(0x06f, new Uint8Array([0x20]))));
    }
  });

  it("matches Flash command, sector erase, and 256B page write sequences on real firmware/epd_bars.bin", () => {
    const fwPath = path.resolve(process.cwd(), "../firmware/epd_bars.bin");
    const raw = fs.readFileSync(fwPath);
    const ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
    expect(isValidTelinkBin(ab)).toBe(true);
    expect(isValidTelinkBin(new ArrayBuffer(32))).toBe(false);

    const wake = buildFlashByteCmdPkts(0xab);
    expect(wake).toHaveLength(2);
    const erase = buildSectorErasePkts(0x001000);
    expect(erase).toHaveLength(7);
    const page = new Uint8Array(ab.slice(0, 256));
    const wrPkts = buildWriteFlashBlkPkts(0x000000, page);
    expect(wrPkts).toHaveLength(7);
    expect(wrPkts[4].byteLength).toBe((260 + 6) * 10);
    expect(formatHexUpper(0x1000, 6)).toBe("001000");

    if (legacy) {
      expect(Array.from(wake[0])).toEqual(Array.from(legacy.sws_wr_addr(0x0d, new Uint8Array([0x00]))));
      expect(Array.from(wake[1])).toEqual(Array.from(legacy.sws_wr_addr(0x0c, new Uint8Array([0xab, 0x01]))));
      expect(Array.from(erase[3])).toEqual(Array.from(legacy.sws_wr_addr(0x0c, new Uint8Array([0x20]))));
      expect(Array.from(erase[5])).toEqual(Array.from(legacy.sws_wr_addr(0x0c, new Uint8Array([0x10]))));
      const expectedBlk = new Uint8Array(260);
      expectedBlk[0] = 0x02;
      expectedBlk.set(page, 4);
      expect(Array.from(wrPkts[4])).toEqual(Array.from(legacy.sws_wr_addr(0x0c, expectedBlk)));
      expect(formatHexUpper(0x1000, 6)).toBe(legacy.hex(0x1000, 6));
    }
  });
});
