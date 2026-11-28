import { describe, expect, it } from "vitest";
import { chunkBytes, parseAtInfoLine, parseHexString, toHexSpaced } from "../uart";

describe("BLE-UART helpers", () => {
  it("converts hex round-trip and rejects malformed hex", () => {
    const bytes = parseHexString("01 0a ff 5A");
    expect(bytes).not.toBeNull();
    expect(toHexSpaced(bytes!)).toBe("01 0A FF 5A");
    expect(parseHexString("ABC")).toBeNull();
    expect(parseHexString("   ")).toBeNull();
  });

  it("chunks payloads cleanly at 200B", () => {
    const buf = new Uint8Array(450).fill(0x41);
    const parts = chunkBytes(buf, 200);
    expect(parts.map((p) => p.byteLength)).toEqual([200, 200, 50]);
  });

  it("parses all AT status and info lines", () => {
    expect(parseAtInfoLine("+CONNECTED")).toEqual({ type: "mode", mode: "transparent" });
    expect(parseAtInfoLine("+DISCONNECTED:0x13")).toEqual({ type: "mode", mode: "at" });
    expect(parseAtInfoLine("+AT_MODE")).toEqual({ type: "mode", mode: "at" });
    expect(parseAtInfoLine("+NAME:ZK_UART_A49F")).toEqual({ type: "name", value: "ZK_UART_A49F" });
    expect(parseAtInfoLine("+BAUD:115200")).toEqual({ type: "baud", value: "115200" });
    expect(parseAtInfoLine("+TXPWR:3 (+3.0dBm)")).toEqual({ type: "txpwr", value: "3" });
    expect(parseAtInfoLine("+ADVINT:100ms")).toEqual({ type: "advint", value: "100" });
    expect(parseAtInfoLine("+VBAT:3020 mV")).toEqual({ type: "vbat", value: "3020 mV" });
    expect(parseAtInfoLine("+MTU:247")).toEqual({ type: "mtu", value: "247" });
    expect(parseAtInfoLine("OK")).toBeNull();
  });
});
