import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { PwaUpdatePrompt } from "./PwaUpdatePrompt";
import { Topbar } from "./Topbar";

function isIosStandalonePwa(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean; bluetooth?: unknown };
  const isIos =
    /iPad|iPhone|iPod/i.test(nav.userAgent) ||
    (nav.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1);
  if (!isIos) return false;
  const isStandalone =
    nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
  return isStandalone && !nav.bluetooth;
}

export function RootLayout() {
  const { pathname } = useLocation();
  const [showIosPwaTip, setShowIosPwaTip] = useState(() => isIosStandalonePwa());

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="app-safe mx-auto flex min-h-dvh max-w-[540px] flex-col">
      <Topbar />
      <div className="flex flex-1 flex-col px-3 pt-3 sm:px-4">
        {showIosPwaTip && (
          <div
            role="alert"
            className="mb-3 flex items-start justify-between gap-2 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed text-amber-200"
          >
            <span>
              检测到当前处于 <b>iOS 主屏幕 PWA 模式</b>，Safari 蓝牙插件（如{" "}
              <span className="font-mono font-semibold text-amber-100">beacio</span>
              ）在主屏幕 PWA 中无法生效。请直接在 <b>Safari</b> 中打开本页并启用{" "}
              <span className="font-mono font-semibold text-amber-100">beacio</span>（或使用{" "}
              <span className="font-mono">SHX Browser</span>）。
            </span>
            <button
              type="button"
              aria-label="关闭提示"
              onClick={() => setShowIosPwaTip(false)}
              className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 text-amber-300 transition hover:bg-amber-400/15"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <Outlet />
      </div>
      <PwaUpdatePrompt />
    </div>
  );
}
