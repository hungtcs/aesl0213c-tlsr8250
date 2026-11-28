import { drawWrappedText, finalizeBase, fitFontSize, pixelFont } from "../lib/canvas";
import type { TemplateDef } from "../types";
import { accentColor, nextSaturdayStr, strVal, todayStr } from "./shared";

function drawPixelCheck(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Crisp 9x7 1-bit pixel checkmark (2px thick stroke) centered at (cx, cy)
  const ox = Math.round(cx - 4);
  const oy = Math.round(cy - 3);
  const pts: readonly [number, number][] = [
    [0, 3], [0, 4],
    [1, 4], [1, 5],
    [2, 5], [2, 6],
    [3, 4], [3, 5],
    [4, 3], [4, 4],
    [5, 2], [5, 3],
    [6, 1], [6, 2],
    [7, 0], [7, 1],
    [8, 0],
  ];
  for (const [dx, dy] of pts) {
    ctx.fillRect(ox + dx, oy + dy, 1, 1);
  }
}

export const DESK_TEMPLATES: TemplateDef[] = [
  {
    id: "cal",
    category: "desk",
    icon: "calendar",
    title: "三色撕历",
    desc: "桌面日历与每日格言",
    defaultOrientation: "portrait",
    defaults: {
      date: todayStr(),
      theme: "redTop",
      sub: "",
      quote: "Stay hungry, stay foolish.",
    },
    presets: [{ label: "设为今天", dynamic: () => ({ date: todayStr() }) }],
    fields: [
      { key: "date", label: "选择日期", type: "date" },
      {
        key: "theme",
        label: "版式主题",
        type: "select",
        options: [
          { value: "redTop", label: "红顶撕历（推荐）" },
          { value: "blackTop", label: "黑顶极简" },
          { value: "frame", label: "白底双框" },
        ],
      },
      { key: "sub", label: "副标题 / 农历 / 节气（留空显示英文月）", type: "text", placeholder: "例如：小雪 · 宜写代码" },
      { key: "quote", label: "底部格言 / 今日提醒", type: "text", placeholder: "Stay hungry, stay foolish." },
    ],
    render(ctx, W, H, v, extras) {
      const dateStr = strVal(v.date);
      const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const wkCN = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][d.getDay()];
      const monEN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][d.getMonth()];
      const sub = strVal(v.sub).trim() || `${monEN} ${year}`;
      const quote = strVal(v.quote).trim();
      const theme = strVal(v.theme, "redTop");
      const headerColor = theme === "blackTop" ? "#000000" : "#FF0000";
      const isLand = W > H;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      if (!isLand) {
        if (theme === "frame") {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(4, 4, W - 8, H - 8);
          ctx.strokeStyle = "#FF0000";
          ctx.lineWidth = 1;
          ctx.strokeRect(8, 8, W - 16, H - 16);
          ctx.fillStyle = "#FF0000";
          ctx.font = pixelFont(12);
          ctx.textAlign = "center";
          ctx.fillText(`${year} · ${String(month).padStart(2, "0")}月`, W / 2, 30);
        } else {
          ctx.fillStyle = headerColor;
          ctx.fillRect(0, 0, W, 46);
          ctx.fillStyle = "#FFFFFF";
          ctx.font = pixelFont(12);
          ctx.textAlign = "center";
          ctx.fillText(`${year} / ${String(month).padStart(2, "0")}`, W / 2, 21);
          ctx.font = pixelFont(12);
          ctx.fillText(wkCN, W / 2, 38);
        }

        ctx.fillStyle = d.getDay() === 0 || d.getDay() === 6 ? "#FF0000" : "#000000";
        ctx.font = pixelFont(72);
        ctx.textAlign = "center";
        ctx.fillText(String(day), W / 2, theme === "frame" ? 116 : 128);

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(12);
        ctx.fillText(theme === "frame" ? `${wkCN} · ${sub}` : sub, W / 2, 156);

        ctx.fillStyle = "#FF0000";
        ctx.fillRect(20, 168, W - 40, 2);

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(12);
        drawWrappedText(ctx, quote, W / 2, 192, W - 22, 17, 3, "center");
      } else {
        const leftW = 104;
        if (theme === "frame") {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(3, 3, W - 6, H - 6);
          ctx.fillStyle = "#FF0000";
          ctx.fillRect(leftW, 12, 2, H - 24);
          ctx.font = pixelFont(12);
          ctx.textAlign = "center";
          ctx.fillText(`${year}/${month}`, leftW / 2, 26);
          ctx.fillStyle = "#000000";
          ctx.font = pixelFont(60);
          ctx.fillText(String(day), leftW / 2, 86);
          ctx.font = pixelFont(12);
          ctx.fillText(wkCN, leftW / 2, 108);
        } else {
          ctx.fillStyle = headerColor;
          ctx.fillRect(0, 0, leftW, H);
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.font = pixelFont(12);
          ctx.fillText(`${year} · ${String(month).padStart(2, "0")}月`, leftW / 2, 24);
          ctx.font = pixelFont(60);
          ctx.fillText(String(day), leftW / 2, 84);
          ctx.font = pixelFont(12);
          ctx.fillText(wkCN, leftW / 2, 108);
        }

        const rx = leftW + 12;
        const rw = W - rx - 10;
        ctx.fillStyle = "#FF0000";
        ctx.font = pixelFont(12);
        ctx.textAlign = "left";
        ctx.fillText(sub, rx, 32);

        ctx.fillStyle = "#000000";
        ctx.fillRect(rx, 42, rw, 2);

        ctx.font = pixelFont(12);
        drawWrappedText(ctx, quote, rx, 66, rw, 18, 3, "left");
      }
      finalizeBase(ctx, W, H, Boolean(extras?.invert));
    },
  },

  {
    id: "cd",
    category: "desk",
    icon: "hourglass",
    title: "倒数日",
    desc: "纪念日与目标日提醒",
    defaultOrientation: "portrait",
    defaults: {
      title: "距离周末",
      date: nextSaturdayStr(),
      color: "red",
      note: "每一天都值得期待",
    },
    fields: [
      { key: "title", label: "事件名称", type: "text", placeholder: "距离周末" },
      { key: "date", label: "目标日期", type: "date" },
      {
        key: "color",
        label: "强调色",
        type: "select",
        options: [
          { value: "red", label: "经典红" },
          { value: "black", label: "极简黑" },
        ],
      },
      { key: "note", label: "底部备注", type: "text", placeholder: "每一天都值得期待" },
    ],
    render(ctx, W, H, v, extras) {
      const title = strVal(v.title).trim() || "倒数日";
      const dateStr = strVal(v.date);
      const target = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
      const accent = v.color === "black" ? "#000000" : "#FF0000";
      const note = strVal(v.note).trim();

      const label = diffDays > 0 ? "还有" : diffDays < 0 ? "已经" : "就是";
      const numStr = diffDays === 0 ? "今天" : String(Math.abs(diffDays));
      const unitStr = diffDays === 0 ? "" : "DAYS";
      const isLand = W > H;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      if (!isLand) {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 52);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = pixelFont(12);
        drawWrappedText(ctx, title, W / 2, 30, W - 14, 16, 2, "center");

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(12);
        ctx.textAlign = "center";
        ctx.fillText(label, W / 2, 82);

        ctx.fillStyle = accent;
        ctx.font = diffDays === 0 ? pixelFont(24) : numStr.length >= 4 ? pixelFont(48) : pixelFont(60);
        ctx.fillText(numStr, W / 2, 148);

        if (unitStr) {
          ctx.fillStyle = "#000000";
          ctx.font = pixelFont(12);
          ctx.fillText(unitStr, W / 2, 172);
        }

        ctx.fillStyle = "#000000";
        ctx.fillRect(16, 186, W - 32, 2);
        ctx.font = pixelFont(12);
        ctx.fillText(dateStr, W / 2, 208);
        drawWrappedText(ctx, note, W / 2, 228, W - 16, 15, 2, "center");
      } else {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 34);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = pixelFont(12);
        ctx.textAlign = "left";
        ctx.fillText(title, 12, 22);
        ctx.textAlign = "right";
        ctx.font = pixelFont(12);
        ctx.fillText(dateStr, W - 12, 22);

        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";
        ctx.font = pixelFont(12);
        ctx.fillText(label, 14, 68);

        ctx.fillStyle = accent;
        ctx.font = diffDays === 0 ? pixelFont(24) : pixelFont(48);
        ctx.textAlign = "center";
        ctx.fillText(numStr, W / 2 + 6, 88);

        if (unitStr) {
          ctx.fillStyle = "#000000";
          ctx.textAlign = "right";
          ctx.font = pixelFont(12);
          ctx.fillText(unitStr, W - 14, 86);
        }

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(12);
        ctx.textAlign = "center";
        ctx.fillText(note, W / 2, 112);
      }
      finalizeBase(ctx, W, H, Boolean(extras?.invert));
    },
  },

  {
    id: "memo",
    category: "desk",
    icon: "clipboard",
    title: "工位桌牌",
    desc: "专注状态与待办清单",
    defaultOrientation: "landscape",
    defaults: {
      tag: "FOCUS",
      color: "red",
      title: "专注编码中",
      body: "请勿打扰 · 有事请留言",
    },
    presets: [
      { label: "专注中", values: { tag: "FOCUS", color: "red", title: "专注编码中", body: "请勿打扰 · 有事请留言" } },
      { label: "会议中", values: { tag: "MEETING", color: "red", title: "正在会议中", body: "预计 30 分钟后结束" } },
      { label: "马上回来", values: { tag: "AWAY", color: "black", title: "马上回来", body: "去接杯咖啡\n有急事请发消息" } },
      { label: "请勿打扰", values: { tag: "DND", color: "red", title: "请勿打扰", body: "深度工作时间" } },
      {
        label: "待办清单",
        values: { tag: "TODO", color: "black", title: "今日待办", body: "[x] 刷入三色固件\n[ ] 测试蓝牙刷图\n[ ] 喝够 8 杯水" },
      },
    ],
    fields: [
      { key: "tag", label: "顶部标签", type: "text", placeholder: "STATUS" },
      {
        key: "color",
        label: "主题色",
        type: "select",
        options: [
          { value: "red", label: "红底白字" },
          { value: "black", label: "黑底白字" },
        ],
      },
      { key: "title", label: "主标题", type: "text", placeholder: "专注编码中" },
      { key: "body", label: "正文 / 待办（支持 [x] / [ ] 勾选框）", type: "textarea" },
    ],
    render(ctx, W, H, v, extras) {
      const tag = strVal(v.tag).trim() || "NOTE";
      const title = strVal(v.title).trim();
      const body = strVal(v.body);
      const accent = v.color === "black" ? "#000000" : "#FF0000";

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      const barH = W > H ? 32 : 40;
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, W, barH);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = pixelFont(12);
      ctx.textAlign = "left";
      ctx.fillText(tag, 10, barH - 11);

      let y = barH + 26;
      if (title) {
        ctx.fillStyle = "#000000";
        ctx.font = W > H ? pixelFont(24) : pixelFont(20);
        ctx.textAlign = "left";
        const used = drawWrappedText(ctx, title, 10, y, W - 20, 26, 2, "left");
        y += used * 26 - 6;
        ctx.fillStyle = accent;
        ctx.fillRect(10, y, W - 20, 2);
        y += 18;
      }

      const lines = body.split("\n");
      ctx.font = pixelFont(12);
      for (const rawLine of lines) {
        if (y > H - 6) break;
        const l = rawLine.trim();
        if (l.startsWith("[x]") || l.startsWith("[X]") || l.startsWith("[ ]")) {
          const checked = l[1] !== " ";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(10, y - 11, 12, 12);
          if (checked) {
            ctx.fillStyle = accent;
            ctx.fillRect(13, y - 8, 6, 6);
          }
          ctx.fillStyle = "#000000";
          ctx.textAlign = "left";
          ctx.fillText(l.slice(3).trim(), 28, y);
          y += 20;
        } else {
          ctx.fillStyle = "#000000";
          const n = drawWrappedText(ctx, l, 10, y, W - 20, 18, 4, "left");
          y += Math.max(1, n) * 18 + 2;
        }
      }
      finalizeBase(ctx, W, H, Boolean(extras?.invert));
    },
  },

  {
    id: "habit",
    category: "desk",
    icon: "checkSquare",
    title: "习惯打卡",
    desc: "周打卡格子 · 周期记录",
    defaultOrientation: "landscape",
    defaults: {
      title: "每日运动 30 分钟",
      days: "1110100",
      streak: "已坚持 12 天",
      note: "上次更新：" + todayStr(),
      theme: "redTop",
    },
    presets: [
      { label: "运动打卡", values: { title: "每日运动 30 分钟", streak: "本周目标 5 天", note: "保持节奏，贵在坚持" } },
      { label: "绿植浇水", values: { title: "阳台多肉浇水记录", streak: "每 7 天一次", note: "上次浇水：" + todayStr() } },
      { label: "更换滤芯", values: { title: "饮水机滤芯更换", streak: "周期 90 天", note: "上次更换：" + todayStr() } },
    ],
    fields: [
      { key: "title", label: "习惯 / 事项名称", type: "text", placeholder: "每日运动 30 分钟" },
      { key: "days", label: "本周打卡（点击切换一~日）", type: "weekdays" },
      { key: "streak", label: "进度 / 周期说明", type: "text", placeholder: "已坚持 12 天" },
      { key: "note", label: "底部备注 / 上次日期", type: "text", placeholder: "上次更新：..." },
      {
        key: "theme",
        label: "强调色",
        type: "select",
        options: [
          { value: "redTop", label: "活力红" },
          { value: "blackTop", label: "极简黑" },
        ],
      },
    ],
    render(ctx, W, H, v, extras) {
      const title = strVal(v.title).trim() || "每日打卡";
      const bits = strVal(v.days, "0000000").padEnd(7, "0");
      const doneCount = bits.split("").filter((c) => c === "1").length;
      const streak = strVal(v.streak).trim() || `本周 ${doneCount}/7`;
      const note = strVal(v.note).trim();
      const accent = accentColor(v.theme);
      const labels = ["一", "二", "三", "四", "五", "六", "日"];
      const isLand = W > H;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      if (isLand) {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 30);
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "left";
        fitFontSize(ctx, title, W - 76, 20, 10);
        ctx.fillText(title, 10, 21);
        ctx.font = pixelFont(12);
        ctx.textAlign = "right";
        ctx.fillText(`${doneCount}/7`, W - 10, 20);

        const boxW = 28;
        const gap = 5;
        const startX = Math.round((W - (7 * boxW + 6 * gap)) / 2);
        const y = 44;
        for (let i = 0; i < 7; i++) {
          const x = startX + i * (boxW + gap);
          const checked = bits[i] === "1";
          ctx.fillStyle = checked ? accent : "#FFFFFF";
          ctx.fillRect(x, y, boxW, 38);
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, boxW, 38);

          ctx.fillStyle = checked ? "#FFFFFF" : "#000000";
          ctx.font = pixelFont(12);
          ctx.textAlign = "center";
          ctx.fillText(labels[i], x + boxW / 2, y + 16);
          if (checked) {
            drawPixelCheck(ctx, x + boxW / 2, y + 28);
          } else {
            ctx.fillRect(Math.round(x + boxW / 2 - 1), y + 27, 2, 2);
          }
        }

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(12);
        ctx.textAlign = "left";
        ctx.fillText(streak, 10, 106);
        if (note) {
          ctx.textAlign = "right";
          fitFontSize(ctx, note, W - 110, 12, 10);
          ctx.fillText(note, W - 10, 106);
        }
      } else {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 46);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = pixelFont(12);
        drawWrappedText(ctx, title, W / 2, 22, W - 14, 17, 2, "center");

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(24);
        ctx.textAlign = "center";
        ctx.fillText(`${doneCount} / 7`, W / 2, 78);

        for (let i = 0; i < 7; i++) {
          const col = i < 4 ? i : i - 4;
          const row = i < 4 ? 0 : 1;
          const countInRow = row === 0 ? 4 : 3;
          const bw = 24;
          const g = 5;
          const rx = Math.round((W - (countInRow * bw + (countInRow - 1) * g)) / 2) + col * (bw + g);
          const ry = 94 + row * 42;
          const checked = bits[i] === "1";
          ctx.fillStyle = checked ? accent : "#FFFFFF";
          ctx.fillRect(rx, ry, bw, 34);
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(rx, ry, bw, 34);
          ctx.fillStyle = checked ? "#FFFFFF" : "#000000";
          ctx.font = pixelFont(12);
          ctx.fillText(labels[i], rx + bw / 2, ry + 14);
          if (checked) {
            drawPixelCheck(ctx, rx + bw / 2, ry + 25);
          } else {
            ctx.fillRect(Math.round(rx + bw / 2 - 1), ry + 24, 2, 2);
          }
        }

        ctx.fillStyle = accent;
        ctx.fillRect(14, 186, W - 28, 2);
        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(12);
        ctx.fillText(streak, W / 2, 208);
        drawWrappedText(ctx, note, W / 2, 228, W - 14, 15, 2, "center");
      }
      finalizeBase(ctx, W, H, Boolean(extras?.invert));
    },
  },
];
