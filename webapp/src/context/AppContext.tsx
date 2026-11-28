import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createBleController } from "../lib/ble";
import type { BatteryInfo } from "../lib/ble";
import type {
  Orientation,
  PersistedState,
  SavedScheme,
  TemplateDef,
  TemplateValues,
  ToastKind,
} from "../types";
import { AppContext } from "./useApp";
import type { AppContextValue, ValuesPatch } from "./useApp";

const STORAGE_KEY = "inkcard_state_v1";

function cloneJson<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        values: parsed.values ?? {},
        orientations: parsed.orientations ?? {},
        inverts: parsed.inverts ?? {},
        savedSchemes: parsed.savedSchemes ?? {},
        flip180: Boolean(parsed.flip180),
      };
    }
  } catch {
    // ignore storage errors
  }
  return { values: {}, orientations: {}, inverts: {}, savedSchemes: {}, flip180: false };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [bleConnected, setBleConnected] = useState(false);
  const [bleConnecting, setBleConnecting] = useState(false);
  const [bleName, setBleName] = useState("");
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressText, setProgressText] = useState("推送到墨水屏");
  const [toastMsg, setToastMsg] = useState("所见即所得 · 三色屏刷新约 15 秒");
  const [toastKind, setToastKind] = useState<ToastKind>("");
  const [bleLog, setBleLog] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // ignore quota errors
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [state]);

  const [ble] = useState(() =>
    createBleController({
      onLog(msg) {
        const ts = new Date().toTimeString().slice(0, 8);
        setBleLog((prev) => `[${ts}] ${msg}\n${prev.slice(0, 4000)}`);
      },
      onToast(msg, cls = "") {
        setToastMsg(msg);
        setToastKind(cls);
      },
      onProgress(pct, text) {
        setProgressPct(pct);
        setProgressText(text);
      },
      onConnChange(connected, name) {
        setBleConnected(connected);
        setBleName(name);
      },
      onConnectingChange(busy) {
        setBleConnecting(busy);
      },
      onUploadingChange(busy) {
        setUploading(busy);
      },
      onBatteryChange(info) {
        setBattery(info);
      },
    }),
  );

  const value = useMemo<AppContextValue>(() => {
    const showToast = (msg: string, kind: ToastKind = "") => {
      setToastMsg(msg);
      setToastKind(kind);
    };

    const getValues = (tpl: TemplateDef): TemplateValues => {
      const saved = state.values[tpl.id];
      if (!saved) return cloneJson(tpl.defaults);
      return { ...cloneJson(tpl.defaults), ...saved };
    };

    const patchValues = (tpl: TemplateDef, patchOrFn: ValuesPatch) => {
      setState((prev) => {
        const cur = { ...cloneJson(tpl.defaults), ...(prev.values[tpl.id] ?? {}) };
        const patch = typeof patchOrFn === "function" ? patchOrFn(cur) : patchOrFn;
        const next: TemplateValues = { ...cur };
        for (const [k, v] of Object.entries(patch)) {
          if (v !== undefined) next[k] = v;
        }
        return { ...prev, values: { ...prev.values, [tpl.id]: next } };
      });
    };

    const resetValues = (tpl: TemplateDef) => {
      setState((prev) => {
        if (tpl.isPhoto) {
          const cur = { ...cloneJson(tpl.defaults), ...(prev.values[tpl.id] ?? {}) };
          return {
            ...prev,
            values: { ...prev.values, [tpl.id]: { ...cur, zoom: "1.0", posX: "0", posY: "0" } },
          };
        }
        if (tpl.isDraw) {
          const cur = { ...cloneJson(tpl.defaults), ...(prev.values[tpl.id] ?? {}) };
          return {
            ...prev,
            values: { ...prev.values, [tpl.id]: { ...cur, strokes: [] } },
          };
        }
        return {
          ...prev,
          values: { ...prev.values, [tpl.id]: cloneJson(tpl.defaults) },
        };
      });
    };

    const getOrientation = (tpl: TemplateDef): Orientation =>
      state.orientations[tpl.id] ?? tpl.defaultOrientation;

    const setOrientation = (tplId: string, ori: Orientation) => {
      setState((prev) => ({
        ...prev,
        orientations: { ...prev.orientations, [tplId]: ori },
      }));
    };

    const getInvert = (tplId: string): boolean => Boolean(state.inverts[tplId]);

    const toggleInvert = (tplId: string) => {
      setState((prev) => ({
        ...prev,
        inverts: { ...prev.inverts, [tplId]: !prev.inverts[tplId] },
      }));
    };

    const getSchemes = (tplId: string): SavedScheme[] => state.savedSchemes[tplId] ?? [];

    const saveScheme = (tpl: TemplateDef, name: string) => {
      const vals = getValues(tpl);
      const scheme: SavedScheme = {
        id: String(Date.now()),
        name,
        values: cloneJson(vals),
        orientation: getOrientation(tpl),
        invert: getInvert(tpl.id),
      };
      setState((prev) => {
        const list = [scheme, ...(prev.savedSchemes[tpl.id] ?? [])].slice(0, 12);
        return {
          ...prev,
          savedSchemes: { ...prev.savedSchemes, [tpl.id]: list },
        };
      });
      showToast(`已保存方案「${name}」`, "ok");
    };

    const applyScheme = (tpl: TemplateDef, scheme: SavedScheme) => {
      setState((prev) => ({
        ...prev,
        values: { ...prev.values, [tpl.id]: cloneJson(scheme.values) },
        orientations: { ...prev.orientations, [tpl.id]: scheme.orientation },
        inverts: { ...prev.inverts, [tpl.id]: Boolean(scheme.invert) },
      }));
      showToast(`已切换到方案「${scheme.name}」`, "ok");
    };

    const deleteScheme = (tplId: string, schemeId: string) => {
      setState((prev) => ({
        ...prev,
        savedSchemes: {
          ...prev.savedSchemes,
          [tplId]: (prev.savedSchemes[tplId] ?? []).filter((s) => s.id !== schemeId),
        },
      }));
    };

    const setFlip180 = (val: boolean) => {
      setState((prev) => ({ ...prev, flip180: val }));
    };

    return {
      state,
      getValues,
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
      setFlip180,
      ble,
      bleConnected,
      bleConnecting,
      bleName,
      battery,
      uploading,
      progressPct,
      progressText,
      toastMsg,
      toastKind,
      showToast,
      bleLog,
    };
  }, [
    state,
    ble,
    bleConnected,
    bleConnecting,
    bleName,
    battery,
    uploading,
    progressPct,
    progressText,
    toastMsg,
    toastKind,
    bleLog,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
