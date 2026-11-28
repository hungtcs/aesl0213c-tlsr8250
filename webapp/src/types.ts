export type Orientation = "portrait" | "landscape";

export type CategoryId = "life" | "desk" | "create";

export type IconName =
  | "car"
  | "wifi"
  | "door"
  | "box"
  | "idCard"
  | "tag"
  | "calendar"
  | "hourglass"
  | "clipboard"
  | "checkSquare"
  | "feather"
  | "qrCode"
  | "image"
  | "penTool"
  | "sliders"
  | "radio"
  | "zap"
  | "cpu";

export interface DrawStroke {
  color: string;
  size: number;
  pts: [number, number][];
}

export type FieldValue = string | boolean | DrawStroke[];

export type TemplateValues = Record<string, FieldValue>;

export interface FieldOption {
  value: string;
  label: string;
}

export interface TemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "select" | "checkbox" | "range" | "weekdays";
  placeholder?: string;
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
  fmt?: (val: FieldValue) => string;
}

export interface TemplatePreset {
  label: string;
  values?: Partial<TemplateValues>;
  dynamic?: () => Partial<TemplateValues>;
}

export interface RenderExtras {
  photo?: HTMLImageElement | null;
  invert?: boolean;
}

export interface TemplateDef {
  id: string;
  category: CategoryId;
  icon: IconName;
  title: string;
  desc: string;
  badge?: string;
  defaultOrientation: Orientation;
  isPhoto?: boolean;
  isDraw?: boolean;
  qrDecodeField?: string;
  defaults: TemplateValues;
  presets?: TemplatePreset[];
  fields: TemplateField[];
  render: (
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    v: TemplateValues,
    extras?: RenderExtras,
  ) => void;
}

export interface CategoryDef {
  id: CategoryId;
  title: string;
  desc: string;
}

export interface ToolLinkDef {
  to: string;
  icon: IconName;
  title: string;
  desc: string;
  tag: string;
}

export interface SavedScheme {
  id: string;
  name: string;
  values: TemplateValues;
  orientation: Orientation;
  invert: boolean;
}

export interface PersistedState {
  values: Record<string, TemplateValues>;
  orientations: Record<string, Orientation>;
  inverts: Record<string, boolean>;
  savedSchemes: Record<string, SavedScheme[]>;
  flip180: boolean;
}

export type ToastKind = "" | "ok" | "err";
