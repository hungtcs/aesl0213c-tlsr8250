import {
  buildWifiPayload,
  drawCrispQR,
  drawWrappedText,
  finalizeBase,
  fitFontSize,
  formatPhoneDisplay,
  pixelFont,
  sanitizePhoneDigits,
} from "../lib/canvas";
import type { TemplateDef } from "../types";
import { AUTHOR_LINKS, accentColor, strVal, todayStr } from "./shared";

export const LIFE_TEMPLATES: TemplateDef[] = [
  {
    id: "parking",
    category: "life",
    icon: "car",
    title: "挪车电话",
    desc: "大字号手机 · 扫码拨号",
    badge: "热门",
    defaultOrientation: "landscape",
    defaults: {
      header: "临时停靠 · 请多关照",
      phone: "13800138000",
      note: "来电即挪 · 感谢理解",
      theme: "redTop",
      showQr: true,
    },
    fields: [
      { key: "header", label: "顶部提示语", type: "text", placeholder: "临时停靠 · 请多关照" },
      { key: "phone", label: "手机号码", type: "text", placeholder: "输入 11 位手机号，自动分段" },
      { key: "note", label: "底部备注", type: "text", placeholder: "来电即挪 · 感谢理解" },
      {
        key: "theme",
        label: "配色样式",
        type: "select",
        options: [
          { value: "redTop", label: "经典红顶（醒目）" },
          { value: "redFrame", label: "白底红框（高对比）" },
          { value: "blackTop", label: "极简黑顶" },
        ],
      },
      { key: "showQr", label: "显示扫码拨号二维码 (tel:)", type: "checkbox" },
    ],
    render(ctx, W, H, v, extras) {
      const header = strVal(v.header).trim() || "临时停靠 · 请多关照";
      const phoneDisp = formatPhoneDisplay(v.phone);
      const digits = sanitizePhoneDigits(v.phone);
      const note = strVal(v.note).trim();
      const theme = strVal(v.theme, "redTop");
      const accent = accentColor(theme);
      const isLand = W > H;
      const hasQr = Boolean(v.showQr && digits.length >= 3);
      const inv = Boolean(extras?.invert);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      if (isLand) {
        const barH = 24;
        if (theme === "redFrame") {
          ctx.strokeStyle = "#FF0000";
          ctx.lineWidth = 3;
          ctx.strokeRect(3, 3, W - 6, H - 6);
          ctx.fillStyle = "#FF0000";
          ctx.font = pixelFont(12);
          ctx.textAlign = hasQr ? "left" : "center";
          ctx.fillText(header, hasQr ? 12 : W / 2, 21);
          ctx.fillRect(10, 28, hasQr ? W - 96 : W - 20, 2);
        } else {
          ctx.fillStyle = accent;
          ctx.fillRect(0, 0, W, barH);
          ctx.fillStyle = "#FFFFFF";
          ctx.font = pixelFont(12);
          ctx.textAlign = "center";
          ctx.fillText(header, W / 2, 17);
        }

        if (hasQr) {
          const qrArea = 80;
          const textW = W - qrArea;
          const cx = Math.round(textW / 2) + 2;
          ctx.fillStyle = "#000000";
          fitFontSize(ctx, phoneDisp, textW - 8, 24, 12);
          ctx.textAlign = "center";
          ctx.fillText(phoneDisp, cx, 68);

          if (note) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(10, 82, textW - 18, 1);
            ctx.fillStyle = accent === "#FF0000" ? "#FF0000" : "#000000";
            fitFontSize(ctx, note, textW - 10, 12, 10);
            ctx.fillText(note, cx, 104);
          }

          ctx.fillStyle = "#000000";
          ctx.font = pixelFont(10);
          ctx.textAlign = "center";
          ctx.fillText("扫码拨号", W - Math.round(qrArea / 2), H - 6);

          finalizeBase(ctx, W, H, inv);
          drawCrispQR(ctx, `tel:${digits}`, W - Math.round(qrArea / 2), 66, 74, 1);
        } else {
          ctx.fillStyle = "#000000";
          fitFontSize(ctx, phoneDisp, W - 16, 36, 12);
          ctx.textAlign = "center";
          ctx.fillText(phoneDisp, W / 2, 72);

          if (note) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(24, 86, W - 48, 2);
            ctx.fillStyle = accent === "#FF0000" ? "#FF0000" : "#000000";
            fitFontSize(ctx, note, W - 20, 12, 10);
            ctx.fillText(note, W / 2, 107);
          }
          finalizeBase(ctx, W, H, inv);
        }
      } else {
        if (theme === "redFrame") {
          ctx.strokeStyle = "#FF0000";
          ctx.lineWidth = 3;
          ctx.strokeRect(3, 3, W - 6, H - 6);
          ctx.fillStyle = "#FF0000";
          ctx.font = pixelFont(12);
          drawWrappedText(ctx, header, W / 2, 26, W - 18, 16, 2, "center");
          ctx.fillRect(14, 52, W - 28, 2);
        } else {
          ctx.fillStyle = accent;
          ctx.fillRect(0, 0, W, 48);
          ctx.fillStyle = "#FFFFFF";
          ctx.font = pixelFont(12);
          drawWrappedText(ctx, header, W / 2, 22, W - 14, 16, 2, "center");
        }

        const parts = phoneDisp.split(" ");
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        if (parts.length === 3) {
          ctx.font = pixelFont(24);
          ctx.fillText(parts[0], W / 2, 82);
          ctx.fillText(parts[1], W / 2, 108);
          ctx.fillText(parts[2], W / 2, 134);
        } else {
          fitFontSize(ctx, phoneDisp, W - 14, 24, 10);
          ctx.fillText(phoneDisp, W / 2, 104);
        }

        if (hasQr) {
          const bottomText = note || "扫码一键拨号";
          ctx.fillStyle = "#000000";
          fitFontSize(ctx, bottomText, W - 10, 12, 10);
          ctx.fillText(bottomText, W / 2, H - 9);
          finalizeBase(ctx, W, H, inv);
          drawCrispQR(ctx, `tel:${digits}`, W / 2, 186, 86, 1);
        } else {
          ctx.fillStyle = accent;
          ctx.fillRect(16, 156, W - 32, 2);
          ctx.fillStyle = "#000000";
          ctx.font = pixelFont(12);
          drawWrappedText(ctx, note || "来电即挪 · 感谢理解", W / 2, 184, W - 18, 18, 3, "center");
          finalizeBase(ctx, W, H, inv);
        }
      }
    },
  },

  {
    id: "wifi",
    category: "life",
    icon: "wifi",
    title: "Wi-Fi 分享",
    desc: "访客扫码一键连网",
    badge: "实用",
    defaultOrientation: "landscape",
    defaults: {
      title: "GUEST WI-FI",
      ssid: "MyHome_5G",
      password: "password123",
      enc: "WPA",
      hidePwd: false,
      theme: "redTop",
    },
    fields: [
      { key: "title", label: "卡片标题", type: "text", placeholder: "GUEST WI-FI" },
      { key: "ssid", label: "Wi-Fi 名称 (SSID)", type: "text", placeholder: "无线网络名称" },
      { key: "password", label: "Wi-Fi 密码", type: "text", placeholder: "留空或选无密码" },
      {
        key: "enc",
        label: "加密方式",
        type: "select",
        options: [
          { value: "WPA", label: "WPA / WPA2 / WPA3" },
          { value: "WEP", label: "WEP" },
          { value: "nopass", label: "无密码 (开放网络)" },
        ],
      },
      {
        key: "theme",
        label: "配色主题",
        type: "select",
        options: [
          { value: "redTop", label: "经典红" },
          { value: "blackTop", label: "极简黑" },
        ],
      },
      { key: "hidePwd", label: "隐藏明文密码（仅扫码直连）", type: "checkbox" },
    ],
    render(ctx, W, H, v, extras) {
      const title = strVal(v.title).trim() || "WI-FI";
      const ssid = strVal(v.ssid).trim() || "MyHome_5G";
      const enc = strVal(v.enc, "WPA");
      const rawPwd = strVal(v.password);
      const pwd = enc === "nopass" ? "无密码" : v.hidePwd ? "••••••（扫码连）" : rawPwd;
      const payload = buildWifiPayload(ssid, rawPwd, enc);
      const accent = accentColor(v.theme);
      const isLand = W > H;
      const inv = Boolean(extras?.invert);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      if (isLand) {
        const qrBox = 98;
        const leftW = W - qrBox - 8;

        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, leftW, 24);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = pixelFont(12);
        ctx.textAlign = "left";
        ctx.fillText(title, 10, 17);

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(10);
        ctx.fillText("网络名称", 10, 46);
        fitFontSize(ctx, ssid, leftW - 14, 20, 10);
        ctx.fillText(ssid, 10, 68);

        ctx.fillStyle = accent;
        ctx.fillRect(10, 76, leftW - 18, 1.5);

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(10);
        ctx.fillText("密码", 10, 91);
        fitFontSize(ctx, pwd, leftW - 14, 12, 10);
        ctx.fillText(pwd, 10, 110);

        ctx.font = pixelFont(10);
        ctx.textAlign = "center";
        ctx.fillText("扫码直连", W - qrBox / 2 - 2, H - 5);

        finalizeBase(ctx, W, H, inv);
        drawCrispQR(ctx, payload, W - qrBox / 2 - 2, 54, 94, 1);
      } else {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 36);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = pixelFont(12);
        ctx.textAlign = "center";
        ctx.fillText(title, W / 2, 23);

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(10);
        ctx.fillText("扫码连接无线网", W / 2, 162);

        ctx.fillStyle = accent;
        ctx.fillRect(14, 170, W - 28, 2);

        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";
        ctx.font = pixelFont(10);
        ctx.fillText("SSID:", 10, 190);
        fitFontSize(ctx, ssid, W - 20, 20, 10);
        ctx.fillText(ssid, 10, 208);

        ctx.font = pixelFont(10);
        ctx.fillText("PWD:", 10, 226);
        fitFontSize(ctx, pwd, W - 20, 12, 10);
        ctx.fillText(pwd, 10, 242);

        finalizeBase(ctx, W, H, inv);
        drawCrispQR(ctx, payload, W / 2, 96, 104, 1);
      }
    },
  },

  {
    id: "door",
    category: "life",
    icon: "door",
    title: "门口提示牌",
    desc: "外卖挂门把 · 勿敲门",
    defaultOrientation: "landscape",
    defaults: {
      badge: "DOOR NOTICE",
      title: "外卖请挂门把手",
      sub: "辛苦小哥，放好发消息即可，祝一路顺风！",
      phone: "",
      theme: "redTop",
    },
    presets: [
      { label: "外卖挂门把", values: { badge: "外卖提示", title: "请挂门把手", sub: "无需敲门 · 放好发消息即可 · 辛苦了！", theme: "redTop" } },
      { label: "宝宝睡觉", values: { badge: "请勿敲门", title: "宝宝正在睡觉", sub: "快递/外卖请放门口，请勿按门铃！", theme: "redTop" } },
      { label: "快递放门口", values: { badge: "快递提示", title: "快递请放门口", sub: "家中有人不便开门，放鞋柜上即可", theme: "blackTop" } },
      { label: "外出休假", values: { badge: "AWAY", title: "家中暂无人", sub: "快递请放驿站或代收点，谢谢！", theme: "blackTop" } },
    ],
    fields: [
      { key: "badge", label: "顶部小标题", type: "text", placeholder: "外卖提示 / 请勿敲门" },
      { key: "title", label: "醒目主提示", type: "text", placeholder: "外卖请挂门把手" },
      { key: "sub", label: "详细说明", type: "textarea", placeholder: "补充说明..." },
      { key: "phone", label: "联系电话（可选，留空不显示）", type: "text", placeholder: "例如 13800138000" },
      {
        key: "theme",
        label: "配色主题",
        type: "select",
        options: [
          { value: "redTop", label: "警示红" },
          { value: "blackTop", label: "极简黑" },
        ],
      },
    ],
    render(ctx, W, H, v, extras) {
      const badge = strVal(v.badge).trim() || "NOTICE";
      const title = strVal(v.title).trim() || "请放门口";
      const sub = strVal(v.sub).trim();
      const phone = strVal(v.phone).trim();
      const accent = accentColor(v.theme);
      const isLand = W > H;
      const inv = Boolean(extras?.invert);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      if (isLand) {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 24);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = pixelFont(12);
        ctx.textAlign = "center";
        ctx.fillText(badge, W / 2, 17);

        ctx.fillStyle = "#000000";
        fitFontSize(ctx, title, W - 20, 24, 12);
        ctx.textAlign = "center";
        ctx.fillText(title, W / 2, 60);

        ctx.fillStyle = accent;
        ctx.fillRect(24, 70, W - 48, 2);

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(12);
        if (phone) {
          drawWrappedText(ctx, sub, W / 2, 90, W - 20, 15, 1, "center");
          ctx.fillStyle = accent;
          ctx.font = pixelFont(12);
          ctx.fillText(`TEL: ${formatPhoneDisplay(phone)}`, W / 2, 112);
        } else {
          drawWrappedText(ctx, sub, W / 2, 92, W - 22, 16, 2, "center");
        }
      } else {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 44);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = pixelFont(12);
        ctx.textAlign = "center";
        ctx.fillText(badge, W / 2, 27);

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(20);
        const used = drawWrappedText(ctx, title, W / 2, 82, W - 18, 26, 2, "center");
        const lineY = 82 + used * 26 - 8;

        ctx.fillStyle = accent;
        ctx.fillRect(16, lineY, W - 32, 2);

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(12);
        drawWrappedText(ctx, sub, W / 2, lineY + 24, W - 18, 18, 4, "center");

        if (phone) {
          ctx.fillStyle = accent;
          ctx.fillRect(12, H - 30, W - 24, 22);
          ctx.fillStyle = "#FFFFFF";
          fitFontSize(ctx, formatPhoneDisplay(phone), W - 30, 12, 10);
          ctx.textAlign = "center";
          ctx.fillText(formatPhoneDisplay(phone), W / 2, H - 15);
        }
      }
      finalizeBase(ctx, W, H, inv);
    },
  },

  {
    id: "label",
    category: "life",
    icon: "box",
    title: "收纳标签",
    desc: "箱盒药箱分类清单",
    defaultOrientation: "landscape",
    defaults: {
      code: "BOX-01",
      title: "数码线材与充电器",
      items: "· Type-C 快充线 ×4\n· 氮化镓充电头\n· 读卡器 / 转接头\n· 备用电池",
      date: todayStr(),
      theme: "blackTop",
    },
    presets: [
      { label: "线材盒", values: { code: "CABLE-01", title: "数码线材与充电器", items: "· Type-C 快充线 ×4\n· 氮化镓充电头\n· 读卡器 / 转接头\n· 备用电池", theme: "blackTop" } },
      { label: "家庭药箱", values: { code: "MED-A", title: "常备感冒退烧药", items: "· 布洛芬缓释胶囊\n· 体温计 / 酒精棉\n· 创可贴 / 碘伏\n· 有效期内请定期检查", theme: "redTop" } },
      { label: "电子元件", values: { code: "DEV-03", title: "TLSR8250 开发配件", items: "· 2.13寸三色墨水屏\n· CH340 USB-TTL\n· 杜邦线 / 排针\n· 焊锡丝 / 助焊剂", theme: "blackTop" } },
    ],
    fields: [
      { key: "code", label: "编号 / 位置码", type: "text", placeholder: "BOX-01" },
      { key: "title", label: "分类大标题", type: "text", placeholder: "数码线材与充电器" },
      { key: "items", label: "物品清单（每行一项）", type: "textarea" },
      { key: "date", label: "整理 / 有效期日期", type: "date" },
      {
        key: "theme",
        label: "配色主题",
        type: "select",
        options: [
          { value: "blackTop", label: "极简黑标" },
          { value: "redTop", label: "警示红标" },
        ],
      },
    ],
    render(ctx, W, H, v, extras) {
      const code = strVal(v.code).trim() || "TAG";
      const title = strVal(v.title).trim() || "收纳箱";
      const items = strVal(v.items).split("\n").map((s) => s.trim()).filter(Boolean);
      const date = strVal(v.date).trim();
      const accent = accentColor(v.theme);
      const isLand = W > H;
      const inv = Boolean(extras?.invert);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, W - 4, H - 4);

      if (isLand) {
        ctx.fillStyle = accent;
        ctx.fillRect(2, 2, W - 4, 30);
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "left";
        fitFontSize(ctx, title, W - 82, 20, 10);
        ctx.fillText(title, 10, 22);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = pixelFont(10);
        ctx.textAlign = "right";
        ctx.fillText(code, W - 10, 21);

        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";
        let y = 50;
        items.slice(0, 4).forEach((line) => {
          fitFontSize(ctx, line, W - 20, 12, 10);
          ctx.fillText(line, 10, y);
          y += 17;
        });

        if (date) {
          ctx.fillStyle = accent;
          ctx.font = pixelFont(10);
          ctx.textAlign = "right";
          ctx.fillText(date, W - 8, H - 7);
        }
      } else {
        ctx.fillStyle = accent;
        ctx.fillRect(2, 2, W - 4, 52);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = pixelFont(10);
        ctx.textAlign = "left";
        ctx.fillText(code, 10, 19);
        fitFontSize(ctx, title, W - 18, 20, 10);
        ctx.fillText(title, 10, 41);

        ctx.fillStyle = "#000000";
        let y = 74;
        items.slice(0, 7).forEach((line) => {
          fitFontSize(ctx, line, W - 18, 12, 10);
          ctx.fillText(line, 9, y);
          y += 22;
        });

        if (date) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(10, H - 24, W - 20, 1.5);
          ctx.fillStyle = accent;
          ctx.font = pixelFont(10);
          ctx.textAlign = "center";
          ctx.fillText(date, W / 2, H - 9);
        }
      }
      finalizeBase(ctx, W, H, inv);
    },
  },

  {
    id: "card",
    category: "life",
    icon: "idCard",
    title: "个人名片",
    desc: "主页与社交二维码",
    defaultOrientation: "portrait",
    qrDecodeField: "qrText",
    defaults: {
      name: "hungtcs",
      bio: "硬件折腾 · 开源玩家",
      qrText: AUTHOR_LINKS.github,
      footer: "扫码访问主页",
      theme: "redTop",
    },
    fields: [
      { key: "name", label: "姓名 / 昵称", type: "text", placeholder: "你的名字或 ID" },
      { key: "bio", label: "头衔 / 一句话简介", type: "text", placeholder: "例如：工程师 · 创客" },
      { key: "qrText", label: "二维码内容（网址 / 微信链接 / 文本）", type: "text", placeholder: "https://..." },
      { key: "footer", label: "底部引导语", type: "text", placeholder: "扫码联系我" },
      {
        key: "theme",
        label: "配色主题",
        type: "select",
        options: [
          { value: "redTop", label: "经典红" },
          { value: "blackTop", label: "商务黑" },
        ],
      },
    ],
    render(ctx, W, H, v, extras) {
      const name = strVal(v.name).trim() || "InkCard";
      const bio = strVal(v.bio).trim();
      const qrText = strVal(v.qrText).trim() || AUTHOR_LINKS.github;
      const footer = strVal(v.footer).trim() || "扫码联系我";
      const accent = accentColor(v.theme);
      const isLand = W > H;
      const inv = Boolean(extras?.invert);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      if (!isLand) {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 56);
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        fitFontSize(ctx, name, W - 16, 20, 12);
        ctx.fillText(name, W / 2, 28);
        if (bio) {
          fitFontSize(ctx, bio, W - 14, 12, 10);
          ctx.fillText(bio, W / 2, 47);
        }

        ctx.fillStyle = "#000000";
        ctx.fillRect(18, H - 34, W - 36, 2);
        ctx.fillStyle = accent;
        fitFontSize(ctx, footer, W - 14, 12, 10);
        ctx.textAlign = "center";
        ctx.fillText(footer, W / 2, H - 14);

        finalizeBase(ctx, W, H, inv);
        drawCrispQR(ctx, qrText, W / 2, 136, 106, 1);
      } else {
        const qrArea = 104;
        const rx = qrArea + 8;
        const rw = W - rx - 8;

        ctx.fillStyle = accent;
        ctx.fillRect(rx, 10, rw, 28);
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "left";
        fitFontSize(ctx, name, rw - 12, 20, 10);
        ctx.fillText(name, rx + 6, 29);

        ctx.fillStyle = "#000000";
        ctx.font = pixelFont(12);
        drawWrappedText(ctx, bio, rx + 2, 58, rw - 4, 18, 2, "left");

        ctx.fillStyle = accent;
        ctx.fillRect(rx, H - 28, rw, 2);
        ctx.fillStyle = "#000000";
        fitFontSize(ctx, footer, rw - 4, 12, 10);
        ctx.textAlign = "left";
        ctx.fillText(footer, rx + 2, H - 10);

        finalizeBase(ctx, W, H, inv);
        drawCrispQR(ctx, qrText, qrArea / 2 + 4, H / 2, 100, 1);
      }
    },
  },

  {
    id: "lost",
    category: "life",
    icon: "tag",
    title: "防丢 / 宠物牌",
    desc: "背包与宠物联系卡",
    defaultOrientation: "landscape",
    defaults: {
      header: "如果我走丢了 · 请联系",
      item: "我的背包 / 小橘猫",
      phone: "13800138000",
      note: "拾获归还 · 必有重谢",
      theme: "redTop",
      showQr: true,
    },
    presets: [
      { label: "背包防丢", values: { header: "物品防丢卡 · 拾获请联系", item: "我的随身背包", note: "内有重要物品 · 必有重谢" } },
      { label: "宠物铭牌", values: { header: "我走丢了 · 帮我回家", item: "小橘 · 很乖不咬人", note: "请联系主人 · 感激不尽" } },
      { label: "行李牌", values: { header: "LUGGAGE TAG", item: "托运行李 · 勿错拿", note: "如误拿请致电联系" } },
    ],
    fields: [
      { key: "header", label: "顶部警示语", type: "text", placeholder: "如果我走丢了 · 请联系" },
      { key: "item", label: "物品 / 宠物名称", type: "text", placeholder: "例如：小橘 / 随身背包" },
      { key: "phone", label: "联系电话", type: "text", placeholder: "13800138000" },
      { key: "note", label: "酬谢 / 备注", type: "text", placeholder: "拾获归还 · 必有重谢" },
      {
        key: "theme",
        label: "配色主题",
        type: "select",
        options: [
          { value: "redTop", label: "醒目红顶" },
          { value: "blackTop", label: "极简黑顶" },
        ],
      },
      { key: "showQr", label: "显示扫码拨号二维码", type: "checkbox" },
    ],
    render(ctx, W, H, v, extras) {
      const header = strVal(v.header).trim() || "拾获请联系";
      const item = strVal(v.item).trim() || "随身物品";
      const phoneDisp = formatPhoneDisplay(v.phone);
      const digits = sanitizePhoneDigits(v.phone);
      const note = strVal(v.note).trim();
      const accent = accentColor(v.theme);
      const isLand = W > H;
      const hasQr = Boolean(v.showQr && digits.length >= 3);
      const inv = Boolean(extras?.invert);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      if (isLand) {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 24);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = pixelFont(12);
        ctx.textAlign = "center";
        ctx.fillText(header, W / 2, 17);

        const textW = hasQr ? W - 80 : W - 16;
        const tx = hasQr ? 10 : W / 2;
        ctx.textAlign = hasQr ? "left" : "center";

        ctx.fillStyle = "#000000";
        fitFontSize(ctx, item, textW - 6, 12, 10);
        ctx.fillText(item, tx, 45);

        ctx.fillStyle = accent;
        fitFontSize(ctx, phoneDisp, textW - 6, 24, 12);
        ctx.fillText(phoneDisp, tx, 80);

        if (note) {
          ctx.fillStyle = "#000000";
          fitFontSize(ctx, note, textW - 6, 10, 10);
          ctx.fillText(note, tx, 107);
        }

        finalizeBase(ctx, W, H, inv);
        if (hasQr) drawCrispQR(ctx, `tel:${digits}`, W - 39, 73, 74, 1);
      } else {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 44);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = pixelFont(12);
        drawWrappedText(ctx, header, W / 2, 20, W - 14, 16, 2, "center");

        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        fitFontSize(ctx, item, W - 14, 20, 10);
        ctx.fillText(item, W / 2, 70);

        ctx.fillStyle = accent;
        fitFontSize(ctx, phoneDisp, W - 12, 20, 10);
        ctx.fillText(phoneDisp, W / 2, 98);

        ctx.fillStyle = "#000000";
        ctx.fillRect(14, 108, W - 28, 2);

        if (hasQr) {
          ctx.font = pixelFont(12);
          drawWrappedText(ctx, note || "扫码拨号", W / 2, H - 22, W - 14, 14, 2, "center");
          finalizeBase(ctx, W, H, inv);
          drawCrispQR(ctx, `tel:${digits}`, W / 2, 162, 86, 1);
        } else {
          ctx.font = pixelFont(12);
          drawWrappedText(ctx, note || "拾获请联系", W / 2, 142, W - 18, 18, 4, "center");
          finalizeBase(ctx, W, H, inv);
        }
      }
    },
  },
];
