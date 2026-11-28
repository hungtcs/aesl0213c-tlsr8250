import {
  drawCrispQR,
  drawVerticalText,
  drawWrappedText,
  finalizeBase,
  fitFontSize,
  pixelFont,
} from "../lib/canvas";
import type { DrawStroke, TemplateDef } from "../types";
import { AUTHOR_LINKS, accentColor, strVal } from "./shared";

export const CREATE_TEMPLATES: TemplateDef[] = [
  {
    id: "poem",
    category: "create",
    icon: "feather",
    title: "竖排诗词",
    desc: "古风竖排与红色印章",
    badge: "高颜值",
    defaultOrientation: "portrait",
    defaults: {
      body: "行到水穷处\n坐看云起时",
      author: "王维 · 终南别业",
      seal: "清欢",
      border: "double",
    },
    presets: [
      { label: "终南别业", values: { body: "行到水穷处\n坐看云起时", author: "王维 · 终南别业", seal: "清欢" } },
      { label: "定风波", values: { body: "竹杖芒鞋轻胜马\n一蓑烟雨任平生", author: "苏轼 · 定风波", seal: "自在" } },
      { label: "静夜思", values: { body: "举头望明月\n低头思故乡", author: "李白 · 静夜思", seal: "明月" } },
      { label: "极客铭", values: { body: "保持饥饿\n保持愚蠢", author: "STAY FOOLISH", seal: "极客" } },
    ],
    fields: [
      { key: "body", label: "诗词 / 格言正文（换行分列）", type: "textarea" },
      { key: "author", label: "落款 / 作者", type: "text", placeholder: "王维 · 终南别业" },
      { key: "seal", label: "红色印章字（1~2 字）", type: "text", placeholder: "清欢" },
      {
        key: "border",
        label: "边框样式",
        type: "select",
        options: [
          { value: "double", label: "古籍双线框" },
          { value: "single", label: "极简细框" },
          { value: "none", label: "无边框留白" },
        ],
      },
    ],
    render(ctx, W, H, v, extras) {
      const body = strVal(v.body).trim() || "行到水穷处\n坐看云起时";
      const author = strVal(v.author).trim();
      const seal = Array.from(strVal(v.seal).trim()).slice(0, 2);
      const border = strVal(v.border, "double");
      const isLand = W > H;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      if (border === "double") {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.strokeRect(5, 5, W - 10, H - 10);
        ctx.lineWidth = 1;
        ctx.strokeRect(9, 9, W - 18, H - 18);
      } else if (border === "single") {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(7, 7, W - 14, H - 14);
      }

      if (!isLand) {
        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(24);
        drawVerticalText(ctx, body, W - 26, 40, 26, 25, 8, 3);

        if (author) {
          ctx.fillStyle = "#000000";
          ctx.font = pixelFont(12);
          drawVerticalText(ctx, author, 22, 66, 14, 14, 10, 1);
        }

        if (seal.length) {
          const sx = 14;
          const sy = H - 46;
          ctx.fillStyle = "#FF0000";
          ctx.fillRect(sx, sy, 18, seal.length === 2 ? 32 : 18);
          ctx.fillStyle = "#FFFFFF";
          ctx.font = pixelFont(12);
          ctx.textAlign = "center";
          ctx.fillText(seal[0], sx + 9, sy + 13);
          if (seal[1]) ctx.fillText(seal[1], sx + 9, sy + 27);
        }
      } else {
        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(24);
        const lines = body.split("\n").filter(Boolean).slice(0, 3);
        const startY = lines.length === 1 ? 58 : lines.length === 2 ? 46 : 36;
        ctx.textAlign = "center";
        lines.forEach((l, i) => ctx.fillText(l.trim(), Math.round(W / 2), startY + i * 26));

        if (author) {
          ctx.font = pixelFont(12);
          ctx.textAlign = "right";
          ctx.fillText(`—— ${author}`, W - 44, H - 16);
        }
        if (seal.length) {
          const sx = W - 36;
          const sy = H - 36;
          ctx.fillStyle = "#FF0000";
          ctx.fillRect(sx, sy, 26, 20);
          ctx.fillStyle = "#FFFFFF";
          ctx.font = pixelFont(12);
          ctx.textAlign = "center";
          ctx.fillText(seal.join(""), sx + 13, sy + 14);
        }
      }
      finalizeBase(ctx, W, H, Boolean(extras?.invert));
    },
  },

  {
    id: "qrcode",
    category: "create",
    icon: "qrCode",
    title: "万能二维码",
    desc: "链接生成 · 截图识别重绘",
    defaultOrientation: "portrait",
    qrDecodeField: "content",
    defaults: {
      title: "扫码支持 / 联系",
      content: AUTHOR_LINKS.bilibili,
      footer: "微信 / 浏览器扫一扫",
      theme: "redTop",
    },
    presets: [
      { label: "B站主页", values: { title: "Bilibili 主页", content: AUTHOR_LINKS.bilibili, footer: "欢迎三连关注", theme: "redTop" } },
      { label: "GitHub", values: { title: "开源项目", content: AUTHOR_LINKS.github, footer: "扫码 Star 支持", theme: "blackTop" } },
      { label: "收款牌", values: { title: "扫码支付", footer: "感谢惠顾 · 扫码付款", theme: "redTop" } },
    ],
    fields: [
      { key: "title", label: "顶部标题", type: "text", placeholder: "扫码支持 / 收款" },
      { key: "content", label: "二维码内容（可手动输入或从截图识别）", type: "text", placeholder: "https://..." },
      { key: "footer", label: "底部引导语", type: "text", placeholder: "微信 / 浏览器扫一扫" },
      {
        key: "theme",
        label: "配色主题",
        type: "select",
        options: [
          { value: "redTop", label: "醒目红顶" },
          { value: "blackTop", label: "商务黑顶" },
        ],
      },
    ],
    render(ctx, W, H, v, extras) {
      const title = strVal(v.title).trim() || "QR CODE";
      const content = strVal(v.content).trim() || AUTHOR_LINKS.bilibili;
      const footer = strVal(v.footer).trim();
      const accent = accentColor(v.theme);
      const isLand = W > H;
      const inv = Boolean(extras?.invert);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      if (!isLand) {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 42);
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        fitFontSize(ctx, title, W - 14, 20, 10);
        ctx.fillText(title, W / 2, 27);

        if (footer) {
          ctx.fillStyle = "#000000";
          fitFontSize(ctx, footer, W - 14, 12, 10);
          ctx.fillText(footer, W / 2, H - 16);
        }

        finalizeBase(ctx, W, H, inv);
        drawCrispQR(ctx, content, W / 2, 134, 108, 1);
      } else {
        const qrBox = 104;
        const rx = qrBox + 10;
        const rw = W - rx - 8;

        ctx.fillStyle = accent;
        ctx.fillRect(rx, 10, rw, 30);
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "left";
        fitFontSize(ctx, title, rw - 10, 20, 10);
        ctx.fillText(title, rx + 6, 30);

        if (footer) {
          ctx.fillStyle = "#000000";
          ctx.font = pixelFont(12);
          drawWrappedText(ctx, footer, rx + 2, 66, rw - 4, 18, 3, "left");
        }

        finalizeBase(ctx, W, H, inv);
        drawCrispQR(ctx, content, qrBox / 2 + 4, H / 2, 100, 1);
      }
    },
  },

  {
    id: "photo",
    category: "create",
    icon: "image",
    title: "图片刷图",
    desc: "相册选图与三色抖动",
    defaultOrientation: "portrait",
    isPhoto: true,
    defaults: {
      fit: "cover",
      dither: "fs",
      zoom: "1.0",
      posX: "0",
      posY: "0",
      bright: "0",
      contrast: "10",
      redSens: "1.0",
    },
    fields: [
      {
        key: "fit",
        label: "缩放方式",
        type: "select",
        options: [
          { value: "cover", label: "铺满裁切 (Cover)" },
          { value: "contain", label: "完整留白 (Contain)" },
        ],
      },
      {
        key: "dither",
        label: "抖动算法",
        type: "select",
        options: [
          { value: "fs", label: "Floyd-Steinberg" },
          { value: "none", label: "阈值锐化（无抖动）" },
        ],
      },
      { key: "zoom", label: "缩放倍率", type: "range", min: 1.0, max: 3.0, step: 0.05, fmt: (x) => `${Number(x).toFixed(2).replace(/0$/, "")}x` },
      { key: "posX", label: "水平位置 X", type: "range", min: -100, max: 100, step: 1, fmt: (x) => `${String(x)}%` },
      { key: "posY", label: "垂直位置 Y", type: "range", min: -100, max: 100, step: 1, fmt: (x) => `${String(x)}%` },
      { key: "bright", label: "亮度", type: "range", min: -80, max: 80, step: 1 },
      { key: "contrast", label: "对比度", type: "range", min: -60, max: 80, step: 1 },
      { key: "redSens", label: "红色灵敏度", type: "range", min: 0.5, max: 1.8, step: 0.1 },
    ],
    render(ctx, W, H, v, extras) {
      const img = extras?.photo;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);
      if (!img) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 8, W - 16, H - 16);
        ctx.fillStyle = "#FF0000";
        ctx.font = pixelFont(12);
        ctx.textAlign = "center";
        ctx.fillText("请选择图片", Math.round(W / 2), Math.round(H / 2 - 4));
        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(12);
        ctx.fillText(`${W} × ${H} px`, Math.round(W / 2), Math.round(H / 2 + 16));
        finalizeBase(ctx, W, H, Boolean(extras?.invert));
        return;
      }

      const fit = strVal(v.fit, "cover");
      const zoom = parseFloat(strVal(v.zoom, "1.0")) || 1.0;
      const posX = parseFloat(strVal(v.posX, "0")) || 0;
      const posY = parseFloat(strVal(v.posY, "0")) || 0;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      if (fit === "cover") {
        const scale = Math.max(W / iw, H / ih) * zoom;
        const sw = W / scale;
        const sh = H / scale;
        const maxShiftX = Math.max(0, (iw - sw) / 2);
        const maxShiftY = Math.max(0, (ih - sh) / 2);
        const sx = (iw - sw) / 2 - (posX / 100) * maxShiftX;
        const sy = (ih - sh) / 2 - (posY / 100) * maxShiftY;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      } else {
        const scale = Math.min(W / iw, H / ih) * zoom;
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (W - dw) / 2 + (posX / 100) * (W / 2);
        const dy = (H - dh) / 2 + (posY / 100) * (H / 2);
        ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
      }

      const bright = parseInt(strVal(v.bright, "0"), 10) || 0;
      const contrast = parseInt(strVal(v.contrast, "10"), 10) || 0;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const imgData = ctx.getImageData(0, 0, W, H);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.max(0, Math.min(255, factor * (d[i] - 128) + 128 + bright));
        d[i + 1] = Math.max(0, Math.min(255, factor * (d[i + 1] - 128) + 128 + bright));
        d[i + 2] = Math.max(0, Math.min(255, factor * (d[i + 2] - 128) + 128 + bright));
      }
      ctx.putImageData(imgData, 0, 0);

      finalizeBase(ctx, W, H, Boolean(extras?.invert), v.dither !== "none", parseFloat(strVal(v.redSens, "1.0")) || 1.0);
    },
  },

  {
    id: "draw",
    category: "create",
    icon: "penTool",
    title: "三色涂鸦",
    desc: "手指自由手绘与签名",
    badge: "好玩",
    defaultOrientation: "landscape",
    isDraw: true,
    defaults: {
      brushColor: "#000000",
      brushSize: "3",
      strokes: [],
    },
    fields: [],
    render(ctx, W, H, v, extras) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      const strokes = Array.isArray(v.strokes) ? (v.strokes as DrawStroke[]) : [];
      if (!strokes.length) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(8, 8, W - 16, H - 16);
        ctx.setLineDash([]);
        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(12);
        ctx.textAlign = "center";
        ctx.fillText("直接在画布上涂鸦或签名", Math.round(W / 2), Math.round(H / 2 + 4));
      } else {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const st of strokes) {
          if (!st.pts || !st.pts.length) continue;
          ctx.strokeStyle = st.color || "#000000";
          ctx.fillStyle = st.color || "#000000";
          ctx.lineWidth = Number(st.size) || 3;
          if (st.pts.length === 1) {
            ctx.beginPath();
            ctx.arc(st.pts[0][0] * W, st.pts[0][1] * H, (Number(st.size) || 3) / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(st.pts[0][0] * W, st.pts[0][1] * H);
            for (let i = 1; i < st.pts.length; i++) {
              ctx.lineTo(st.pts[i][0] * W, st.pts[i][1] * H);
            }
            ctx.stroke();
          }
        }
      }
      finalizeBase(ctx, W, H, Boolean(extras?.invert));
    },
  },
];
