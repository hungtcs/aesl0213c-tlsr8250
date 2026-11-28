import { SocialLinks } from "../components/SocialLinks";
import { useApp } from "../context/useApp";

export function DevicePage() {
  const { state, setFlip180, ble, bleConnected, bleName, battery, toastMsg, toastKind, bleLog } = useApp();

  const toastColor =
    toastKind === "ok" ? "text-emerald-400" : toastKind === "err" ? "text-red-400" : "text-slate-400";

  return (
    <main className="flex flex-col gap-5">
      {/* General & InkCard Device Settings */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[#293856] bg-[#131c31] p-3.5">
        <div className="flex items-center justify-between gap-2 text-sm font-bold text-slate-100">
          <span>设备与显示设置</span>
          {bleConnected && (
            <span className="font-mono text-xs font-normal text-emerald-400">
              {bleName || "已连接"}
              {battery ? ` · ${(battery.mv / 1000).toFixed(2)}V (${battery.pct}%)` : ""}
            </span>
          )}
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-[10px] border border-[#293856]/70 bg-[#0b1120]/60 px-3 py-2.5 text-[13px]">
          <span>画面 180° 上下翻转（适应支架方向）</span>
          <input
            type="checkbox"
            className="size-[18px] shrink-0 accent-red-500"
            checked={state.flip180}
            onChange={(e) => setFlip180(e.target.checked)}
          />
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            className="w-full cursor-pointer rounded-[10px] border border-[#293856] bg-[#1c2842] px-3 py-2.5 text-[13px] font-semibold text-slate-100 transition active:opacity-80"
            type="button"
            onClick={() => ble.readDeviceInfo()}
          >
            读取电量与信息
          </button>
          <button
            className="w-full cursor-pointer rounded-[10px] border border-red-500/45 bg-[#1c2842] px-3 py-2.5 text-[13px] font-semibold text-red-300 transition active:opacity-80"
            type="button"
            onClick={() => ble.triggerLowBatteryScreen()}
          >
            预览低电提示页
          </button>
        </div>

        <div className={`min-h-[18px] w-full text-center text-xs ${toastColor}`}>{toastMsg}</div>

        <details open className="rounded-[10px] border border-[#293856] bg-[#0b1120] px-2.5 py-2">
          <summary className="cursor-pointer text-xs text-slate-400">查看蓝牙通信日志</summary>
          <div className="mt-2 max-h-40 overflow-y-auto font-mono text-[11px] break-all whitespace-pre-wrap text-slate-400">
            {bleLog || "暂无日志"}
          </div>
        </details>
      </section>

      {/* Legacy ATC_BLE_OEPL Board Config Card */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[#293856] bg-[#131c31] p-3.5">
        <div className="flex items-center justify-between gap-2 text-sm font-bold text-slate-100">
          <span>ATC_BLE_OEPL 硬件配置</span>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-300">
            仅旧固件需要
          </span>
        </div>
        <p className="m-0 text-[11.5px] leading-relaxed text-slate-400">
          自研 <span className="font-mono text-slate-300">InkCard</span>{" "}
          固件已内置本板引脚与屏幕参数，无需配置。仅在刷入第三方{" "}
          <span className="font-mono text-slate-300">ATC_BLE_OEPL.bin</span> 时依次点击下方两步写入硬件配置。
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            className="w-full cursor-pointer rounded-[10px] border border-amber-400/45 bg-[#1c2842] px-3 py-2.5 text-[13px] font-semibold text-amber-400 transition active:opacity-80"
            type="button"
            onClick={() => ble.applyBoardConfig()}
          >
            ① 应用本板硬件配置
          </button>
          <button
            className="w-full cursor-pointer rounded-[10px] border border-emerald-400/45 bg-[#1c2842] px-3 py-2.5 text-[13px] font-semibold text-emerald-400 transition active:opacity-80"
            type="button"
            onClick={() => ble.saveBoardConfig()}
          >
            ② 永久保存至 Flash
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#293856] bg-[#131c31] p-3.5">
        <div className="flex items-center justify-between gap-2 text-sm font-bold text-slate-100">
          <span>关于 InkCard</span>
          <span className="font-mono text-xs font-normal text-slate-400">v{__APP_VERSION__}</span>
        </div>
        <div className="text-left text-[11.5px] leading-relaxed text-slate-400">
          InkCard 是面向 AESL0213C-TLSR8250 2.13 英寸黑白红三色墨水屏的离线卡片助手，内置 14 套实用与创意模板（挪车电话、Wi-Fi
          分享、门口提示、收纳标签、个人名片、防丢牌、日历、倒数日、工位桌牌、习惯打卡、竖排诗词、万能二维码、图片刷图与三色涂鸦），所有数据仅保存在本机浏览器中。
        </div>
        <SocialLinks align="left" />
      </section>
    </main>
  );
}
