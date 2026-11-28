import { Bluetooth, FileUp, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useApp } from "../../context/useApp";
import {
  TELINK_OTA_CHAR,
  TELINK_OTA_SERVICE,
  buildOtaBlockHex,
  buildOtaDeviceOptions,
  buildOtaEndHex,
  hexToBytes,
  parseTelinkFirmware,
} from "../../lib/ota";

interface OtaGattChar {
  properties?: { write?: boolean; writeWithoutResponse?: boolean };
  readValue(): Promise<DataView>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
  writeValueWithResponse?(value: BufferSource): Promise<void>;
  writeValue?(value: BufferSource): Promise<void>;
}

interface OtaDevice extends EventTarget {
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<{
      getPrimaryService(uuid: string): Promise<{ getCharacteristic(uuid: string): Promise<OtaGattChar> }>;
    }>;
    disconnect(): void;
  };
}

interface NavWithBt extends Navigator {
  bluetooth?: {
    requestDevice(options: unknown): Promise<OtaDevice>;
  };
}

const INPUT_CLASS =
  "w-full rounded-[10px] border border-[#293856] bg-[#0b1120] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function BleOtaPage() {
  const { ble } = useApp();
  const [namePrefix, setNamePrefix] = useState("");
  const [hideUnknown, setHideUnknown] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [hasDevice, setHasDevice] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [status, setStatus] = useState("等待连接 Telink BLE 设备");
  const [progress, setProgress] = useState(0);
  const [flashing, setFlashing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const devRef = useRef<OtaDevice | null>(null);
  const charRef = useRef<OtaGattChar | null>(null);

  useEffect(() => {
    // Release main InkCard BLE connection if still open so OTA can hold exclusive GATT link
    if (ble.isConnected()) {
      void ble.toggleConnect();
    }
    return () => {
      try {
        if (devRef.current?.gatt?.connected) devRef.current.gatt.disconnect();
      } catch {
        // ignore disconnect errors on unmount
      }
    };
  }, [ble]);

  function addLog(msg: string) {
    const ts = new Date().toTimeString().slice(0, 8);
    setLogs((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 120));
  }

  async function writeOtaHex(hex: string) {
    const ch = charRef.current;
    if (!ch) throw new Error("未连接 OTA 特征");
    const payload = hexToBytes(hex);
    const props = ch.properties ?? {};
    if (props.writeWithoutResponse && ch.writeValueWithoutResponse) {
      await ch.writeValueWithoutResponse(payload);
    } else if (props.write && ch.writeValueWithResponse) {
      await ch.writeValueWithResponse(payload);
    } else if (ch.writeValueWithResponse) {
      await ch.writeValueWithResponse(payload);
    } else if (ch.writeValue) {
      await ch.writeValue(payload);
    } else {
      throw new Error("当前浏览器不支持 GATT 写入");
    }
  }

  async function doConnect(dev: OtaDevice) {
    setStatus("正在连接 GATT...");
    const server = await dev.gatt!.connect();
    const svc = await server.getPrimaryService(TELINK_OTA_SERVICE);
    const ch = await svc.getCharacteristic(TELINK_OTA_CHAR);
    charRef.current = ch;
    setConnected(true);
    setDeviceName(dev.name || "Telink Device");
    setStatus("已连接，请选择 .bin 固件开始升级");
    addLog(`已连接 ${dev.name || "设备"}，找到 OTA 服务`);
  }

  async function handleConnect() {
    const bt = (navigator as NavWithBt).bluetooth;
    if (!bt) {
      addLog("当前浏览器不支持 Web Bluetooth，请使用 Chrome / Edge 或 iOS Safari + beacio 插件（不支持 iOS 主屏幕 PWA）");
      return;
    }
    try {
      setConnecting(true);
      if (devRef.current?.gatt?.connected) devRef.current.gatt.disconnect();
      charRef.current = null;
      setConnected(false);
      addLog("正在扫描 BLE 设备...");
      const dev = await bt.requestDevice(buildOtaDeviceOptions(namePrefix, hideUnknown));
      devRef.current = dev;
      setHasDevice(true);
      dev.addEventListener("gattserverdisconnected", () => {
        charRef.current = null;
        setConnected(false);
        setFlashing(false);
        addLog("设备已断开连接");
      });
      await doConnect(dev);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("No Services matching")) {
        setStatus("该设备不包含 Telink OTA 服务");
        addLog("该设备不包含 Telink OTA 服务 (00010203-...1912)");
      } else {
        setStatus("连接失败或取消");
        addLog(`连接失败: ${msg}`);
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleReconnect() {
    if (!devRef.current) {
      addLog("尚无已选设备，请先点击连接");
      return;
    }
    try {
      setConnecting(true);
      if (devRef.current.gatt?.connected) devRef.current.gatt.disconnect();
      charRef.current = null;
      setConnected(false);
      await doConnect(devRef.current);
    } catch (err: unknown) {
      addLog(`重连失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setConnecting(false);
    }
  }

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const buf = await file.arrayBuffer();
    const parsed = parseTelinkFirmware(buf);
    if (!parsed.ok) {
      setStatus(parsed.error || "无效固件");
      addLog(parsed.error || "无效固件");
      return;
    }

    addLog(`已选固件 ${file.name}（${parsed.rawSize} B，共 ${parsed.blockCount} 块）`);
    setFlashing(true);
    setProgress(0);
    const startTime = Date.now();

    try {
      // Auto-reconnect if GATT link dropped while user was picking the .bin file
      if (!devRef.current?.gatt?.connected || !charRef.current) {
        if (!devRef.current) throw new Error("请先连接蓝牙设备");
        addLog("检测到连接已断开，正在自动重连...");
        await doConnect(devRef.current);
      }
      setStatus("发送 OTA 启动指令 (00ff / 01ff)...");
      await delay(300);
      await writeOtaHex("00ff");
      await writeOtaHex("01ff");
      await delay(300);

      for (let blk = 0; blk < parsed.blockCount; blk++) {
        const pct = Math.floor((blk / parsed.blockCount) * 100);
        const sec = ((Date.now() - startTime) / 1000).toFixed(1);
        setProgress(pct);
        setStatus(`正在发送 ${blk + 1} / ${parsed.blockCount} 块 (${pct}%) · ${sec}s`);
        await writeOtaHex(buildOtaBlockHex(parsed.paddedHex, blk));
        if ((blk + 1) % 8 === 0) {
          await charRef.current!.readValue();
        }
      }

      await writeOtaHex(buildOtaEndHex(parsed.blockCount));
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setProgress(100);
      setStatus(`升级完成！耗时 ${elapsed}s，设备正在重启`);
      addLog(`OTA 升级完成，耗时 ${elapsed}s`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`升级失败: ${msg}`);
      addLog(`OTA 失败: ${msg}`);
    } finally {
      setFlashing(false);
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-2xl border border-[#293856] bg-[#131c31] p-4">
        <div>
          <h2 className="m-0 text-base font-bold text-slate-100">Telink BLE OTA 升级</h2>
          <p className="mt-0.5 mb-0 text-xs text-slate-400">
            无线向 TLSR825x 推送 .bin 固件（16B 分块 + CRC16-Modbus）
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={flashing || connecting}
            onClick={() => void handleConnect()}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-red-500 to-red-600 px-3 py-2.5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
          >
            <Bluetooth size={16} />
            {connecting ? "连接中..." : "连接设备"}
          </button>
          <button
            type="button"
            disabled={flashing || connecting || !hasDevice}
            onClick={() => void handleReconnect()}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#293856] bg-[#1c2842] px-3 py-2.5 text-sm font-semibold text-slate-100 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={15} />
            重连
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-[#293856] bg-[#0b1120] px-3 py-2 text-xs">
          <span className="inline-flex min-w-0 items-center gap-2 font-semibold">
            <span
              className={`size-2 shrink-0 rounded-full ${
                connected
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : connecting
                    ? "animate-pulse bg-amber-400"
                    : "bg-slate-500"
              }`}
            />
            <span className={`truncate ${connected ? "text-emerald-400" : connecting ? "text-amber-300" : "text-slate-400"}`}>
              {connected ? `已连接 · ${deviceName}` : connecting ? "正在连接设备..." : "未连接"}
            </span>
          </span>
          <span className="shrink-0 whitespace-nowrap text-[11px] text-slate-500">
            {connected ? "OTA 就绪" : "请先连接"}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="text"
            className={INPUT_CLASS}
            value={namePrefix}
            onChange={(e) => setNamePrefix(e.target.value)}
            placeholder="设备名称前缀过滤（可选，逗号分隔，如 InkCard_,ZK_）"
          />
          <label className="flex cursor-pointer items-center justify-between px-0.5 text-xs text-slate-300">
            <span>隐藏无名称未知设备</span>
            <input
              type="checkbox"
              className="size-4 accent-red-500"
              checked={hideUnknown}
              onChange={(e) => setHideUnknown(e.target.checked)}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#293856] bg-[#131c31] p-4">
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
          注意：请确认刷入对应芯片与引脚的 Telink `.bin` 固件，刷错固件可能导致需要 SWS 线刷恢复。
        </div>

        <label
          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed px-4 py-5 text-center text-xs transition ${
            connected && !flashing
              ? "cursor-pointer border-sky-400/50 bg-[#0b1120] text-slate-300 hover:border-sky-400"
              : "cursor-not-allowed border-[#293856] bg-[#0b1120]/50 text-slate-500"
          }`}
        >
          <FileUp size={20} className={connected ? "text-sky-400" : "text-slate-500"} />
          <strong className="text-sm text-slate-100">
            {flashing ? "正在刷写固件..." : "选择 .bin 固件并立即开始 OTA"}
          </strong>
          <span>自动校验 Telink 启动头 (0x544C4E4B)</span>
          <input
            type="file"
            accept=".bin"
            hidden
            disabled={!connected || flashing}
            onChange={(e) => void handleFileSelect(e)}
          />
        </label>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#0b1120]">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-amber-400 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-center text-xs text-slate-300">{status}</div>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-[#293856] bg-[#131c31] p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">OTA 日志</span>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#293856] bg-[#0b1120] px-2 py-1 text-xs text-slate-400"
          >
            <Trash2 size={12} />
            清空
          </button>
        </div>
        <div className="max-h-44 overflow-y-auto rounded-xl border border-[#293856] bg-[#0b1120] p-2.5 font-mono text-[11px] leading-relaxed text-slate-400">
          {logs.length ? logs.join("\n") : "暂无日志"}
        </div>
      </section>
    </main>
  );
}
