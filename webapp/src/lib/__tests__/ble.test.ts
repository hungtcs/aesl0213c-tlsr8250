import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildBoardConfigHex, createBleController, encodeInkRle } from "../ble";
import { bytesToHex } from "../canvas";

class MockCharacteristic extends EventTarget {
  value?: DataView;
  calls: string[] = [];
  writes: string[] = [];

  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (type === "characteristicvaluechanged") {
      this.calls.push("addEventListener");
    }
    super.addEventListener(type, listener, options);
  }

  async startNotifications(): Promise<MockCharacteristic> {
    this.calls.push("startNotifications");
    return this;
  }

  async writeValueWithoutResponse(data: BufferSource): Promise<void> {
    const view =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    this.writes.push(bytesToHex(view));
  }

  writesWithResponse: string[] = [];

  async writeValueWithResponse(data: BufferSource): Promise<void> {
    const view =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    this.writesWithResponse.push(bytesToHex(view));
  }

  emitNotify(hex: string): void {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    this.value = new DataView(bytes.buffer);
    this.dispatchEvent(new Event("characteristicvaluechanged"));
  }
}

class MockDevice extends EventTarget {
  name: string;
  char: MockCharacteristic;
  serviceUuid: number;
  gatt: {
    connected: boolean;
    connect: () => Promise<{
      getPrimaryService: (uuid: number | string) => Promise<{ getCharacteristic: () => Promise<MockCharacteristic> }>;
    }>;
    disconnect: () => void;
  };

  constructor(char: MockCharacteristic, serviceUuid = 0x1337, name = "ATC_123456") {
    super();
    this.name = name;
    this.char = char;
    this.serviceUuid = serviceUuid;
    this.gatt = {
      connected: false,
      connect: async () => {
        this.gatt.connected = true;
        return {
          getPrimaryService: async (uuid: number | string) => {
            if (uuid !== this.serviceUuid) throw new Error("Service not found");
            return {
              getCharacteristic: async () => this.char,
            };
          },
        };
      },
      disconnect: () => {
        this.gatt.connected = false;
        this.dispatchEvent(new Event("gattserverdisconnected"));
      },
    };
  }
}

describe("createBleController", () => {
  let mockChar: MockCharacteristic;
  let mockDevice: MockDevice;

  beforeEach(() => {
    vi.useFakeTimers();
    mockChar = new MockCharacteristic();
    mockDevice = new MockDevice(mockChar);
    vi.stubGlobal("navigator", {
      bluetooth: {
        requestDevice: vi.fn(async () => mockDevice),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("registers notification listener before startNotifications and waits settle delay before 0064", async () => {
    const ble = createBleController();
    const pushPromise = ble.pushBitplanesHex("00".repeat(32));

    // Flush connect microtasks
    await vi.advanceTimersByTimeAsync(0);
    expect(mockChar.calls).toEqual(["addEventListener", "startNotifications"]);
    // Should still be waiting for the 300ms post-connect settle delay
    expect(mockChar.writes).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(300);
    await pushPromise;
    expect(mockChar.writes).toHaveLength(1);
    expect(mockChar.writes[0].startsWith("0064")).toBe(true);
  });

  it("retries 0064 handshake and recovers when 00C6 arrives on retry", async () => {
    const progress: Array<[number, string]> = [];
    const uploadingStates: boolean[] = [];
    const ble = createBleController({
      onProgress: (pct, text) => progress.push([pct, text]),
      onUploadingChange: (busy) => uploadingStates.push(busy),
    });

    await ble.toggleConnect();
    await vi.advanceTimersByTimeAsync(300);

    await ble.pushBitplanesHex("00".repeat(32));
    expect(mockChar.writes).toHaveLength(1);
    expect(mockChar.writes[0].startsWith("0064")).toBe(true);

    // First retry after 2500ms
    await vi.advanceTimersByTimeAsync(2500);
    expect(mockChar.writes).toHaveLength(2);
    expect(mockChar.writes[1]).toBe(mockChar.writes[0]);
    expect(progress.at(-1)?.[1]).toContain("重试 1/3");

    // Device responds with 00C6 (block 0 request)
    mockChar.emitNotify("00C6" + "00".repeat(10));
    await vi.advanceTimersByTimeAsync(60);

    // Should have sent 0002 and first 0065 packet, and NOT retry 0064 again
    expect(mockChar.writes[2]).toBe("0002");
    expect(mockChar.writes[3].startsWith("0065")).toBe(true);

    // Device responds with 00C7 (done)
    mockChar.emitNotify("00C7");
    await vi.advanceTimersByTimeAsync(10);
    expect(mockChar.writes.at(-1)).toBe("0003");
    expect(uploadingStates.at(-1)).toBe(false);
  });

  it("unlocks uploading with error toast after all 0064 retries time out", async () => {
    const toasts: Array<[string, string | undefined]> = [];
    const uploadingStates: boolean[] = [];
    const ble = createBleController({
      onToast: (msg, cls) => toasts.push([msg, cls]),
      onUploadingChange: (busy) => uploadingStates.push(busy),
    });

    await ble.toggleConnect();
    await vi.advanceTimersByTimeAsync(300);
    await ble.pushBitplanesHex("00".repeat(32));

    // Initial + 3 retries + final timeout = 4 * 2500ms
    await vi.advanceTimersByTimeAsync(10000);
    expect(mockChar.writes.filter((w) => w.startsWith("0064"))).toHaveLength(4);
    expect(uploadingStates.at(-1)).toBe(false);
    expect(toasts.at(-1)?.[1]).toBe("err");
    expect(toasts.at(-1)?.[0]).toContain("设备无响应");
  });

  it("recovers from mid-transfer stall via transfer watchdog", async () => {
    const toasts: Array<[string, string | undefined]> = [];
    const uploadingStates: boolean[] = [];
    const ble = createBleController({
      onToast: (msg, cls) => toasts.push([msg, cls]),
      onUploadingChange: (busy) => uploadingStates.push(busy),
    });

    await ble.toggleConnect();
    await vi.advanceTimersByTimeAsync(300);
    await ble.pushBitplanesHex("00".repeat(32));

    mockChar.emitNotify("00C6" + "00".repeat(10));
    await vi.advanceTimersByTimeAsync(10000);

    expect(uploadingStates.at(-1)).toBe(false);
    expect(toasts.at(-1)?.[1]).toBe("err");
    expect(toasts.at(-1)?.[0]).toContain("传输超时");
  });

  it("sends 000F for applyBoardConfig and 0010 for saveBoardConfig", async () => {
    const ble = createBleController();
    await ble.toggleConnect();

    ble.applyBoardConfig();
    ble.saveBoardConfig();
    await vi.advanceTimersByTimeAsync(0);

    const cfg = buildBoardConfigHex();
    expect(cfg.length).toBe(93 * 2);
    expect(mockChar.writes).toEqual(["000F" + cfg, "0010" + cfg]);
  });

  it("immediately enters uploading state during direct push while disconnected and resets on cancel", async () => {
    const progress: Array<[number, string]> = [];
    const uploadingStates: boolean[] = [];
    vi.stubGlobal("navigator", {
      bluetooth: {
        requestDevice: vi.fn(async () => {
          throw new Error("User cancelled");
        }),
      },
    });

    const ble = createBleController({
      onProgress: (pct, text) => progress.push([pct, text]),
      onUploadingChange: (busy) => uploadingStates.push(busy),
    });

    await ble.pushBitplanesHex("00".repeat(32));

    expect(uploadingStates).toEqual([true, false]);
    expect(progress[0]).toEqual([2, "等待选择蓝牙设备..."]);
    expect(progress.at(-1)).toEqual([0, "推送到墨水屏"]);
  });

  it("shows iOS 185B MTU incompatibility message when transfer stalls on iOS", async () => {
    const toasts: Array<[string, string | undefined]> = [];
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPhone",
      maxTouchPoints: 5,
      bluetooth: {
        requestDevice: vi.fn(async () => mockDevice),
      },
    });

    const ble = createBleController({
      onToast: (msg, cls) => toasts.push([msg, cls]),
    });
    await ble.toggleConnect();
    await vi.advanceTimersByTimeAsync(300);

    await ble.pushBitplanesHex("00".repeat(32));
    mockChar.emitNotify("00C6" + "00".repeat(10));
    await vi.advanceTimersByTimeAsync(10000);

    expect(toasts.at(-1)?.[1]).toBe("err");
    expect(toasts.at(-1)?.[0]).toContain("185B");
  });

  it("supports InkCard 0xFE01 128B chunk protocol and emits low-battery warnings", async () => {
    const inkChar = new MockCharacteristic();
    const inkDevice = new MockDevice(inkChar, 0xfe01, "InkCard_3441");
    vi.stubGlobal("navigator", {
      bluetooth: {
        requestDevice: vi.fn(async () => inkDevice),
      },
    });

    const batteries: Array<{ mv: number; pct: number; low: boolean } | null> = [];
    const toasts: Array<[string, string | undefined]> = [];
    const uploadingStates: boolean[] = [];

    const ble = createBleController({
      onBatteryChange: (b) => batteries.push(b),
      onToast: (msg, cls) => toasts.push([msg, cls]),
      onUploadingChange: (busy) => uploadingStates.push(busy),
    });

    await ble.toggleConnect();
    await vi.advanceTimersByTimeAsync(300);

    // Connect triggers 0x04 INFO request
    expect(inkChar.writes[0]).toBe("04");

    // Simulate INFO reply with low battery (2450mV = 0x0992 -> 92 09, low=1)
    inkChar.emitNotify("850100009209017A00FA00");
    expect(batteries.at(-1)).toMatchObject({ mv: 2450, low: true });
    expect(toasts.at(-1)?.[0]).toContain("电量偏低");

    // Push 200-byte repeating payload -> RLE compresses 200B down to just 4 bytes (mode=1)!
    await ble.pushBitplanesHex("AA".repeat(200));
    expect(inkChar.writes[1].startsWith("0101")).toBe(true);
    expect(encodeInkRle(new Uint8Array(200).fill(0xaa)).length).toBe(4);

    // START ACK (chunk=160, vbat=2450mV, low=1)
    inkChar.emitNotify("8100A0920901");
    await vi.advanceTimersByTimeAsync(10);
    expect(inkChar.writes[2].startsWith("020000")).toBe(true);
    expect(inkChar.writes[2].length / 2).toBe(3 + 4);

    // DATA ACK seq 0 -> sends COMMIT (0x03)
    inkChar.emitNotify("82000000");
    await vi.advanceTimersByTimeAsync(10);
    expect(inkChar.writes[3]).toBe("03");

    // COMMIT ACK -> refreshing -> DONE (0x84)
    inkChar.emitNotify("8300");
    inkChar.emitNotify("8400920901");
    await vi.advanceTimersByTimeAsync(10);
    expect(uploadingStates.at(-1)).toBe(false);
    expect(toasts.at(-1)?.[0]).toContain("电量偏低");
  });
});
