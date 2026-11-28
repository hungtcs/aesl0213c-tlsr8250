import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { THEME } from "./theme";

export const BleUartCover: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0F1116",
        fontFamily: THEME.fontSans,
        color: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* Blueprint grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          left: -140,
          bottom: -160,
          width: 860,
          height: 860,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.32) 0%, rgba(59,130,246,0) 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -120,
          top: -140,
          width: 800,
          height: 800,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(217,43,43,0.28) 0%, rgba(217,43,43,0) 68%)",
        }}
      />

      {/* 4:3 Container (1600x1200) */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          height: "100%",
          padding: "76px 72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 40,
        }}
      >
        {/* Left: Typography */}
        <div
          style={{
            flex: "0 0 880px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
          }}
        >
          {/* Top Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{
                backgroundColor: THEME.blue,
                color: "#FFFFFF",
                padding: "12px 24px",
                borderRadius: 12,
                fontFamily: THEME.fontMono,
                fontSize: 28,
                fontWeight: 900,
                boxShadow: "0 10px 28px rgba(59,130,246,0.4)",
              }}
            >
              实机演示 · AT 指令详解
            </span>
            <span
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                border: "2px solid rgba(255,255,255,0.22)",
                color: "#F3F4F6",
                padding: "10px 22px",
                borderRadius: 12,
                fontFamily: THEME.fontMono,
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              TLSR8250 开源改造
            </span>
          </div>

          {/* Headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                fontSize: 104,
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: -2,
                color: "#FFFFFF",
                textShadow: "0 10px 30px rgba(0,0,0,0.45)",
              }}
            >
              闲置价签变身
            </div>
            <div
              style={{
                fontSize: 102,
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: -2,
                color: "#60A5FA",
                textShadow: "0 10px 36px rgba(59,130,246,0.45)",
              }}
            >
              BLE 5.0 透传模块
            </div>
          </div>

          {/* 3 Feature Pills */}
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: "MTU 247B", accent: "#FFFFFF", bg: "#1E222B" },
              { label: "全套 AT 指令", accent: "#86EFAC", bg: "#15261D" },
              { label: "浏览器 OTA", accent: "#FCA5A5", bg: "#2B1518" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  backgroundColor: item.bg,
                  border: `2.5px solid ${item.accent}`,
                  color: item.accent,
                  padding: "16px 24px",
                  borderRadius: 16,
                  fontSize: 30,
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </div>
            ))}
          </div>

          {/* Bottom Author */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Img
              src={staticFile("avatar.jpg")}
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                objectFit: "cover",
                border: `3px solid ${THEME.red}`,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontFamily: THEME.fontMono, fontSize: 32, fontWeight: 900 }}>
                hungtcs
              </span>
              <span style={{ fontFamily: THEME.fontMono, fontSize: 22, color: "#9CA3AF" }}>
                NUS + 0xFFE0 双服务 · 14-bit 测电压 · 掉电保存
              </span>
            </div>
          </div>
        </div>

        {/* Right: HC-06 VS TLSR8250 Real Hardware Comparison */}
        <div
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 24,
            position: "relative",
          }}
        >
          {/* Top card: Traditional HC-06 */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              border: "4px solid rgba(255,255,255,0.8)",
              padding: "18px 22px",
              position: "relative",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 16,
                backgroundColor: "#374151",
                color: "#FFF",
                padding: "5px 14px",
                borderRadius: 8,
                fontFamily: THEME.fontMono,
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              平替传统 HC-06
            </div>
            <Img
              src={staticFile("demos/ble_uart/hc06_compare.png")}
              style={{
                width: "100%",
                height: 310,
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          {/* Center VS Badge — centered exactly on the gap between top & bottom cards */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 366,
              transform: "translate(-50%, -50%)",
              zIndex: 20,
              backgroundColor: THEME.red,
              color: "#FFF",
              width: 84,
              height: 84,
              borderRadius: "50%",
              border: "5px solid #0F1116",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: THEME.fontMono,
              fontSize: 32,
              fontWeight: 900,
              boxShadow: "0 10px 26px rgba(217,43,43,0.55)",
            }}
          >
            VS
          </div>

          {/* Bottom card: Real TLSR8250 Wired Setup */}
          <div
            style={{
              flex: 1,
              borderRadius: 24,
              overflow: "hidden",
              border: `5px solid ${THEME.blue}`,
              position: "relative",
              boxShadow: "0 24px 60px rgba(0,0,0,0.65)",
              backgroundColor: "#FFF",
            }}
          >
            <Img
              src={staticFile("demos/ble_uart/wiring_annotated.png")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "88% center",
                display: "block",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 14,
                right: 14,
                backgroundColor: "rgba(15,17,22,0.9)",
                color: THEME.green,
                border: `2px solid ${THEME.green}`,
                padding: "8px 16px",
                borderRadius: 10,
                fontFamily: THEME.fontMono,
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              TLSR8250 · BLE 5.0
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
