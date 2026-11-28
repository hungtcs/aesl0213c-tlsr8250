import { Bluetooth, Send, Trash2, Usb } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  FFE0_SVC,
  FFE1_CHR,
  NUS_RX,
  NUS_SVC,
  NUS_TX,
  UART_BAUDS,
  chunkBytes,
  parseAtInfoLine,
  parseHexString,
  toHexSpaced,
} from "../../lib/uart";

interface LogItem {
  id: number;
  ts: string;
  dir: "rx" | "tx" | "sys" | "err";
  text: string;
}

interface GattChar extends EventTarget {
  value?: DataView;
  properties?: { writeWithoutResponse?: boolean };
  startNotifications(): Promise<GattChar>;
  writeValueWithoutResponse?(v: BufferSource): Promise<void>;
  writeValueWithResponse?(v: BufferSource): Promise<void>;
  writeValue?(v: BufferSource): Promise<void>;
}

interface GattDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<{
      getPrimaryService(uuid: string | number): Promise<{ getCharacteristic(uuid: string | number): Promise<GattChar> }>;
    }>;
    disconnect(): void;
  };
}

interface SerialPortLike {
  open(opts: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

interface NavDual extends Navigator {
  bluetooth?: { requestDevice(opts: unknown): Promise<GattDevice> };
  serial?: { requestPort(): Promise<SerialPortLike> };
}

const enc = new TextEncoder();
const dec = new TextDecoder("utf-8", { fatal: false });

function nowTs() {
  const d = new Date();
  return `${d.toTimeString().slice(0, 8)}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

const INPUT_CLS =
  "w-full min-w-0 rounded-lg border border-[#293856] bg-[#0b1120] px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400";

export function BleUartPage() {
  /* BLE State */
  const [bleConnected, setBleConnected] = useState(false);
  const [bleName, setBleName] = useState("");
  const [bleLogs, setBleLogs] = useState<LogItem[]>([]);
  const [bleInput, setBleInput] = useState("");
  const [bleHexView, setBleHexView] = useState(false);
  const [bleHexSend, setBleHexSend] = useState(false);
  const [bleCrlf, setBleCrlf] = useState(true);
  const [bleStats, setBleStats] = useState({ rx: 0, tx: 0 });

  /* Serial State */
  const [serConnected, setSerConnected] = useState(false);
  const [serBaud, setSerBaud] = useState<number>(115200);
  const [serLogs, setSerLogs] = useState<LogItem[]>([]);
  const [serInput, setSerInput] = useState("");
  const [serHexView, setSerHexView] = useState(false);
  const [serHexSend, setSerHexSend] = useState(false);
  const [serCrlf, setSerCrlf] = useState(true);
  const [serStats, setSerStats] = useState({ rx: 0, tx: 0 });

  /* AT Config State */
  const [uartMode, setUartMode] = useState<"at" | "transparent">("at");
  const [vbat, setVbat] = useState("-- mV");
  const [mtu, setMtu] = useState("--");
  const [cfgName, setCfgName] = useState("");
  const [cfgBaud, setCfgBaud] = useState("115200");
  const [cfgTxPwr, setCfgTxPwr] = useState("3");
  const [cfgAdvInt, setCfgAdvInt] = useState("100");
  const [cfgEcho, setCfgEcho] = useState("0");
  const [cfgLog, setCfgLog] = useState("1");

  const logIdRef = useRef(0);
  const bleDevRef = useRef<GattDevice | null>(null);
  const bleRxRef = useRef<GattChar | null>(null);
  const bleHexViewRef = useRef(false);
  const serHexViewRef = useRef(false);
  const serPortRef = useRef<SerialPortLike | null>(null);
  const serReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const serWriterRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const serReadingRef = useRef(false);
  const serLineBufRef = useRef("");

  useEffect(() => {
    bleHexViewRef.current = bleHexView;
  }, [bleHexView]);

  useEffect(() => {
    serHexViewRef.current = serHexView;
  }, [serHexView]);

  useEffect(() => {
    return () => {
      serReadingRef.current = false;
      const reader = serReaderRef.current;
      const writer = serWriterRef.current;
      const port = serPortRef.current;
      const dev = bleDevRef.current;
      serReaderRef.current = null;
      serWriterRef.current = null;
      serPortRef.current = null;
      bleDevRef.current = null;
      bleRxRef.current = null;
      try {
        if (dev?.gatt?.connected) dev.gatt.disconnect();
      } catch {
        // ignore
      }
      void (async () => {
        try {
          if (reader) await reader.cancel();
        } catch {
          // ignore
        }
        try {
          writer?.releaseLock();
        } catch {
          // ignore
        }
        try {
          await port?.close();
        } catch {
          // ignore
        }
      })();
    };
  }, []);

  function pushLog(setter: typeof setBleLogs, dir: LogItem["dir"], text: string) {
    const id = ++logIdRef.current;
    setter((prev) => [...prev.slice(-240), { id, ts: nowTs(), dir, text }]);
  }

  /* ---------- BLE ---------- */
  async function connectBle() {
    const bt = (navigator as NavDual).bluetooth;
    if (!bt) {
      pushLog(setBleLogs, "err", "当前浏览器不支持 Web Bluetooth，请使用 Chrome / Edge 或 iOS Safari + beacio 插件（不支持 iOS 主屏幕 PWA）");
      return;
    }
    try {
      pushLog(setBleLogs, "sys", "正在扫描 BLE 透传设备 (NUS / 0xFFE0)...");
      const dev = await bt.requestDevice({
        filters: [{ services: [NUS_SVC] }, { services: [FFE0_SVC] }],
        optionalServices: [NUS_SVC, FFE0_SVC],
      });
      bleDevRef.current = dev;
      dev.addEventListener("gattserverdisconnected", () => {
        bleRxRef.current = null;
        setBleConnected(false);
        setBleName("");
        setUartMode("at");
        pushLog(setBleLogs, "sys", "BLE 连接已断开");
      });
      const server = await dev.gatt!.connect();
      let txChar: GattChar;
      try {
        const svc = await server.getPrimaryService(NUS_SVC);
        bleRxRef.current = await svc.getCharacteristic(NUS_RX);
        txChar = await svc.getCharacteristic(NUS_TX);
        pushLog(setBleLogs, "sys", `已连接 ${dev.name || dev.id} (Nordic UART)`);
      } catch {
        const svc = await server.getPrimaryService(FFE0_SVC);
        bleRxRef.current = txChar = await svc.getCharacteristic(FFE1_CHR);
        pushLog(setBleLogs, "sys", `已连接 ${dev.name || dev.id} (0xFFE0/0xFFE1)`);
      }
      await txChar.startNotifications();
      txChar.addEventListener("characteristicvaluechanged", (ev) => {
        const v = (ev.target as GattChar | null)?.value;
        if (!v) return;
        const bytes = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
        setBleStats((s) => ({ ...s, rx: s.rx + bytes.length }));
        pushLog(setBleLogs, "rx", bleHexViewRef.current ? toHexSpaced(bytes) : dec.decode(bytes));
      });
      setBleConnected(true);
      setBleName(dev.name || "已连接");
      setUartMode("transparent");
    } catch (err: unknown) {
      pushLog(setBleLogs, "err", `连接失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function bleSendBytes(bytes: Uint8Array) {
    const ch = bleRxRef.current;
    if (!ch || !bytes.length) return;
    try {
      for (const slice of chunkBytes(bytes, 200)) {
        if (ch.properties?.writeWithoutResponse && ch.writeValueWithoutResponse) {
          await ch.writeValueWithoutResponse(slice);
        } else if (ch.writeValueWithResponse) {
          await ch.writeValueWithResponse(slice);
        } else if (ch.writeValue) {
          await ch.writeValue(slice);
        }
      }
      setBleStats((s) => ({ ...s, tx: s.tx + bytes.length }));
      pushLog(setBleLogs, "tx", bleHexView ? toHexSpaced(bytes) : dec.decode(bytes));
    } catch (err: unknown) {
      pushLog(setBleLogs, "err", `发送失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleBleSend() {
    if (!bleInput) return;
    if (bleHexSend) {
      const bytes = parseHexString(bleInput);
      if (!bytes) {
        pushLog(setBleLogs, "err", "HEX 格式错误（需偶数位 0-9A-F）");
        return;
      }
      void bleSendBytes(bytes);
    } else {
      void bleSendBytes(enc.encode(bleInput + (bleCrlf ? "\r\n" : "")));
    }
  }

  /* ---------- Web Serial ---------- */
  function handleAtLine(line: string) {
    const evt = parseAtInfoLine(line);
    if (!evt) return;
    switch (evt.type) {
      case "mode":
        setUartMode(evt.mode);
        break;
      case "name":
        setCfgName(evt.value);
        break;
      case "baud":
        setCfgBaud(evt.value);
        break;
      case "txpwr":
        setCfgTxPwr(evt.value);
        break;
      case "advint":
        setCfgAdvInt(evt.value);
        break;
      case "echo":
        setCfgEcho(evt.value);
        break;
      case "log":
        setCfgLog(evt.value);
        break;
      case "vbat":
        setVbat(evt.value);
        break;
      case "mtu":
        setMtu(evt.value);
        break;
    }
  }

  async function serReadLoop(port: SerialPortLike) {
    if (!port.readable) return;
    const reader = port.readable.getReader();
    serReaderRef.current = reader;
    try {
      while (serReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value && value.length) {
          setSerStats((s) => ({ ...s, rx: s.rx + value.length }));
          const text = dec.decode(value);
          pushLog(setSerLogs, "rx", serHexViewRef.current ? toHexSpaced(value) : text);
          serLineBufRef.current += text;
          const parts = serLineBufRef.current.split(/\r?\n/);
          serLineBufRef.current = parts.pop() ?? "";
          parts.forEach(handleAtLine);
        }
      }
    } catch (err: unknown) {
      if (serReadingRef.current) {
        pushLog(setSerLogs, "err", `串口读取异常: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // ignore
      }
    }
  }

  async function connectSerial() {
    const serial = (navigator as NavDual).serial;
    if (!serial) {
      pushLog(setSerLogs, "err", "当前浏览器不支持 Web Serial，请使用桌面版 Chrome / Edge");
      return;
    }
    try {
      const port = await serial.requestPort();
      await port.open({ baudRate: serBaud });
      const writer = port.writable?.getWriter();
      if (!writer) throw new Error("无法打开串口写入流");
      serPortRef.current = port;
      serWriterRef.current = writer;
      serReadingRef.current = true;
      setSerConnected(true);
      setUartMode(bleConnected ? "transparent" : "at");
      pushLog(setSerLogs, "sys", `串口已打开 (${serBaud} 8N1)`);
      void serReadLoop(port);
    } catch (err: unknown) {
      pushLog(setSerLogs, "err", `打开串口失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function disconnectSerial() {
    serReadingRef.current = false;
    try {
      if (serReaderRef.current) await serReaderRef.current.cancel();
    } catch {
      // ignore
    }
    try {
      serWriterRef.current?.releaseLock();
    } catch {
      // ignore
    }
    try {
      await serPortRef.current?.close();
    } catch {
      // ignore
    }
    serPortRef.current = null;
    serReaderRef.current = null;
    serWriterRef.current = null;
    setSerConnected(false);
    pushLog(setSerLogs, "sys", "串口已关闭");
  }

  async function serSendBytes(bytes: Uint8Array) {
    if (!serWriterRef.current || !bytes.length) return;
    try {
      await serWriterRef.current.write(bytes);
      setSerStats((s) => ({ ...s, tx: s.tx + bytes.length }));
      pushLog(setSerLogs, "tx", serHexView ? toHexSpaced(bytes) : dec.decode(bytes));
    } catch (err: unknown) {
      pushLog(setSerLogs, "err", `串口发送失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function sendAt(cmd: string) {
    if (uartMode === "transparent") {
      pushLog(setSerLogs, "sys", "当前处于透传模式，自动发送 +++ 切入 AT 模式...");
      await serSendBytes(enc.encode("+++"));
      await new Promise((r) => setTimeout(r, 80));
    }
    await serSendBytes(enc.encode(`${cmd}\r\n`));
  }

  function handleSerSend() {
    if (!serInput) return;
    if (serHexSend) {
      const bytes = parseHexString(serInput);
      if (!bytes) {
        pushLog(setSerLogs, "err", "HEX 格式错误");
        return;
      }
      void serSendBytes(bytes);
    } else {
      void serSendBytes(enc.encode(serInput + (serCrlf ? "\r\n" : "")));
    }
  }

  const logColor = (d: LogItem["dir"]) =>
    d === "rx" ? "text-emerald-400" : d === "tx" ? "text-sky-400" : d === "err" ? "text-red-400" : "text-slate-400";
  const logPrefix = (d: LogItem["dir"]) => (d === "rx" ? "<< " : d === "tx" ? ">> " : d === "err" ? "!! " : "-- ");

  return (
    <main className="flex flex-col gap-4">
      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
        <span
          className={`rounded-full border px-2.5 py-0.5 ${
            bleConnected ? "border-emerald-400/45 text-emerald-400" : "border-[#293856] text-slate-400"
          } bg-[#131c31]`}
        >
          BLE: {bleConnected ? bleName : "未连接"}
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 ${
            serConnected ? "border-emerald-400/45 text-emerald-400" : "border-[#293856] text-slate-400"
          } bg-[#131c31]`}
        >
          UART: {serConnected ? `${serBaud}` : "未连接"}
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 ${
            uartMode === "at" ? "border-amber-400/45 text-amber-300" : "border-emerald-400/45 text-emerald-400"
          } bg-[#131c31]`}
        >
          {uartMode === "at" ? "AT 模式" : "纯透传"}
        </span>
        <span className="rounded-full border border-[#293856] bg-[#131c31] px-2.5 py-0.5 text-slate-300">
          VBAT: {vbat}
        </span>
        <span className="rounded-full border border-[#293856] bg-[#131c31] px-2.5 py-0.5 text-slate-300">
          MTU: {mtu}
        </span>
      </div>

      {/* BLE Panel */}
      <section className="flex flex-col gap-2.5 rounded-2xl border border-[#293856] bg-[#131c31] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-100">
            <Bluetooth size={15} className="text-sky-400" />
            BLE 蓝牙通道 (NUS / 0xFFE0)
          </span>
          <div className="flex items-center gap-1.5">
            {!bleConnected ? (
              <button
                type="button"
                onClick={() => void connectBle()}
                className="cursor-pointer rounded-lg bg-sky-400 px-3 py-1 text-xs font-bold text-slate-950"
              >
                连接蓝牙
              </button>
            ) : (
              <button
                type="button"
                onClick={() => bleDevRef.current?.gatt?.disconnect()}
                className="cursor-pointer rounded-lg border border-red-400/45 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300"
              >
                断开
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setBleLogs([]);
                setBleStats({ rx: 0, tx: 0 });
              }}
              className="cursor-pointer rounded-lg border border-[#293856] bg-[#0b1120] p-1.5 text-slate-400"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="h-44 overflow-y-auto rounded-xl border border-[#293856] bg-[#0b1120] p-2.5 font-mono text-[11.5px] break-all whitespace-pre-wrap">
          {bleLogs.map((l) => (
            <div key={l.id}>
              <span className="mr-1.5 text-slate-500">[{l.ts}]</span>
              <span className={logColor(l.dir)}>
                {logPrefix(l.dir)}
                {l.text}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            className={`${INPUT_CLS} font-mono`}
            placeholder="发送数据 (BLE -> UART)..."
            value={bleInput}
            onChange={(e) => setBleInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBleSend()}
          />
          <button
            type="button"
            disabled={!bleConnected}
            onClick={handleBleSend}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-bold text-slate-950 disabled:opacity-45"
          >
            <Send size={12} />
            发送
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={bleHexView} onChange={(e) => setBleHexView(e.target.checked)} />
              HEX 显示
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={bleHexSend} onChange={(e) => setBleHexSend(e.target.checked)} />
              HEX 发送
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={bleCrlf} onChange={(e) => setBleCrlf(e.target.checked)} />
              \r\n
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!bleConnected}
              onClick={() => void bleSendBytes(enc.encode("0123456789".repeat(10) + "\r\n"))}
              className="cursor-pointer rounded border border-[#293856] bg-[#0b1120] px-2 py-0.5 text-[11px] text-slate-300 disabled:opacity-45"
            >
              发 100B
            </button>
            <span>
              RX:{bleStats.rx}B | TX:{bleStats.tx}B
            </span>
          </div>
        </div>
      </section>

      {/* Serial Panel */}
      <section className="flex flex-col gap-2.5 rounded-2xl border border-[#293856] bg-[#131c31] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-100">
            <Usb size={15} className="text-amber-400" />
            硬件串口通道 (Web Serial)
          </span>
          <div className="flex items-center gap-1.5">
            <select
              disabled={serConnected}
              value={serBaud}
              onChange={(e) => setSerBaud(Number(e.target.value))}
              className="rounded-lg border border-[#293856] bg-[#0b1120] px-2 py-1 text-xs text-slate-100"
            >
              {UART_BAUDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {!serConnected ? (
              <button
                type="button"
                onClick={() => void connectSerial()}
                className="cursor-pointer rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950"
              >
                打开串口
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void disconnectSerial()}
                className="cursor-pointer rounded-lg border border-red-400/45 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300"
              >
                关闭
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSerLogs([]);
                setSerStats({ rx: 0, tx: 0 });
              }}
              className="cursor-pointer rounded-lg border border-[#293856] bg-[#0b1120] p-1.5 text-slate-400"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="h-44 overflow-y-auto rounded-xl border border-[#293856] bg-[#0b1120] p-2.5 font-mono text-[11.5px] break-all whitespace-pre-wrap">
          {serLogs.map((l) => (
            <div key={l.id}>
              <span className="mr-1.5 text-slate-500">[{l.ts}]</span>
              <span className={logColor(l.dir)}>
                {logPrefix(l.dir)}
                {l.text}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            className={`${INPUT_CLS} font-mono`}
            placeholder="输入 AT 指令或 UART -> BLE 透传数据..."
            value={serInput}
            onChange={(e) => setSerInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSerSend()}
          />
          <button
            type="button"
            disabled={!serConnected}
            onClick={handleSerSend}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 disabled:opacity-45"
          >
            <Send size={12} />
            发送
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={serHexView} onChange={(e) => setSerHexView(e.target.checked)} />
              HEX 显示
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={serHexSend} onChange={(e) => setSerHexSend(e.target.checked)} />
              HEX 发送
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={serCrlf} onChange={(e) => setSerCrlf(e.target.checked)} />
              \r\n
            </label>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!serConnected}
              onClick={() => void serSendBytes(enc.encode("+++"))}
              className="cursor-pointer rounded border border-[#293856] bg-[#0b1120] px-2 py-0.5 text-[11px] text-slate-300 disabled:opacity-45"
            >
              +++
            </button>
            <button
              type="button"
              disabled={!serConnected}
              onClick={() => void sendAt("AT+EXIT")}
              className="cursor-pointer rounded border border-[#293856] bg-[#0b1120] px-2 py-0.5 text-[11px] text-slate-300 disabled:opacity-45"
            >
              AT+EXIT
            </button>
            <span>
              RX:{serStats.rx}B | TX:{serStats.tx}B
            </span>
          </div>
        </div>
      </section>

      {/* AT Config Panel */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[#293856] bg-[#131c31] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-bold text-slate-100">AT 可视化配置（掉电保存 Flash）</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={!serConnected}
              onClick={() => void sendAt("AT+INFO?")}
              className="cursor-pointer rounded-lg bg-sky-400 px-2.5 py-1 text-xs font-bold text-slate-950 disabled:opacity-45"
            >
              读取 INFO
            </button>
            <button
              type="button"
              disabled={!serConnected}
              onClick={() => void sendAt("AT+VBAT?")}
              className="cursor-pointer rounded-lg border border-[#293856] bg-[#1c2842] px-2.5 py-1 text-xs text-slate-100 disabled:opacity-45"
            >
              测电压
            </button>
            <button
              type="button"
              disabled={!serConnected}
              onClick={() => void sendAt("AT+DISC")}
              className="cursor-pointer rounded-lg border border-[#293856] bg-[#1c2842] px-2.5 py-1 text-xs text-slate-100 disabled:opacity-45"
            >
              断开 BLE
            </button>
            <button
              type="button"
              disabled={!serConnected}
              onClick={() => void sendAt("AT+RESET")}
              className="cursor-pointer rounded-lg border border-[#293856] bg-[#1c2842] px-2.5 py-1 text-xs text-slate-100 disabled:opacity-45"
            >
              重启
            </button>
            <button
              type="button"
              disabled={!serConnected}
              onClick={() => void sendAt("AT+DEFAULT")}
              className="cursor-pointer rounded-lg border border-red-400/45 bg-red-500/15 px-2.5 py-1 text-xs text-red-300 disabled:opacity-45"
            >
              恢复出厂
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 rounded-xl border border-[#293856] bg-[#0b1120] p-2.5">
            <label className="text-[11px] text-slate-400">蓝牙广播名 (AT+NAME=)</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                maxLength={20}
                className={INPUT_CLS}
                placeholder="ZK_UART_A49F"
                value={cfgName}
                onChange={(e) => setCfgName(e.target.value)}
              />
              <button
                type="button"
                disabled={!serConnected || !cfgName.trim()}
                onClick={() => void sendAt(`AT+NAME=${cfgName.trim()}`)}
                className="shrink-0 cursor-pointer rounded-lg border border-[#293856] bg-[#1c2842] px-2.5 text-xs text-slate-100 disabled:opacity-45"
              >
                设置
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border border-[#293856] bg-[#0b1120] p-2.5">
            <label className="text-[11px] text-slate-400">串口波特率 (AT+BAUD=)</label>
            <div className="flex gap-1.5">
              <select className={INPUT_CLS} value={cfgBaud} onChange={(e) => setCfgBaud(e.target.value)}>
                {UART_BAUDS.map((b) => (
                  <option key={b} value={String(b)}>
                    {b}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!serConnected}
                onClick={() => void sendAt(`AT+BAUD=${cfgBaud}`)}
                className="shrink-0 cursor-pointer rounded-lg border border-[#293856] bg-[#1c2842] px-2.5 text-xs text-slate-100 disabled:opacity-45"
              >
                设置
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border border-[#293856] bg-[#0b1120] p-2.5">
            <label className="text-[11px] text-slate-400">发射功率 (AT+TXPWR=)</label>
            <div className="flex gap-1.5">
              <select className={INPUT_CLS} value={cfgTxPwr} onChange={(e) => setCfgTxPwr(e.target.value)}>
                <option value="0">0 (-9.9 dBm)</option>
                <option value="1">1 (-3.6 dBm)</option>
                <option value="2">2 (0.0 dBm)</option>
                <option value="3">3 (+3.0 dBm)</option>
                <option value="4">4 (+10.3 dBm)</option>
              </select>
              <button
                type="button"
                disabled={!serConnected}
                onClick={() => void sendAt(`AT+TXPWR=${cfgTxPwr}`)}
                className="shrink-0 cursor-pointer rounded-lg border border-[#293856] bg-[#1c2842] px-2.5 text-xs text-slate-100 disabled:opacity-45"
              >
                设置
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border border-[#293856] bg-[#0b1120] p-2.5">
            <label className="text-[11px] text-slate-400">广播间隔 ms (AT+ADVINT=)</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min={20}
                max={2000}
                className={INPUT_CLS}
                value={cfgAdvInt}
                onChange={(e) => setCfgAdvInt(e.target.value)}
              />
              <button
                type="button"
                disabled={!serConnected}
                onClick={() => void sendAt(`AT+ADVINT=${cfgAdvInt}`)}
                className="shrink-0 cursor-pointer rounded-lg border border-[#293856] bg-[#1c2842] px-2.5 text-xs text-slate-100 disabled:opacity-45"
              >
                设置
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border border-[#293856] bg-[#0b1120] p-2.5">
            <label className="text-[11px] text-slate-400">BLE 接收回显 (AT+ECHO=)</label>
            <div className="flex gap-1.5">
              <select className={INPUT_CLS} value={cfgEcho} onChange={(e) => setCfgEcho(e.target.value)}>
                <option value="0">0 - 关闭 (纯透传)</option>
                <option value="1">1 - 开启 (自动回显)</option>
              </select>
              <button
                type="button"
                disabled={!serConnected}
                onClick={() => void sendAt(`AT+ECHO=${cfgEcho}`)}
                className="shrink-0 cursor-pointer rounded-lg border border-[#293856] bg-[#1c2842] px-2.5 text-xs text-slate-100 disabled:opacity-45"
              >
                设置
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border border-[#293856] bg-[#0b1120] p-2.5">
            <label className="text-[11px] text-slate-400">串口状态日志 (AT+LOG=)</label>
            <div className="flex gap-1.5">
              <select className={INPUT_CLS} value={cfgLog} onChange={(e) => setCfgLog(e.target.value)}>
                <option value="1">1 - 开启 (+CONNECTED)</option>
                <option value="0">0 - 关闭 (纯净透传)</option>
              </select>
              <button
                type="button"
                disabled={!serConnected}
                onClick={() => void sendAt(`AT+LOG=${cfgLog}`)}
                className="shrink-0 cursor-pointer rounded-lg border border-[#293856] bg-[#1c2842] px-2.5 text-xs text-slate-100 disabled:opacity-45"
              >
                设置
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
