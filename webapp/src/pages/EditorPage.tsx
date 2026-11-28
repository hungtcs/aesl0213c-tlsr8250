import { Contrast, Download, ScanLine, Star, Undo2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { Navigate, useParams } from "react-router";
import { AppIcon } from "../components/Icon";
import { useApp } from "../context/useApp";
import { loadBitmapFont } from "../lib/bitmapFont";
import {
  buildHardwareBitplanesHex,
  decodeQrFromImage,
  exportCrispPng,
  renderWithBitmapFont,
} from "../lib/canvas";
import { getTemplateById } from "../templates";
import type { DrawStroke } from "../types";

const WEEKDAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];
const BRUSH_COLORS = [
  { hex: "#000000", label: "黑笔" },
  { hex: "#FF0000", label: "红笔" },
  { hex: "#FFFFFF", label: "橡皮" },
];

const INPUT_CLASS =
  "w-full rounded-[10px] border border-[#293856] bg-[#0b1120] px-[11px] py-[9px] text-sm text-slate-100 outline-none focus:border-sky-400";

export function EditorPage() {
  const { templateId } = useParams();
  const tpl = getTemplateById(templateId);
  const {
    state,
    patchValues,
    resetValues,
    getOrientation,
    setOrientation,
    getInvert,
    toggleInvert,
    getSchemes,
    saveScheme,
    applyScheme,
    deleteScheme,
    ble,
    uploading,
    progressPct,
    progressText,
    toastMsg,
    toastKind,
    showToast,
  } = useApp();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadedPhoto, setLoadedPhoto] = useState<HTMLImageElement | null>(null);
  const [fontTick, setFontTick] = useState(0);
  const [viewportW, setViewportW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 400));

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const dragRef = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
  });
  const strokeRef = useRef<DrawStroke | null>(null);

  const savedTplValues = tpl ? state.values[tpl.id] : undefined;
  const vals = useMemo(
    () => (tpl ? { ...tpl.defaults, ...(savedTplValues ?? {}) } : {}),
    [tpl, savedTplValues],
  );
  const ori = tpl ? getOrientation(tpl) : "landscape";
  const inv = tpl ? getInvert(tpl.id) : false;
  const W = ori === "portrait" ? 122 : 250;
  const H = ori === "portrait" ? 250 : 122;

  // Enlarge preview while snapping strictly to an integer multiple of physical pixels
  const dpr = typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
  const availCssW = Math.min(470, Math.max(122, viewportW - 86));
  const targetCssW = ori === "portrait" ? Math.min(250, availCssW) : availCssW;
  const physScale = Math.max(1, Math.floor((targetCssW * dpr) / W));
  const previewCssW = (physScale * W) / dpr;
  const previewCssH = (physScale * H) / dpr;

  useEffect(() => {
    let active = true;
    void Promise.all([loadBitmapFont("pixel12"), loadBitmapFont("pixel10")]).then((fonts) => {
      if (active && fonts.some(Boolean)) setFontTick((n) => n + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!tpl || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    renderWithBitmapFont(ctx, (renderCtx) => {
      tpl.render(renderCtx, W, H, vals, { photo: loadedPhoto, invert: inv });
    });
  }, [tpl, W, H, vals, loadedPhoto, inv, fontTick]);

  if (!tpl) {
    return <Navigate to="/" replace />;
  }

  const schemes = getSchemes(tpl.id);
  const toastColor =
    toastKind === "ok" ? "text-emerald-400" : toastKind === "err" ? "text-red-400" : "text-slate-400";

  function canvasNormPt(e: ReactPointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return [Number(x.toFixed(4)), Number(y.toFixed(4))];
  }

  function onCanvasPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!tpl) return;
    if (tpl.isDraw) {
      const newStroke: DrawStroke = {
        color: typeof vals.brushColor === "string" ? vals.brushColor : "#000000",
        size: Number(vals.brushSize) || 3,
        pts: [canvasNormPt(e)],
      };
      strokeRef.current = newStroke;
      e.currentTarget.setPointerCapture(e.pointerId);
      patchValues(tpl, (cur) => {
        const curStrokes = Array.isArray(cur.strokes) ? (cur.strokes as DrawStroke[]) : [];
        return { strokes: [...curStrokes, newStroke] };
      });
      return;
    }
    if (tpl.isPhoto && loadedPhoto) {
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        baseX: parseFloat(String(vals.posX ?? "0")) || 0,
        baseY: parseFloat(String(vals.posY ?? "0")) || 0,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }

  function onCanvasPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!tpl) return;
    if (strokeRef.current && tpl.isDraw) {
      const pt = canvasNormPt(e);
      const pts = strokeRef.current.pts;
      const prev = pts[pts.length - 1];
      if (Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) >= 0.006) {
        const updatedStroke: DrawStroke = { ...strokeRef.current, pts: [...pts, pt] };
        strokeRef.current = updatedStroke;
        patchValues(tpl, (cur) => {
          const curStrokes = Array.isArray(cur.strokes) ? (cur.strokes as DrawStroke[]) : [];
          return { strokes: curStrokes.length ? [...curStrokes.slice(0, -1), updatedStroke] : [updatedStroke] };
        });
      }
      return;
    }
    if (dragRef.current.active && tpl.isPhoto) {
      const rect = e.currentTarget.getBoundingClientRect();
      const nx = Math.max(
        -100,
        Math.min(100, Math.round(dragRef.current.baseX + ((e.clientX - dragRef.current.startX) / rect.width) * 200)),
      );
      const ny = Math.max(
        -100,
        Math.min(100, Math.round(dragRef.current.baseY + ((e.clientY - dragRef.current.startY) / rect.height) * 200)),
      );
      patchValues(tpl, { posX: String(nx), posY: String(ny) });
    }
  }

  function onCanvasPointerUp() {
    strokeRef.current = null;
    dragRef.current.active = false;
  }

  function handlePhotoFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      setLoadedPhoto(img);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
    e.target.value = "";
  }

  function handleQrDecodeFile(e: ChangeEvent<HTMLInputElement>) {
    if (!tpl?.qrDecodeField) return;
    const targetField = tpl.qrDecodeField;
    const f = e.target.files?.[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const decoded = decodeQrFromImage(img);
      URL.revokeObjectURL(img.src);
      if (decoded) {
        patchValues(tpl, { [targetField]: decoded });
        showToast("已识别二维码并重新生成高清矢量码", "ok");
      } else {
        showToast("未识别到标准二维码（暂不支持小程序码等非标准码）", "err");
      }
    };
    img.onerror = () => {
      showToast("图片读取失败，请重新选择", "err");
    };
    img.src = URL.createObjectURL(f);
    e.target.value = "";
  }

  function handleSaveScheme() {
    if (!tpl) return;
    const suggest =
      (typeof vals.title === "string" && vals.title) ||
      (typeof vals.ssid === "string" && vals.ssid) ||
      (typeof vals.phone === "string" && vals.phone) ||
      (typeof vals.name === "string" && vals.name) ||
      `${tpl.title} #${schemes.length + 1}`;
    const name = (window.prompt("给这套方案起个名字：", suggest.slice(0, 14)) || "").trim();
    if (!name) return;
    saveScheme(tpl, name);
  }

  function handlePush() {
    if (!canvasRef.current || !tpl) return;
    const rawHex = buildHardwareBitplanesHex(canvasRef.current, ori, state.flip180);
    void ble.pushBitplanesHex(rawHex);
  }

  function handleExportPng() {
    if (!canvasRef.current || !tpl) return;
    exportCrispPng(canvasRef.current, `inkcard-${tpl.id}.png`, 4);
    showToast("已导出 4× 高清 PNG 预览图", "ok");
  }

  return (
    <main className="flex flex-col gap-5">
      {/* Live Preview Stage */}
      <section className="flex flex-col items-center gap-3 rounded-[18px] border border-[#293856] bg-[#131c31] p-3.5">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            {ori === "portrait" ? "竖屏" : "横屏"} {W} × {H} px
          </span>
          <div className="inline-flex items-center gap-1.5">
            <button
              className={`inline-flex cursor-pointer items-center gap-[5px] rounded-lg border px-[9px] py-[5px] text-[11.5px] font-semibold transition active:scale-95 ${
                inv
                  ? "border-red-500/50 bg-red-500/15 text-red-300"
                  : "border-[#293856] bg-[#0b1120] text-slate-400"
              }`}
              type="button"
              title="黑白反色（保留红色）"
              onClick={() => toggleInvert(tpl.id)}
            >
              <Contrast size={13} strokeWidth={2} className="block shrink-0" />
              <span>反色</span>
            </button>
            <button
              className="inline-flex cursor-pointer items-center gap-[5px] rounded-lg border border-[#293856] bg-[#0b1120] px-[9px] py-[5px] text-[11.5px] font-semibold text-slate-400 transition active:scale-95"
              type="button"
              title="导出高清 PNG 图片"
              onClick={handleExportPng}
            >
              <Download size={13} strokeWidth={2} className="block shrink-0" />
              <span>存图</span>
            </button>
            <div className="inline-flex gap-0.5 rounded-lg border border-[#293856] bg-[#0b1120] p-0.5">
              <button
                className={`cursor-pointer rounded-md border-none px-2.5 py-1 text-[11.5px] font-semibold ${
                  ori === "portrait" ? "bg-[#1c2842] text-slate-100" : "bg-transparent text-slate-400"
                }`}
                type="button"
                onClick={() => setOrientation(tpl.id, "portrait")}
              >
                竖屏
              </button>
              <button
                className={`cursor-pointer rounded-md border-none px-2.5 py-1 text-[11.5px] font-semibold ${
                  ori === "landscape" ? "bg-[#1c2842] text-slate-100" : "bg-transparent text-slate-400"
                }`}
                type="button"
                onClick={() => setOrientation(tpl.id, "landscape")}
              >
                横屏
              </button>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center justify-center rounded-[14px] border-2 border-slate-300 bg-[#e7e5de] p-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.7)]">
          <canvas
            ref={canvasRef}
            className="epd-canvas block max-w-full rounded-[2px] border border-slate-400 bg-white"
            width={W}
            height={H}
            style={{ width: `${previewCssW}px`, height: `${previewCssH}px` }}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerUp}
          />
        </div>

        <button
          className="relative flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border-none bg-gradient-to-br from-red-500 to-red-600 text-[15px] font-bold text-white shadow-[0_6px_18px_rgba(239,68,68,0.32)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55"
          type="button"
          disabled={uploading}
          onClick={handlePush}
        >
          <div
            className="absolute inset-y-0 left-0 bg-white/25 transition-[width] duration-150 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
          <Upload size={17} strokeWidth={2.2} className="relative z-10 block shrink-0" />
          <span className="relative z-10">{progressText}</span>
        </button>

        <div className={`min-h-[18px] w-full text-center text-xs ${toastColor}`}>{toastMsg}</div>
      </section>

      {/* Template Form Card */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[#293856] bg-[#131c31] p-3.5">
        <div className="flex items-center justify-between gap-2 text-sm font-bold text-slate-100">
          <span className="inline-flex items-center gap-1.5">
            <AppIcon name={tpl.icon} size={16} />
            {tpl.title}设置
          </span>
          <button
            className="cursor-pointer rounded-full border border-[#293856] bg-[#0b1120] px-[11px] py-1.5 text-xs text-slate-100 active:bg-[#1c2842]"
            type="button"
            onClick={() => resetValues(tpl)}
          >
            {tpl.isPhoto ? "重置位置" : tpl.isDraw ? "清空画布" : "恢复默认"}
          </button>
        </div>

        {!tpl.isPhoto && (
          <div className="flex flex-col gap-2 rounded-xl border border-[#293856] bg-[#0b1120] px-[11px] py-2.5">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Star size={13} strokeWidth={2} className="block shrink-0" />
                我的方案（{schemes.length}）
              </span>
              <button
                className="cursor-pointer rounded-full border border-[#293856] bg-[#131c31] px-2.5 py-1 text-xs text-slate-100 active:bg-[#1c2842]"
                type="button"
                onClick={handleSaveScheme}
              >
                + 保存当前方案
              </button>
            </div>
            {schemes.length > 0 && (
              <div className="flex flex-wrap gap-[7px]">
                {schemes.map((sc) => (
                  <span
                    key={sc.id}
                    className="inline-flex items-center gap-1 rounded-full border border-[#293856] bg-[#131c31] py-[3px] pr-1.5 pl-2.5 text-xs text-slate-100"
                  >
                    <button
                      type="button"
                      className="cursor-pointer border-none bg-transparent px-0.5 py-0.5 text-xs leading-none text-inherit"
                      onClick={() => applyScheme(tpl, sc)}
                    >
                      {sc.name}
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer border-none bg-transparent px-0.5 py-0.5 text-xs leading-none font-bold text-slate-400 hover:text-red-400"
                      title="删除方案"
                      onClick={() => deleteScheme(tpl.id, sc.id)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {tpl.isDraw ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2">
                {BRUSH_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-[11px] py-1.5 text-xs font-semibold text-slate-100 ${
                      vals.brushColor === c.hex
                        ? "border-sky-400 bg-[#1c2842]"
                        : "border-[#293856] bg-[#0b1120]"
                    }`}
                    onClick={() => patchValues(tpl, { brushColor: c.hex })}
                  >
                    <span
                      className="size-3 rounded-full border border-white/35"
                      style={{ background: c.hex }}
                    />
                    {c.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#293856] bg-[#0b1120] px-[11px] py-1.5 text-xs text-slate-100 active:bg-[#1c2842]"
                onClick={() => {
                  const list = Array.isArray(vals.strokes) ? (vals.strokes as DrawStroke[]) : [];
                  if (list.length) patchValues(tpl, { strokes: list.slice(0, -1) });
                }}
              >
                <Undo2 size={13} strokeWidth={2} className="block shrink-0" />
                撤销
              </button>
            </div>

            <div className="flex flex-col gap-[5px]">
              <label className="flex justify-between text-xs text-slate-400">
                画笔粗细 <span>{String(vals.brushSize || 3)} px</span>
              </label>
              <input
                type="range"
                className="w-full accent-red-500"
                min={1}
                max={10}
                step={1}
                value={String(vals.brushSize || 3)}
                onChange={(e) => patchValues(tpl, { brushSize: e.target.value })}
              />
            </div>

            <div className="text-left text-[11.5px] leading-relaxed text-slate-400">
              提示：直接在上方墨水屏预览框里用手指或鼠标涂鸦，支持黑/红/白三色与撤销。
            </div>
          </div>
        ) : (
          <>
            {tpl.isPhoto && (
              <label className="block cursor-pointer rounded-xl border-[1.5px] border-dashed border-[#293856] bg-[#0b1120] px-4 py-3.5 text-center text-xs text-slate-400">
                <strong className="mb-1 flex justify-center text-[13.5px] text-sky-400">
                  点击选择手机相册 / 本地图片
                </strong>
                选图后可在上方预览框直接拖动位置，或用下方滑块微调
                <input type="file" accept="image/*" hidden onChange={handlePhotoFile} />
              </label>
            )}

            {tpl.qrDecodeField && (
              <label className="block cursor-pointer rounded-xl border-[1.5px] border-dashed border-[#293856] bg-[#0b1120] px-4 py-3.5 text-center text-xs text-slate-400">
                <strong className="mb-1 inline-flex items-center justify-center gap-1.5 text-[13.5px] text-sky-400">
                  <ScanLine size={15} strokeWidth={2} className="block shrink-0" />
                  从相册截图识别二维码（自动矢量重绘）
                </strong>
                <div>支持微信/支付宝收款码、名片码等标准 QR 码（不支持小程序葵花码）</div>
                <input type="file" accept="image/*" hidden onChange={handleQrDecodeFile} />
              </label>
            )}

            {tpl.presets && tpl.presets.length > 0 && (
              <div className="flex flex-wrap gap-[7px]">
                {tpl.presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className="cursor-pointer rounded-full border border-[#293856] bg-[#0b1120] px-[11px] py-1.5 text-xs text-slate-100 active:bg-[#1c2842]"
                    onClick={() => {
                      const patch = p.dynamic ? p.dynamic() : p.values;
                      if (patch) patchValues(tpl, patch);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {tpl.fields.map((f) => {
              if (f.type === "weekdays") {
                const bits = String(vals[f.key] || "0000000").padEnd(7, "0").split("");
                return (
                  <div key={f.key} className="flex flex-col gap-[5px]">
                    <label className="text-xs text-slate-400">{f.label}</label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {WEEKDAY_NAMES.map((nm, idx) => (
                        <button
                          key={nm}
                          type="button"
                          className={`cursor-pointer rounded-[9px] border py-2 text-[13px] font-bold transition ${
                            bits[idx] === "1"
                              ? "border-red-500/60 bg-red-500/20 text-red-300"
                              : "border-[#293856] bg-[#0b1120] text-slate-400"
                          }`}
                          onClick={() => {
                            const next = [...bits];
                            next[idx] = next[idx] === "1" ? "0" : "1";
                            patchValues(tpl, { [f.key]: next.join("") });
                          }}
                        >
                          {nm}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              if (f.type === "checkbox") {
                return (
                  <label
                    key={f.key}
                    className="flex cursor-pointer items-center justify-between px-0.5 py-1.5 text-[13px]"
                  >
                    <span>{f.label}</span>
                    <input
                      type="checkbox"
                      className="size-[18px] accent-red-500"
                      checked={Boolean(vals[f.key])}
                      onChange={(e) => patchValues(tpl, { [f.key]: e.target.checked })}
                    />
                  </label>
                );
              }

              const str = typeof vals[f.key] === "string" ? (vals[f.key] as string) : "";

              return (
                <div key={f.key} className="flex flex-col gap-[5px]">
                  <label className="flex justify-between text-xs text-slate-400">
                    {f.label}
                    {f.type === "range" && <span>{f.fmt ? f.fmt(str) : str}</span>}
                  </label>

                  {f.type === "select" ? (
                    <select
                      className={INPUT_CLASS}
                      value={str}
                      onChange={(e) => patchValues(tpl, { [f.key]: e.target.value })}
                    >
                      {f.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      className={`${INPUT_CLASS} min-h-[82px] resize-y leading-[1.45]`}
                      value={str}
                      placeholder={f.placeholder}
                      onChange={(e) => patchValues(tpl, { [f.key]: e.target.value })}
                    />
                  ) : f.type === "range" ? (
                    <input
                      type="range"
                      className="w-full accent-red-500"
                      value={str}
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      onChange={(e) => patchValues(tpl, { [f.key]: e.target.value })}
                    />
                  ) : (
                    <input
                      type={f.type}
                      className={INPUT_CLASS}
                      value={str}
                      placeholder={f.placeholder}
                      onChange={(e) => patchValues(tpl, { [f.key]: e.target.value })}
                    />
                  )}
                </div>
              );
            })}
          </>
        )}
      </section>
    </main>
  );
}
