import type { CategoryDef, TemplateDef, ToolLinkDef } from "../types";
import { CREATE_TEMPLATES } from "./create";
import { DESK_TEMPLATES } from "./desk";
import { LIFE_TEMPLATES } from "./life";
import { AUTHOR_LINKS } from "./shared";

export { AUTHOR_LINKS };

export const CATEGORIES: CategoryDef[] = [
  { id: "life", title: "生活实用", desc: "挪车、Wi-Fi、门口、收纳与防丢" },
  { id: "desk", title: "桌面效率", desc: "日历、倒数日、桌牌与打卡" },
  { id: "create", title: "创意与工具", desc: "诗词、二维码、图片与涂鸦" },
];

export const TOOL_LINKS: ToolLinkDef[] = [
  {
    to: "/tools/uart",
    icon: "radio",
    title: "BLE-UART 双通道上位机",
    desc: "蓝牙透传 + 硬件串口 AT 可视化配置",
    tag: "BLE + Serial",
  },
  {
    to: "/tools/ota",
    icon: "zap",
    title: "Telink BLE OTA 升级",
    desc: "通过蓝牙无线推送 .bin 固件镜像",
    tag: "BLE OTA",
  },
  {
    to: "/tools/sws",
    icon: "cpu",
    title: "SWS 串口单线烧录器",
    desc: "浏览器 USB-TTL 烧录 / 擦除 Flash",
    tag: "Web Serial",
  },
];

export const TEMPLATES: TemplateDef[] = [...LIFE_TEMPLATES, ...DESK_TEMPLATES, ...CREATE_TEMPLATES];

export function getTemplateById(id: string | undefined): TemplateDef | undefined {
  if (!id) return undefined;
  return TEMPLATES.find((t) => t.id === id);
}
