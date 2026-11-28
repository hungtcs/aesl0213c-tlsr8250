import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useApp } from "../context/useApp";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function PwaUpdatePrompt() {
  const { uploading } = useApp();
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        registrationRef.current = registration;
      }
    },
  });

  useEffect(() => {
    const checkUpdate = () => {
      if (navigator.onLine && registrationRef.current) {
        void registrationRef.current.update();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkUpdate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", checkUpdate);
    const timer = window.setInterval(checkUpdate, CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", checkUpdate);
      window.clearInterval(timer);
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-[528px] items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-2xl backdrop-blur"
    >
      <div className="min-w-0">
        <p className="font-semibold text-white">发现新版本</p>
        <p className="truncate text-xs text-slate-400">
          {uploading ? "蓝牙传输中，完成后可点击更新" : "点击更新以启用最新功能与修复"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          稍后
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={() => {
            void updateServiceWorker(true);
          }}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          立即更新
        </button>
      </div>
    </div>
  );
}
