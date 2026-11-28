import { ChevronLeft, Settings } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useApp } from "../context/useApp";
import { getTemplateById } from "../templates";

export function Topbar() {
  const { pathname } = useLocation();
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { ble, bleConnected, bleConnecting, bleName, battery } = useApp();

  const isHome = pathname === "/";
  const isToolRoute = pathname.startsWith("/tools/");
  let pageTitle = "";
  if (pathname === "/device") {
    pageTitle = "设备与关于";
  } else if (pathname === "/tools/ota") {
    pageTitle = "Telink BLE OTA 升级";
  } else if (pathname === "/tools/sws") {
    pageTitle = "SWS 串口单线烧录器";
  } else if (pathname === "/tools/uart") {
    pageTitle = "BLE-UART 双通道上位机";
  } else if (templateId) {
    pageTitle = getTemplateById(templateId)?.title ?? "编辑卡片";
  }

  return (
    <header className="topbar-safe sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-[#293856]/55 bg-[#0b1120]/92 px-3 pb-2.5 backdrop-blur-md sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {isHome ? (
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-red-500 to-red-700 text-[13px] font-extrabold tracking-wide text-white shadow-[0_4px_14px_rgba(239,68,68,0.35)]">
              INK
            </div>
            <div className="min-w-0">
              <h1 className="m-0 truncate text-[16px] leading-[1.15] font-extrabold tracking-tight text-slate-100">
                InkCard
              </h1>
              <span className="block truncate text-[11px] whitespace-nowrap text-slate-400">
                2.13&quot; 墨水屏助手
              </span>
            </div>
          </div>
        ) : (
          <>
            <button
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-[#293856] bg-[#131c31] text-slate-100 transition active:scale-95"
              type="button"
              title="返回首页"
              aria-label="返回首页"
              onClick={() => navigate("/")}
            >
              <ChevronLeft size={20} strokeWidth={2.2} className="block shrink-0" />
            </button>
            <span className="truncate text-[15.5px] font-bold text-slate-100">{pageTitle}</span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {!isToolRoute && (
          <button
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-[7px] text-[12px] font-semibold transition active:scale-95 disabled:cursor-wait disabled:opacity-80 ${
              bleConnected
                ? battery?.low
                  ? "border-red-500/60 bg-red-500/15 text-red-300"
                  : "border-emerald-400/50 bg-emerald-400/12 text-emerald-400"
                : bleConnecting
                  ? "border-amber-400/50 bg-amber-400/12 text-amber-300"
                  : "border-[#293856] bg-[#131c31] text-slate-100"
            }`}
            type="button"
            disabled={bleConnecting}
            title={
              bleConnected && battery
                ? `${bleName} · 电压 ${(battery.mv / 1000).toFixed(2)}V（约 ${battery.pct}%）`
                : undefined
            }
            onClick={() => void ble.toggleConnect()}
          >
            <span
              className={`size-2 shrink-0 rounded-full ${
                bleConnected
                  ? battery?.low
                    ? "animate-pulse bg-red-400 shadow-[0_0_8px_#f87171]"
                    : "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : bleConnecting
                    ? "animate-pulse bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                    : "bg-slate-500"
              }`}
            />
            <span className="max-w-[96px] truncate">
              {bleConnected ? bleName || "已连接" : bleConnecting ? "连接中..." : "连接蓝牙"}
            </span>
            {bleConnected && battery && (
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10.5px] leading-none ${
                  battery.low ? "bg-red-500/25 text-red-200" : "bg-black/25 text-emerald-200"
                }`}
              >
                {battery.low ? `低电 ${(battery.mv / 1000).toFixed(2)}V` : `${(battery.mv / 1000).toFixed(2)}V`}
              </span>
            )}
          </button>
        )}

        {isHome && (
          <button
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-[#293856] bg-[#131c31] text-slate-100 transition active:scale-95"
            type="button"
            title="设备设置与关于"
            aria-label="设备设置与关于"
            onClick={() => navigate("/device")}
          >
            <Settings size={18} strokeWidth={2} className="block shrink-0" />
          </button>
        )}
      </div>
    </header>
  );
}
