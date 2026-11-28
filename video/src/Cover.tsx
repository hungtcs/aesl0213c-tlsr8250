import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { THEME } from "./theme";

export const Cover: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0F1116",
        fontFamily: THEME.fontSans,
        color: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* Technical blueprint grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      {/* Dramatic red & green ambient glow */}
      <div
        style={{
          position: "absolute",
          left: -140,
          bottom: -160,
          width: 860,
          height: 860,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(217,43,43,0.34) 0%, rgba(217,43,43,0) 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -120,
          top: -140,
          width: 780,
          height: 780,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0) 68%)",
        }}
      />

      {/* Main 4:3 Content Container (1600x1200) */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          height: "100%",
          padding: "78px 72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 36,
        }}
      >
        {/* Left: High-impact Typography */}
        <div
          style={{
            flex: "0 0 880px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
          }}
        >
          {/* Top badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{
                backgroundColor: THEME.red,
                color: "#FFFFFF",
                padding: "12px 24px",
                borderRadius: 12,
                fontFamily: THEME.fontMono,
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: 1,
                boxShadow: "0 10px 28px rgba(217,43,43,0.4)",
              }}
            >
              全开源 · TLSR8250
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
              2.13&quot; 黑白红三色屏
            </span>
          </div>

          {/* Giant Headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                fontSize: 108,
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: -2,
                color: "#FFFFFF",
                textShadow: "0 10px 30px rgba(0,0,0,0.45)",
              }}
            >
              闲置墨水屏价签
            </div>
            <div
              style={{
                fontSize: 106,
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: -2,
                color: "#FF4D4D",
                textShadow: "0 10px 36px rgba(217,43,43,0.45)",
              }}
            >
              1颗电阻彻底逆向
            </div>
          </div>

          {/* 3 Killer Use Cases */}
          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            {[
              { label: "无线三色刷图", accent: "#FFFFFF", bg: "#1E222B" },
              { label: "BLE 串口透传", accent: "#86EFAC", bg: "#15261D" },
              { label: "FindMy 追踪器", accent: "#93C5FD", bg: "#142033" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  backgroundColor: item.bg,
                  border: `2.5px solid ${item.accent}`,
                  color: item.accent,
                  padding: "16px 22px",
                  borderRadius: 16,
                  fontSize: 30,
                  fontWeight: 900,
                  boxShadow: "0 12px 24px rgba(0,0,0,0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </div>
            ))}
          </div>

          {/* Bottom Author + Repo Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginTop: 14,
            }}
          >
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
              <span
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#FFFFFF",
                }}
              >
                hungtcs
              </span>
              <span
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 22,
                  color: "#9CA3AF",
                }}
              >
                全套固件 + 网页工具 + 裸机 / BLE C SDK
              </span>
            </div>
          </div>
        </div>

        {/* Right: Layered Real Hardware Showcase */}
        <div
          style={{
            flex: 1,
            height: "100%",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Back card: Shell photo */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 48,
              width: 340,
              height: 560,
              borderRadius: 26,
              overflow: "hidden",
              border: "4px solid rgba(255,255,255,0.75)",
              transform: "rotate(-7deg)",
              boxShadow: "0 28px 60px rgba(0,0,0,0.65)",
            }}
          >
            <Img
              src={staticFile("assets/shell-back.jpg")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Front card: PCB Board photo */}
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 76,
              width: 385,
              height: 650,
              borderRadius: 26,
              overflow: "hidden",
              border: `5px solid ${THEME.red}`,
              transform: "rotate(4deg)",
              boxShadow: "0 32px 72px rgba(0,0,0,0.75)",
            }}
          >
            <Img
              src={staticFile("assets/board-front.jpg")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Floating 1kΩ Resistor Badge */}
          <div
            style={{
              position: "absolute",
              left: -18,
              bottom: 24,
              backgroundColor: "#FAF9F5",
              color: THEME.ink,
              border: `4px solid ${THEME.ink}`,
              boxShadow: `10px 10px 0 ${THEME.red}`,
              borderRadius: 20,
              padding: "16px 24px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              zIndex: 20,
            }}
          >
            {/* Mini SVG 1kΩ resistor icon */}
            <svg width="74" height="32" viewBox="0 0 78 32">
              <line x1="0" y1="16" x2="14" y2="16" stroke="#141416" strokeWidth="4" />
              <line x1="64" y1="16" x2="78" y2="16" stroke="#141416" strokeWidth="4" />
              <rect x="14" y="4" width="50" height="24" rx="6" fill="#D97706" stroke="#141416" strokeWidth="2.5" />
              <rect x="23" y="5" width="5" height="22" fill="#78350F" />
              <rect x="33" y="5" width="5" height="22" fill="#111827" />
              <rect x="43" y="5" width="5" height="22" fill="#DC2626" />
              <rect x="54" y="5" width="4" height="22" fill="#FBBF24" />
            </svg>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: THEME.fontMono, fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>
                1kΩ SWS
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: THEME.inkMuted }}>
                免专用烧录器
              </span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
