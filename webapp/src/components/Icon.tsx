import {
  Box,
  Calendar,
  Car,
  CheckSquare,
  ClipboardList,
  Cpu,
  DoorOpen,
  Feather,
  Hourglass,
  IdCard,
  Image,
  PenTool,
  QrCode,
  Radio,
  SlidersHorizontal,
  Tag,
  Wifi,
  Zap,
} from "lucide-react";
import type { IconName } from "../types";

const ICON_MAP = {
  car: Car,
  wifi: Wifi,
  door: DoorOpen,
  box: Box,
  idCard: IdCard,
  tag: Tag,
  calendar: Calendar,
  hourglass: Hourglass,
  clipboard: ClipboardList,
  checkSquare: CheckSquare,
  feather: Feather,
  qrCode: QrCode,
  image: Image,
  penTool: PenTool,
  sliders: SlidersHorizontal,
  radio: Radio,
  zap: Zap,
  cpu: Cpu,
} as const;

export function AppIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  const Comp = ICON_MAP[name];
  return <Comp size={size} strokeWidth={2} className="block shrink-0" aria-hidden="true" />;
}
