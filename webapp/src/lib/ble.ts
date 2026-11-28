import { deflate } from "pako";
import type { ToastKind } from "../types";
import { bytesToHex } from "./canvas";

/* Minimal Web Bluetooth type surface for strict TS without extra global @types */
interface BleGattCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BleGattCharacteristic>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
  writeValueWithResponse?(value: BufferSource): Promise<void>;
  writeValue?(value: BufferSource): Promise<void>;
}

interface BleGattService {
  getCharacteristic(uuid: number | string): Promise<BleGattCharacteristic>;
}

interface BleGattServer {
  connected: boolean;
  connect(): Promise<BleGattServer>;
  disconnect(): void;
  getPrimaryService(uuid: number | string): Promise<BleGattService>;
}

interface BleDevice extends EventTarget {
  name?: string;
  gatt?: BleGattServer;
}

interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: {
    requestDevice(options: {
      filters?: Array<{ namePrefix?: string; services?: Array<number | string> }>;
      optionalServices?: Array<number | string>;
    }): Promise<BleDevice>;
  };
}

function isIosUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const BLOCK_DATA_SIZE = 4096;
const BLOCK_PART_DATA_SIZE = 230;
const INKCARD_SERVICE_UUID = 0xfe01;
const INKCARD_CHAR_UUID = 0xfe02;
const INKCARD_CHUNK_SIZE = 160;
const LOW_BAT_MV = 2550;
const CONNECT_SETTLE_MS = 300;
const HANDSHAKE_RETRY_MS = 2500;
const HANDSHAKE_MAX_RETRIES = 3;
const TRANSFER_STALL_MS = 10000;
const REFRESH_WAIT_MS = 28000;
const WRITE_TIMEOUT_MS = 4000;

export interface BatteryInfo {
  mv: number;
  pct: number;
  low: boolean;
}

/**
 * Encode raw bitplane bytes using InkCard unsigned PackBits RLE:
 *   0x00..0x7F: literal run of (h + 1) bytes (1..128)
 *   0x80..0xFF: repeat run of ((h - 128) + 2) copies of next byte (2..129)
 */
export function encodeInkRle(input: Uint8Array): Uint8Array<ArrayBuffer> {
  const out: number[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    let run = 1;
    while (i + run < n && input[i + run] === input[i] && run < 129) {
      run++;
    }
    if (run >= 3) {
      out.push(0x80 + (run - 2), input[i]);
      i += run;
    } else {
      const litStart = i;
      let litLen = 0;
      while (i < n && litLen < 128) {
        let nextRun = 1;
        while (i + nextRun < n && input[i + nextRun] === input[i] && nextRun < 3) {
          nextRun++;
        }
        if (nextRun >= 3 && litLen > 0) break;
        i++;
        litLen++;
      }
      out.push(litLen - 1);
      for (let k = 0; k < litLen; k++) {
        out.push(input[litStart + k]);
      }
    }
  }
  return new Uint8Array(out);
}

export function buildBatteryInfo(mv: number, lowFlag = false): BatteryInfo {
  const pct = Math.max(0, Math.min(100, Math.round(((mv - 2300) / 700) * 100)));
  const low = lowFlag || (mv > 0 && mv < LOW_BAT_MV);
  return { mv, pct, low };
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function toHexU8(v: number): string {
  return (v & 0xff).toString(16).padStart(2, "0").toUpperCase();
}

function toHexU16LE(v: number): string {
  return toHexU8(v) + toHexU8(v >> 8);
}

function toHexU32LE(v: number): string {
  return toHexU16LE(v) + toHexU16LE(v >>> 16);
}

const crc32Table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = (c >>> 8) ^ crc32Table[(c ^ bytes[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

function packBlockWithHeader(hexStr: string): Uint8Array {
  const len = hexStr.length / 2;
  const out = new Uint8Array(4 + len);
  out[0] = len & 0xff;
  out[1] = (len >> 8) & 0xff;
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const b = parseInt(hexStr.substr(i * 2, 2), 16);
    sum += b;
    out[4 + i] = b;
  }
  out[2] = sum & 0xff;
  out[3] = (sum >> 8) & 0xff;
  return out;
}

export function buildBoardConfigHex(): string {
  // Verified AESL0213C Dynamic Config (93 bytes)
  let p = toHexU16LE(65535);
  p += toHexU16LE(0x0000) + toHexU16LE(1) + toHexU8(0) + toHexU16LE(0);
  p += toHexU16LE(250) + toHexU16LE(128) + toHexU16LE(0) + toHexU16LE(0);
  p += toHexU16LE(2) + toHexU16LE(1) + toHexU16LE(0);
  p += toHexU32LE(1) + toHexU32LE(0) + toHexU32LE(0) + toHexU32LE(0);
  p += toHexU16LE(0) + toHexU16LE(0) + toHexU8(0);

  p += toHexU16LE(0x0002) + toHexU16LE(0x0308) + toHexU16LE(0x0001) + toHexU16LE(0x0000);
  p += toHexU16LE(0x0304) + toHexU16LE(0x0000) + toHexU16LE(0x0380) + toHexU16LE(0x0180);
  p += toHexU16LE(0x0102) + toHexU16LE(0x0000) + toHexU8(0) + toHexU16LE(0x0000);
  p += toHexU8(0) + toHexU8(0) + toHexU8(0);

  p += "00".repeat(23);
  return p;
}

export interface BleHooks {
  onLog?: (msg: string) => void;
  onToast?: (msg: string, cls?: ToastKind) => void;
  onProgress?: (pct: number, text: string) => void;
  onConnChange?: (connected: boolean, name: string) => void;
  onConnectingChange?: (connecting: boolean) => void;
  onUploadingChange?: (busy: boolean) => void;
  onBatteryChange?: (info: BatteryInfo | null) => void;
}

export interface BleController {
  toggleConnect(): Promise<void>;
  pushBitplanesHex(rawHex: string): Promise<void>;
  applyBoardConfig(): void;
  saveBoardConfig(): void;
  readDeviceInfo(): void;
  triggerLowBatteryScreen(): void;
  isConnected(): boolean;
}

export function createBleController(hooks: BleHooks = {}): BleController {
  const emitLog = hooks.onLog ?? (() => {});
  const emitToast = hooks.onToast ?? (() => {});
  const emitProgress = hooks.onProgress ?? (() => {});
  const emitConn = hooks.onConnChange ?? (() => {});
  const emitConnecting = hooks.onConnectingChange ?? (() => {});
  const emitUploading = hooks.onUploadingChange ?? (() => {});
  const emitBattery = hooks.onBatteryChange ?? (() => {});

  let bleDevice: BleDevice | null = null;
  let bleChar: BleGattCharacteristic | null = null;
  let protocol: "oepl" | "inkcard" | null = null;
  let connectedAt = 0;
  let gattChain: Promise<void> = Promise.resolve();
  let imgHex = "";
  let imgByteLen = 0;
  let packets: string[] = [];
  let packetIdx = 0;
  let totalPackets = 0;
  let curBlockId = 0;
  let inkFullRawBytes: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  let inkRawBytes: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  let inkMode = 0;
  let inkChunkSize = INKCARD_CHUNK_SIZE;
  let inkSeq = 0;
  let inkTotalChunks = 0;
  let connecting = false;
  let uploading = false;
  let awaitingHandshake = false;
  let handshakeAttempts = 0;
  let lastHandshakeBytes: Uint8Array<ArrayBuffer> | null = null;
  let handshakeTimer: ReturnType<typeof setTimeout> | null = null;
  let transferTimer: ReturnType<typeof setTimeout> | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers(): void {
    if (handshakeTimer !== null) {
      clearTimeout(handshakeTimer);
      handshakeTimer = null;
    }
    if (transferTimer !== null) {
      clearTimeout(transferTimer);
      transferTimer = null;
    }
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    awaitingHandshake = false;
  }

  function resetTransferWatchdog(): void {
    if (transferTimer !== null) {
      clearTimeout(transferTimer);
    }
    transferTimer = setTimeout(() => {
      transferTimer = null;
      if (!uploading || !bleChar) return;
      clearTimers();
      gattChain = Promise.resolve();
      setUploading(false);
      emitProgress(0, "推送到墨水屏");
      emitLog("Transfer stalled: no ACK received");
      emitToast(
        protocol === "oepl" && isIosUserAgent()
          ? "iOS 蓝牙单包上限 185B，不兼容 ATC_BLE_OEPL 固件 235B 传图包；请刷入 InkCard 固件或换用安卓/电脑"
          : "传输超时，请靠近设备后重试",
        "err",
      );
    }, TRANSFER_STALL_MS);
  }

  function scheduleHandshakeRetry(): void {
    if (handshakeTimer !== null) {
      clearTimeout(handshakeTimer);
    }
    handshakeTimer = setTimeout(() => {
      handshakeTimer = null;
      if (!uploading || !awaitingHandshake || !bleChar || !lastHandshakeBytes) return;
      if (handshakeAttempts < HANDSHAKE_MAX_RETRIES) {
        handshakeAttempts++;
        emitLog(`Handshake timeout, retrying (${handshakeAttempts}/${HANDSHAKE_MAX_RETRIES})...`);
        emitProgress(10, `等待设备响应... (重试 ${handshakeAttempts}/${HANDSHAKE_MAX_RETRIES})`);
        void sendRaw(lastHandshakeBytes);
        scheduleHandshakeRetry();
      } else {
        clearTimers();
        setUploading(false);
        emitProgress(0, "推送到墨水屏");
        emitLog("Handshake failed: device did not respond");
        emitToast("设备无响应（可能正在刷新墨水屏或蓝牙信号弱），请稍后重试", "err");
      }
    }, HANDSHAKE_RETRY_MS);
  }

  function setUploading(val: boolean): void {
    uploading = val;
    emitUploading(val);
  }

  function sendRaw(bytes: Uint8Array<ArrayBuffer>): Promise<void> {
    const writeWithTimeout = (fn: (b: Uint8Array<ArrayBuffer>) => Promise<void>) =>
      new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("写入超时")), WRITE_TIMEOUT_MS);
        fn(bytes).then(
          () => {
            clearTimeout(t);
            resolve();
          },
          (err: unknown) => {
            clearTimeout(t);
            reject(err);
          },
        );
      });

    gattChain = gattChain
      .then(async () => {
        if (!bleChar) throw new Error("蓝牙未连接");
        const ch = bleChar;
        const writeFn = ch.writeValueWithoutResponse
          ? (b: Uint8Array<ArrayBuffer>) => ch.writeValueWithoutResponse!(b)
          : ch.writeValueWithResponse
            ? (b: Uint8Array<ArrayBuffer>) => ch.writeValueWithResponse!(b)
            : (b: Uint8Array<ArrayBuffer>) => ch.writeValue!(b);
        try {
          await writeWithTimeout(writeFn);
        } catch {
          await new Promise((r) => setTimeout(r, 120));
          await writeWithTimeout(writeFn);
        }
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        emitLog("TX ERR: " + msg);
        emitToast("发送失败: " + msg, "err");
        if (uploading) {
          clearTimers();
          setUploading(false);
          emitProgress(0, "推送到墨水屏");
        }
      });
    return gattChain;
  }

  function sendCmd(hexCmd: string): Promise<void> {
    emitLog("CMD> " + hexCmd.slice(0, 12) + (hexCmd.length > 12 ? `... (${hexCmd.length / 2}B)` : ""));
    return sendRaw(hexToBytes(hexCmd));
  }

  function sendNextPart(): void {
    void sendRaw(hexToBytes("0065" + packets[packetIdx]));
  }

  function startBlock(blockId: number): void {
    const blockHexLen = BLOCK_DATA_SIZE * 2;
    const sliceHex = imgHex.substring(blockId * blockHexLen, (blockId + 1) * blockHexLen);
    const dataBytes = packBlockWithHeader(sliceHex);
    packets = [];
    totalPackets = Math.ceil(dataBytes.length / BLOCK_PART_DATA_SIZE);
    for (let p = 0; p < totalPackets; p++) {
      const part = dataBytes.slice(p * BLOCK_PART_DATA_SIZE, (p + 1) * BLOCK_PART_DATA_SIZE);
      const buf = new Uint8Array(3 + BLOCK_PART_DATA_SIZE);
      buf[1] = blockId & 0xff;
      buf[2] = p & 0xff;
      buf.set(part, 3);
      let sum = 0;
      for (let k = 1; k < buf.length; k++) sum += buf[k];
      buf[0] = sum & 0xff;
      packets.push(bytesToHex(buf));
    }
    packetIdx = 0;
    sendNextPart();
  }

  function sendInkStart(payload: Uint8Array<ArrayBuffer>, mode: number): void {
    inkRawBytes = payload;
    inkMode = mode;
    const totalLen = payload.length;
    const crc = crc32(payload);
    const startPkt = new Uint8Array(8);
    startPkt[0] = 0x01;
    startPkt[1] = mode;
    startPkt[2] = totalLen & 0xff;
    startPkt[3] = (totalLen >> 8) & 0xff;
    startPkt[4] = crc & 0xff;
    startPkt[5] = (crc >>> 8) & 0xff;
    startPkt[6] = (crc >>> 16) & 0xff;
    startPkt[7] = (crc >>> 24) & 0xff;

    lastHandshakeBytes = startPkt;
    handshakeAttempts = 0;
    awaitingHandshake = true;
    emitLog(
      `INK> START mode=${mode} ${inkFullRawBytes.length}B->${totalLen}B crc=0x${crc.toString(16).padStart(8, "0")}`,
    );
    emitProgress(10, "等待设备响应...");
    void sendRaw(startPkt);
    scheduleHandshakeRetry();
  }

  function sendInkChunk(seq: number): void {
    const start = seq * inkChunkSize;
    const slice = inkRawBytes.subarray(start, Math.min(inkRawBytes.length, start + inkChunkSize));
    const pkt = new Uint8Array(3 + slice.length);
    pkt[0] = 0x02;
    pkt[1] = seq & 0xff;
    pkt[2] = (seq >> 8) & 0xff;
    pkt.set(slice, 3);
    void sendRaw(pkt);
  }

  function reportBattery(mv: number, lowFlag: boolean, toastIfLow = false): void {
    if (mv <= 0) return;
    const info = buildBatteryInfo(mv, lowFlag);
    emitBattery(info);
    emitLog(`VBAT: ${(mv / 1000).toFixed(2)}V (${info.pct}%)${info.low ? " [LOW]" : ""}`);
    if (toastIfLow && info.low) {
      emitToast(`设备电量偏低（${(mv / 1000).toFixed(2)}V / ${info.pct}%），建议尽快更换电池`, "err");
    }
  }

  function handleInkCardNotify(bytes: Uint8Array): void {
    if (bytes.length < 2) return;
    const op = bytes[0];
    emitLog("INK< " + bytesToHex(bytes.subarray(0, Math.min(bytes.length, 12))));

    if (op === 0x81) {
      /* START ACK: [0x81, status, chunk, vbat_lo, vbat_hi, low_bat] */
      const status = bytes[1];
      const chunk = bytes[2] || INKCARD_CHUNK_SIZE;
      if (bytes.length >= 6) {
        const mv = bytes[3] | (bytes[4] << 8);
        reportBattery(mv, bytes[5] === 1, false);
      }
      if (handshakeTimer !== null) {
        clearTimeout(handshakeTimer);
        handshakeTimer = null;
      }
      awaitingHandshake = false;
      if (status === 1) {
        clearTimers();
        setUploading(false);
        emitProgress(0, "推送到墨水屏");
        emitToast("墨水屏正在刷新中，请稍后再试", "err");
        return;
      }
      if (status === 2 && inkMode === 1 && inkFullRawBytes.length > 0) {
        emitLog("Firmware rejected RLE mode, falling back to raw mode (0)");
        emitToast("检测到旧版固件，自动切换兼容模式传输（建议 OTA 升级提速）");
        sendInkStart(inkFullRawBytes, 0);
        return;
      }
      if (status !== 0) {
        clearTimers();
        setUploading(false);
        emitProgress(0, "推送到墨水屏");
        emitToast("固件版本不兼容或图像参数异常，请通过 BLE OTA 升级至最新 InkCard 固件", "err");
        return;
      }
      inkChunkSize = Math.max(20, Math.min(160, chunk));
      inkSeq = 0;
      inkTotalChunks = Math.ceil(inkRawBytes.length / inkChunkSize);
      resetTransferWatchdog();
      emitProgress(12, "传输中 12%");
      sendInkChunk(0);
    } else if (op === 0x82) {
      /* DATA ACK: [0x82, status, seq_lo, seq_hi] */
      const status = bytes[1];
      if (status !== 0) {
        clearTimers();
        setUploading(false);
        emitProgress(0, "推送到墨水屏");
        emitToast("分包校验出错，请重试", "err");
        return;
      }
      resetTransferWatchdog();
      inkSeq++;
      if (inkSeq < inkTotalChunks) {
        const pct = Math.min(95, 12 + Math.round((inkSeq / inkTotalChunks) * 83));
        emitProgress(pct, `传输中 ${pct}%`);
        sendInkChunk(inkSeq);
      } else {
        emitProgress(96, "校验并刷新...");
        void sendRaw(new Uint8Array([0x03]));
      }
    } else if (op === 0x83) {
      /* COMMIT ACK: [0x83, status] */
      if (transferTimer !== null) {
        clearTimeout(transferTimer);
        transferTimer = null;
      }
      if (bytes[1] !== 0) {
        clearTimers();
        setUploading(false);
        emitProgress(0, "推送到墨水屏");
        const errMsg =
          bytes[1] === 1
            ? "整图 CRC 校验失败，请重试"
            : bytes[1] === 2
              ? "设备正在刷新或状态异常，请稍后再试"
              : bytes[1] === 3
                ? "压缩数据解压失败，请重试"
                : "设备提交刷新失败，请重试";
        emitToast(errMsg, "err");
        return;
      }
      emitProgress(98, "墨水屏刷新中（约 15 秒）...");
      emitToast("传输完成！墨水屏正在刷新（约 15 秒）", "ok");
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (!uploading) return;
        setUploading(false);
        emitProgress(0, "推送到墨水屏");
        emitToast("墨水屏刷新完成", "ok");
      }, REFRESH_WAIT_MS);
    } else if (op === 0x84) {
      /* REFRESH DONE: [0x84, status, vbat_lo, vbat_hi, low_bat] */
      clearTimers();
      setUploading(false);
      emitProgress(100, "刷新完成");
      const lowBat = bytes.length >= 5 && bytes[4] === 1;
      const mv = bytes.length >= 4 ? bytes[2] | (bytes[3] << 8) : 0;
      if (mv > 0) reportBattery(mv, lowBat, false);
      if (mv > 0 && (lowBat || mv < LOW_BAT_MV)) {
        emitToast(`刷新完成！注意电量偏低（${(mv / 1000).toFixed(2)}V），请及时更换电池`, "err");
      } else {
        emitToast(bytes[1] === 0 ? "墨水屏刷新完成！" : "墨水屏刷新超时，请检查画面", bytes[1] === 0 ? "ok" : "err");
      }
      setTimeout(() => emitProgress(0, "推送到墨水屏"), 2000);
    } else if (op === 0x85) {
      /* INFO: [0x85, fw_maj, fw_min, state, vbat_lo, vbat_hi, low_bat, w_lo, w_hi, h_lo, h_hi] */
      if (bytes.length >= 7) {
        const mv = bytes[4] | (bytes[5] << 8);
        const lowBat = bytes[6] === 1;
        emitLog(`InkCard FW v${bytes[1]}.${bytes[2]} state=${bytes[3]}`);
        reportBattery(mv, lowBat, true);
      }
    }
  }

  function handleBleNotify(ev: Event): void {
    const target = ev.target as BleGattCharacteristic | null;
    const v = target?.value ?? bleChar?.value;
    if (!v) return;
    const bytes = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
    if (protocol === "inkcard") {
      handleInkCardNotify(bytes);
      return;
    }
    const hex = bytesToHex(bytes);
    const cmd = hex.slice(0, 4);
    const payload = hex.slice(4);
    emitLog("RX< " + cmd + (payload ? " " + payload.slice(0, 24) : ""));

    if (cmd === "00C6") {
      if (handshakeTimer !== null) {
        clearTimeout(handshakeTimer);
        handshakeTimer = null;
      }
      awaitingHandshake = false;
      resetTransferWatchdog();
      curBlockId = parseInt(payload.slice(18, 20), 16) || 0;
      void sendCmd("0002");
      setTimeout(() => {
        if (uploading && bleChar) startBlock(curBlockId);
      }, 50);
    } else if (cmd === "00C5") {
      resetTransferWatchdog();
      packetIdx++;
      const sent = Math.min(curBlockId * BLOCK_DATA_SIZE + packetIdx * BLOCK_PART_DATA_SIZE, imgByteLen);
      const pct = Math.min(99, Math.round((sent / Math.max(1, imgByteLen)) * 100));
      emitProgress(pct, `传输中 ${pct}%`);
      if (packetIdx < totalPackets) sendNextPart();
    } else if (cmd === "00C4") {
      resetTransferWatchdog();
      setTimeout(() => {
        if (uploading && bleChar) sendNextPart();
      }, 100);
    } else if (cmd === "00C7" || cmd === "00C8") {
      clearTimers();
      void sendCmd("0003");
      setUploading(false);
      emitProgress(100, "传输完成");
      emitToast(cmd === "00C8" ? "画面已是最新，无需重刷" : "传输完成！墨水屏正在刷新（约 15 秒）", "ok");
      setTimeout(() => emitProgress(0, "推送到墨水屏"), 2500);
    }
  }

  function handleDisconnected(): void {
    clearTimers();
    gattChain = Promise.resolve();
    if (bleChar) {
      bleChar.removeEventListener("characteristicvaluechanged", handleBleNotify);
    }
    bleChar = null;
    protocol = null;
    connectedAt = 0;
    setUploading(false);
    emitBattery(null);
    emitConn(false, "");
    emitProgress(0, "推送到墨水屏");
    emitToast("蓝牙已断开");
    emitLog("Disconnected");
  }

  async function toggleConnect(): Promise<void> {
    if (bleDevice?.gatt?.connected) {
      bleDevice.gatt.disconnect();
      return;
    }
    if (connecting) return;
    const bt = (navigator as NavigatorWithBluetooth).bluetooth;
    if (!bt) {
      const nav = navigator as Navigator & { standalone?: boolean };
      const isIos =
        /iPad|iPhone|iPod/i.test(nav.userAgent) ||
        (nav.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1);
      const isIosPwa =
        isIos &&
        (nav.standalone === true ||
          (typeof window !== "undefined" &&
            window.matchMedia?.("(display-mode: standalone)").matches === true));
      emitToast(
        isIosPwa
          ? "iOS 主屏幕 PWA 无法启用蓝牙插件，请改用 Safari + beacio 插件打开"
          : "当前浏览器不支持 Web Bluetooth，请用 Chrome / Edge 或 iOS Safari + beacio 插件",
        "err",
      );
      return;
    }
    connecting = true;
    emitConnecting(true);
    try {
      emitToast("正在扫描 InkCard / ATC 墨水屏...");
      const prevDevice = bleDevice;
      if (prevDevice) {
        prevDevice.removeEventListener("gattserverdisconnected", handleDisconnected);
      }
      bleDevice = await bt.requestDevice({
        filters: [{ namePrefix: "InkCard_" }, { namePrefix: "ATC_" }],
        optionalServices: [INKCARD_SERVICE_UUID, 0x1337],
      });
      bleDevice.removeEventListener("gattserverdisconnected", handleDisconnected);
      bleDevice.addEventListener("gattserverdisconnected", handleDisconnected);
      emitToast(`正在连接 ${bleDevice.name || "墨水屏"}...`);
      if (uploading) emitProgress(4, "正在连接设备...");
      const server = await bleDevice.gatt!.connect();

      try {
        const inkSvc = await server.getPrimaryService(INKCARD_SERVICE_UUID);
        bleChar = await inkSvc.getCharacteristic(INKCARD_CHAR_UUID);
        protocol = "inkcard";
      } catch {
        const oeplSvc = await server.getPrimaryService(0x1337);
        bleChar = await oeplSvc.getCharacteristic(0x1337);
        protocol = "oepl";
      }

      bleChar.removeEventListener("characteristicvaluechanged", handleBleNotify);
      bleChar.addEventListener("characteristicvaluechanged", handleBleNotify);
      await bleChar.startNotifications();
      connectedAt = Date.now();

      emitConn(true, bleDevice.name || "已连接");
      emitToast(`已连接 ${bleDevice.name || "墨水屏"}，可以直接推送画面`, "ok");
      emitLog(`Connected to ${bleDevice.name || "device"} (${protocol})`);

      if (protocol === "inkcard") {
        setTimeout(() => {
          if (bleChar && protocol === "inkcard") {
            void sendRaw(new Uint8Array([0x04]));
          }
        }, 150);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      emitToast("连接取消或失败: " + msg, "err");
    } finally {
      connecting = false;
      emitConnecting(false);
    }
  }

  async function pushBitplanesHex(rawHex: string): Promise<void> {
    if (uploading || connecting) return;

    setUploading(true);
    if (!bleChar) {
      emitProgress(2, "等待选择蓝牙设备...");
      await toggleConnect();
      if (!bleChar) {
        setUploading(false);
        emitProgress(0, "推送到墨水屏");
        return;
      }
    }

    const elapsed = Date.now() - connectedAt;
    if (elapsed < CONNECT_SETTLE_MS) {
      await new Promise((r) => setTimeout(r, CONNECT_SETTLE_MS - elapsed));
      if (!bleChar || !uploading) return;
    }

    if (protocol === "inkcard") {
      inkFullRawBytes = hexToBytes(rawHex);
      const rleBytes = encodeInkRle(inkFullRawBytes);
      const useRle = rleBytes.length < inkFullRawBytes.length;
      sendInkStart(useRle ? rleBytes : inkFullRawBytes, useRle ? 1 : 0);
      return;
    }

    emitProgress(5, "压缩中...");
    emitToast("正在打包并压缩 128×250 三色位图...");

    const rawBytes = rawHex.length / 2;
    const framed = "06" + toHexU16LE(128) + toHexU16LE(250) + "02" + rawHex;
    const compressed = deflate(hexToBytes(framed), { level: 9, windowBits: 12 });
    imgHex = toHexU32LE(rawBytes) + bytesToHex(compressed);
    imgByteLen = imgHex.length / 2;

    emitLog(`Compressed ${rawBytes}B -> ${imgByteLen}B`);
    const ver = crc32(packBlockWithHeader(imgHex));
    const availHex = "FF" + toHexU32LE(ver) + "00000000" + toHexU32LE(imgByteLen) + "30" + "00" + "0000";

    lastHandshakeBytes = hexToBytes("0064" + availHex);
    handshakeAttempts = 0;
    awaitingHandshake = true;
    emitProgress(10, "等待设备响应...");
    void sendCmd("0064" + availHex);
    scheduleHandshakeRetry();
  }

  function applyBoardConfig(): void {
    if (!bleChar) {
      emitToast("请先连接蓝牙设备", "err");
      return;
    }
    if (protocol === "inkcard") {
      emitToast("InkCard 固件已内置本板硬件配置，无需手动设置", "ok");
      return;
    }
    void sendCmd("000F" + buildBoardConfigHex());
    emitToast("已发送硬件配置 (0x000F)，请点「永久保存」", "ok");
  }

  function saveBoardConfig(): void {
    if (!bleChar) {
      emitToast("请先连接蓝牙设备", "err");
      return;
    }
    if (protocol === "inkcard") {
      emitToast("InkCard 固件无需手动保存硬件配置", "ok");
      return;
    }
    void sendCmd("0010" + buildBoardConfigHex());
    emitToast("已发送保存指令 (0x0010)，配置永久写入 Flash", "ok");
  }

  function readDeviceInfo(): void {
    if (!bleChar) {
      emitToast("请先连接蓝牙设备", "err");
      return;
    }
    if (protocol === "inkcard") {
      void sendRaw(new Uint8Array([0x04]));
      emitToast("已请求设备电量与固件信息");
      return;
    }
    void sendCmd("0005");
    emitToast("已请求设备信息，请展开下方日志查看");
  }

  function triggerLowBatteryScreen(): void {
    if (!bleChar) {
      emitToast("请先连接蓝牙设备", "err");
      return;
    }
    if (protocol !== "inkcard") {
      emitToast("该功能仅支持自研 InkCard 固件", "err");
      return;
    }
    if (uploading) return;
    setUploading(true);
    emitProgress(96, "正在触发低电提示画面...");
    emitLog("INK> TEST_LOWBAT (0x05)");
    void sendRaw(new Uint8Array([0x05]));
  }

  return {
    toggleConnect,
    pushBitplanesHex,
    applyBoardConfig,
    saveBoardConfig,
    readDeviceInfo,
    triggerLowBatteryScreen,
    isConnected: () => Boolean(bleChar),
  };
}
