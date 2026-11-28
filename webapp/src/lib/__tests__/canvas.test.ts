import { describe, expect, it } from "vitest";
import { buildBoardConfigHex } from "../ble";
import { buildWifiPayload, formatPhoneDisplay } from "../canvas";

describe("InkCard core helpers", () => {
  it("builds exact 93-byte AESL0213C dynamic hardware config", () => {
    const hex = buildBoardConfigHex();
    expect(hex.length).toBe(93 * 2);
    expect(hex.startsWith("FFFF")).toBe(true);
  });

  it("formats Chinese mobile phone numbers and escapes Wi-Fi fields", () => {
    expect(formatPhoneDisplay("13800138000")).toBe("138 0013 8000");
    expect(buildWifiPayload("客厅;WiFi", "a:b\\c", "WPA")).toBe("WIFI:T:WPA;S:客厅\\;WiFi;P:a\\:b\\\\c;;");
    expect(buildWifiPayload("OpenNet", "ignored", "nopass")).toBe("WIFI:T:nopass;S:OpenNet;P:;;");
  });
});
