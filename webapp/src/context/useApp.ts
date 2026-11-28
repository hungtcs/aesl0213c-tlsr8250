import { createContext, useContext } from "react";
import type { BatteryInfo, BleController } from "../lib/ble";
import type {
  Orientation,
  PersistedState,
  SavedScheme,
  TemplateDef,
  TemplateValues,
  ToastKind,
} from "../types";

export type ValuesPatch =
  | Partial<TemplateValues>
  | ((current: TemplateValues) => Partial<TemplateValues>);

export interface AppContextValue {
  state: PersistedState;
  getValues: (tpl: TemplateDef) => TemplateValues;
  patchValues: (tpl: TemplateDef, patch: ValuesPatch) => void;
  resetValues: (tpl: TemplateDef) => void;
  getOrientation: (tpl: TemplateDef) => Orientation;
  setOrientation: (tplId: string, ori: Orientation) => void;
  getInvert: (tplId: string) => boolean;
  toggleInvert: (tplId: string) => void;
  getSchemes: (tplId: string) => SavedScheme[];
  saveScheme: (tpl: TemplateDef, name: string) => void;
  applyScheme: (tpl: TemplateDef, scheme: SavedScheme) => void;
  deleteScheme: (tplId: string, schemeId: string) => void;
  setFlip180: (val: boolean) => void;
  ble: BleController;
  bleConnected: boolean;
  bleConnecting: boolean;
  bleName: string;
  battery: BatteryInfo | null;
  uploading: boolean;
  progressPct: number;
  progressText: string;
  toastMsg: string;
  toastKind: ToastKind;
  showToast: (msg: string, kind?: ToastKind) => void;
  bleLog: string;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
