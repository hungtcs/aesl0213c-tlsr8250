import { Cpu, Eraser, FileUp, RotateCcw, Trash2, Usb } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  SWS_ACTIVATE_TIMES,
  SWS_BAUD_RATES,
  buildCpuStopPkt,
  buildFlashByteCmdPkts,
  buildSectorErasePkts,
  buildSoftResetPkt,
  buildSwsSpeedPkt,
  buildWriteFlashBlkPkts,
  formatHexUpper,
  isValidTelinkBin,
} from "../../lib/sws";

interface WebSerialPort {
  open(options: { baudRate: number; bufferSize?: number }): Promise<void>;
  setSignals(signals: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
}

interface NavWithSerial extends Navigator {
  serial?: {
    requestPort(): Promise<WebSerialPort>;
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const SELECT_CLASS =
  "w-full rounded-[10px] border border-[#293856] bg-[#0b1120] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400";

export function SwsFlasherPage() {
  const [baud, setBaud] = useState<number>(460800);
  const [atime, setAtime] = useState<number>(3000);
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fwName, setFwName] = useState("");
  const [fwSize, setFwSize] = useState(0);
  const [status, setStatus] = useState("请先打开 USB-TTL 串口并选择 .bin 固件");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const portRef = useRef<WebSerialPort | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const fwRef = useRef<ArrayBuffer | null>(null);

  useEffect(() => {
    return () => {
      const w = writerRef.current;
      const p = portRef.current;
      writerRef.current = null;
      portRef.current = null;
      void (async () => {
        try {
          if (w) await w.close();
        } catch {
          // ignore
        }
        try {
          if (p) await p.close();
        } catch {
          // ignore
        }
      })();
    };
  }, []);

  function addLog(msg: string) {
    const ts = new Date().toTimeString().slice(0, 8);
    setLogs((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 150));
  }

  async function writeRaw(pkt: Uint8Array) {
    if (!writerRef.current) throw new Error("串口未打开");
    await writerRef.current.write(pkt);
  }

  async function writePkts(pkts: Uint8Array[]) {
    for (const p of pkts) await writeRaw(p);
  }

  async function togglePort() {
    if (opened) {
      try {
        if (writerRef.current) {
          await writerRef.current.close();
          writerRef.current = null;
        }
        if (portRef.current) {
          await portRef.current.close();
          portRef.current = null;
        }
        setOpened(false);
        setStatus("串口已关闭");
        addLog("USB-COM 已关闭");
      } catch (err: unknown) {
        addLog(`关闭失败: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    const serial = (navigator as NavWithSerial).serial;
    if (!serial) {
      setStatus("当前浏览器不支持 Web Serial，请使用桌面版 Chrome / Edge");
      addLog("当前浏览器不支持 Web Serial API");
      return;
    }

    try {
      const port = await serial.requestPort();
      await port.open({ baudRate: baud, bufferSize: 240 });
      const writer = port.writable?.getWriter();
      if (!writer) throw new Error("无法获取串口写入流");
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });
      portRef.current = port;
      writerRef.current = writer;
      setOpened(true);
      setStatus(fwRef.current ? "串口已就绪，点击写入 Flash" : "串口已打开，请选择 .bin 固件");
      addLog(`USB-COM 已打开 (${baud} bps)`);
    } catch (err: unknown) {
      addLog(`打开串口失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function activateChip() {
    const port = portRef.current;
    if (!port) throw new Error("串口未打开");
    setStatus("Reset DTR/RTS (100 ms)...");
    addLog("Reset DTR/RTS (100 ms)");
    await port.setSignals({ dataTerminalReady: true, requestToSend: true });
    await delay(100);
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });

    await writeRaw(buildSoftResetPkt());

    const msg = `Activate (${(atime / 1000).toFixed(1)} sec)...`;
    setStatus(msg);
    addLog(msg);
    const stopPkt = buildCpuStopPkt();
    const t0 = Date.now();
    while (Date.now() - t0 < atime) {
      await writeRaw(stopPkt);
    }
    await writeRaw(buildSwsSpeedPkt(55));
    await writeRaw(stopPkt);
    await writePkts(buildFlashByteCmdPkts(0xab)); // FlashWakeUp
  }

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const buf = await file.arrayBuffer();
    if (!isValidTelinkBin(buf)) {
      fwRef.current = null;
      setFwName("");
      setFwSize(0);
      setStatus("所选文件不是有效的 Telink 固件 (.bin)");
      addLog("校验失败：缺少 0x544C4E4B 启动头");
      return;
    }
    fwRef.current = buf;
    setFwName(file.name);
    setFwSize(buf.byteLength);
    setStatus(opened ? "固件校验通过，可以写入 Flash" : "固件已加载，请先打开串口");
    addLog(`已选择固件 ${file.name} (${buf.byteLength} bytes)`);
  }

  async function handleFlashWrite() {
    const fw = fwRef.current;
    if (!fw || !opened) return;
    setBusy(true);
    setProgress(0);
    const t0 = Date.now();
    try {
      await activateChip();
      addLog(`开始写入 ${fw.byteLength} bytes 到 Flash...`);
      const total = fw.byteLength;
      let addr = 0;
      let left = total;
      while (left > 0) {
        if ((addr & 0x0fff) === 0) {
          setStatus(`擦除扇区 0x${formatHexUpper(addr, 6)}...`);
          await writePkts(buildSectorErasePkts(addr));
          await delay(300);
        }
        const chunkLen = Math.min(256, left);
        const pct = Math.round(((addr + chunkLen) / total) * 100);
        setProgress(pct);
        setStatus(`写入 0x${formatHexUpper(addr, 6)} (${pct}%)`);
        await writePkts(buildWriteFlashBlkPkts(addr, new Uint8Array(fw.slice(addr, addr + chunkLen))));
        await delay(10);
        addr += chunkLen;
        left -= chunkLen;
      }
      await writeRaw(buildSoftResetPkt());
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      setProgress(100);
      setStatus(`烧录完成并已软复位 (${sec}s)`);
      addLog(`写入完成，耗时 ${sec}s，已发送 Soft Reset MCU`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`烧录失败: ${msg}`);
      addLog(`烧录失败: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleEraseAll() {
    if (!opened) return;
    setBusy(true);
    try {
      await activateChip();
      setStatus("正在整片擦除 Flash (约 3.5 秒)...");
      addLog("Flash Erase All (3.5 sec)...");
      await writePkts(buildFlashByteCmdPkts(0x06)); // Write Enable
      await writePkts(buildFlashByteCmdPkts(0x60)); // Chip Erase
      await delay(3500);
      setStatus("整片擦除完成");
      addLog("Flash 整片擦除完成");
    } catch (err: unknown) {
      addLog(`擦除失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSoftReset() {
    if (!opened) return;
    setBusy(true);
    try {
      await activateChip();
      await writeRaw(buildSoftResetPkt());
      setStatus("已软复位 MCU");
      addLog("Soft Reset MCU 完成");
    } catch (err: unknown) {
      addLog(`复位失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-2xl border border-[#293856] bg-[#131c31] p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="m-0 text-base font-bold text-slate-100">TLSR825x SWS 串口烧录器</h2>
            <p className="mt-0.5 mb-0 text-xs text-slate-400">
              仅需 USB-TTL 的 TX 接板子 SWS 引脚即可在桌面 Chrome/Edge 烧录
            </p>
          </div>
          <span
            className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
              opened
                ? "border-emerald-400/45 bg-emerald-400/12 text-emerald-400"
                : "border-[#293856] bg-[#0b1120] text-slate-400"
            }`}
          >
            {opened ? "串口已打开" : "未连接"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">波特率 (Baud)</label>
            <select
              className={SELECT_CLASS}
              disabled={opened || busy}
              value={baud}
              onChange={(e) => setBaud(Number(e.target.value))}
            >
              {SWS_BAUD_RATES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">激活时长 (Atime)</label>
            <select
              className={SELECT_CLASS}
              disabled={busy}
              value={atime}
              onChange={(e) => setAtime(Number(e.target.value))}
            >
              {SWS_ACTIVATE_TIMES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void togglePort()}
          className={`inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.985] disabled:opacity-50 ${
            opened
              ? "border border-red-400/45 bg-red-500/15 text-red-300"
              : "bg-gradient-to-br from-sky-400 to-blue-500 text-slate-950"
          }`}
        >
          <Usb size={16} />
          {opened ? "关闭串口" : "打开 USB-COM 串口"}
        </button>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#293856] bg-[#131c31] p-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-[#293856] bg-[#0b1120] px-4 py-4 text-center text-xs text-slate-400 hover:border-sky-400/60">
          <FileUp size={18} className="text-sky-400" />
          <strong className="text-sm text-slate-100">
            {fwName ? `${fwName} (${fwSize} B)` : "点击选择 Telink .bin 固件"}
          </strong>
          <span>校验通过后点击下方「写入 Flash」</span>
          <input type="file" accept=".bin" hidden disabled={busy} onChange={(e) => void handleFileSelect(e)} />
        </label>

        <button
          type="button"
          disabled={!opened || !fwSize || busy}
          onClick={() => void handleFlashWrite()}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-red-500 to-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(239,68,68,0.3)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Cpu size={16} />
          写入 Flash
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={!opened || busy}
            onClick={() => void handleEraseAll()}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-400/45 bg-[#1c2842] px-3 py-2 text-xs font-semibold text-amber-300 disabled:opacity-45"
          >
            <Eraser size={14} />
            整片擦除 Flash
          </button>
          <button
            type="button"
            disabled={!opened || busy}
            onClick={() => void handleSoftReset()}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#293856] bg-[#1c2842] px-3 py-2 text-xs font-semibold text-slate-100 disabled:opacity-45"
          >
            <RotateCcw size={14} />
            软复位 MCU
          </button>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#0b1120]">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-center text-xs text-slate-300">{status}</div>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-[#293856] bg-[#131c31] p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">烧录日志</span>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#293856] bg-[#0b1120] px-2 py-1 text-xs text-slate-400"
          >
            <Trash2 size={12} />
            清空
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto rounded-xl border border-[#293856] bg-[#0b1120] p-2.5 font-mono text-[11px] leading-relaxed text-slate-400">
          {logs.length ? logs.join("\n") : "暂无日志"}
        </div>
      </section>
    </main>
  );
}
