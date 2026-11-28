import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FrameChrome } from "../components/FrameChrome";
import { SPRING_SMOOTH, SPRING_SNAPPY, THEME } from "../theme";
import { VOICEOVER_DATA } from "../voiceoverData";

export const Scene4Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const topSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const cliSpring = spring({ frame: frame - 34, fps, config: SPRING_SNAPPY });
  const webSpring = spring({ frame: frame - 52, fps, config: SPRING_SNAPPY });

  // Animated signal dot traveling along TX -> 1k -> SWS wire
  const pulseT = (frame % 70) / 70;
  const dotX = interpolate(pulseT, [0, 1], [190, 520]);

  return (
    <FrameChrome
      voiceover={VOICEOVER_DATA.scene4_flash}
      sceneIndex={3}
      totalScenes={8}
      dark
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
        }}
      >
        {/* Top Row: Custom ZK_TESR21S_V2.1 SVG Wiring Diagram + Checklist */}
        <div
          style={{
            display: "flex",
            gap: 32,
            alignItems: "stretch",
            opacity: topSpring,
            transform: `translateY(${interpolate(topSpring, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* Left: Dedicated SVG Wiring Diagram */}
          <div
            style={{
              flex: "0 0 820px",
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderRadius: 20,
              padding: "22px 26px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div
                  style={{
                    fontFamily: THEME.fontMono,
                    fontSize: 15,
                    color: THEME.red,
                    fontWeight: 700,
                  }}
                >
                  ZK_TESR21S_V2.1 · 单线 SWS 接线示意图（无独立 RST）
                </div>
                <h2 style={{ margin: "4px 0 0", fontSize: 34, fontWeight: 900, color: "#FFF" }}>
                  普通串口模块 + 1 颗 1kΩ 电阻即可刷机
                </h2>
              </div>
              <span
                style={{
                  backgroundColor: "rgba(34,197,94,0.16)",
                  color: THEME.green,
                  border: `1px solid ${THEME.green}`,
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontFamily: THEME.fontMono,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                CH343 / CH340
              </span>
            </div>

            {/* Clean crisp SVG wiring diagram */}
            <svg
              viewBox="0 0 760 250"
              style={{
                width: "100%",
                height: 245,
                backgroundColor: "#0E1117",
                borderRadius: 14,
                border: `1px solid ${THEME.darkBorder}`,
              }}
            >
              {/* Left Module: USB-TTL CH343 */}
              <rect x="20" y="22" width="166" height="206" rx="12" fill="#1B2230" stroke="#3B82F6" strokeWidth="2.5" />
              <text x="103" y="48" textAnchor="middle" fill="#93C5FD" fontSize="15" fontWeight="800" fontFamily="monospace">
                USB-TTL (CH343)
              </text>

              {/* Left Pins */}
              {[
                { y: 78, label: "GND", color: "#9CA3AF" },
                { y: 122, label: "TX", color: "#F59E0B" },
                { y: 166, label: "RX", color: "#38BDF8" },
                { y: 206, label: "RTS / 3.3V", color: "#EF4444" },
              ].map((p) => (
                <g key={p.label}>
                  <text x="166" y={p.y + 5} textAnchor="end" fill="#F3F4F6" fontSize="14" fontWeight="700" fontFamily="monospace">
                    {p.label}
                  </text>
                  <circle cx="186" cy={p.y} r="6" fill={p.color} stroke="#0E1117" strokeWidth="2" />
                </g>
              ))}

              {/* Right Module: ESL Back Pads */}
              <rect x="526" y="22" width="214" height="206" rx="12" fill="#18271E" stroke="#22C55E" strokeWidth="2.5" />
              <text x="633" y="48" textAnchor="middle" fill="#86EFAC" fontSize="15" fontWeight="800" fontFamily="monospace">
                价签背面 5 焊盘
              </text>

              {/* Right Pads in actual PCB order: GND, RXD, TXD, SWS, 3V3 */}
              {[
                { y: 78, label: "GND", sub: "", active: true, color: "#9CA3AF" },
                { y: 110, label: "RXD", sub: "悬空不接", active: false, color: "#4B5563" },
                { y: 140, label: "TXD", sub: "悬空不接", active: false, color: "#4B5563" },
                { y: 172, label: "SWS", sub: "PA7 单线", active: true, color: "#F59E0B" },
                { y: 206, label: "3V3", sub: "自动控电", active: true, color: "#EF4444" },
              ].map((p) => (
                <g key={p.label}>
                  <circle
                    cx="526"
                    cy={p.y}
                    r="6"
                    fill={p.active ? p.color : "#1F2937"}
                    stroke={p.active ? "#0E1117" : "#6B7280"}
                    strokeWidth="2"
                  />
                  <text
                    x="544"
                    y={p.y + 5}
                    fill={p.active ? "#FFFFFF" : "#6B7280"}
                    fontSize="14"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {p.label}
                  </text>
                  {p.sub && (
                    <text
                      x="726"
                      y={p.y + 4}
                      textAnchor="end"
                      fill={p.active ? "#9CA3AF" : "#EF4444"}
                      fontSize="12"
                      fontWeight="600"
                      fontFamily="sans-serif"
                    >
                      {p.sub}
                    </text>
                  )}
                </g>
              ))}

              {/* Wire 1: GND -> GND */}
              <path d="M 192 78 L 520 78" stroke="#9CA3AF" strokeWidth="3.5" fill="none" strokeDasharray="8 4" />
              <text x="356" y="70" textAnchor="middle" fill="#9CA3AF" fontSize="13" fontWeight="700" fontFamily="monospace">
                GND 共地
              </text>

              {/* Wire 2: TX -> 1kΩ Resistor -> Node -> SWS */}
              <path d="M 192 122 L 285 122" stroke="#F59E0B" strokeWidth="3.5" fill="none" />
              {/* 1kΩ Resistor body */}
              <rect x="285" y="109" width="84" height="26" rx="6" fill="#D97706" stroke="#FDE68A" strokeWidth="2" />
              {/* Color bands: Brown-Black-Red */}
              <rect x="301" y="110" width="6" height="24" fill="#78350F" />
              <rect x="317" y="110" width="6" height="24" fill="#111827" />
              <rect x="333" y="110" width="6" height="24" fill="#DC2626" />
              <rect x="351" y="110" width="5" height="24" fill="#FBBF24" />
              <text x="327" y="101" textAnchor="middle" fill="#FDE68A" fontSize="14" fontWeight="800" fontFamily="monospace">
                R1 = 1kΩ
              </text>

              {/* Resistor right side -> Junction -> SWS */}
              <path d="M 369 122 L 424 122 L 424 172 L 520 172" stroke="#F59E0B" strokeWidth="3.5" fill="none" />

              {/* Wire 3: RX -> Junction (board side of resistor) */}
              <path d="M 192 166 L 424 166" stroke="#38BDF8" strokeWidth="3.5" fill="none" />
              <circle cx="424" cy="166" r="6" fill="#38BDF8" stroke="#FFF" strokeWidth="2" />
              <text x="305" y="158" textAnchor="middle" fill="#7DD3FC" fontSize="12" fontWeight="700">
                并联在电阻靠板子侧
              </text>

              {/* Wire 4: RTS/3.3V -> 3V3 */}
              <path d="M 192 206 L 520 206" stroke="#EF4444" strokeWidth="3.5" fill="none" />
              <text x="356" y="226" textAnchor="middle" fill="#FCA5A5" fontSize="13" fontWeight="700">
                接 RTS 自动控电复位（接 3.3V 需手动上电）
              </text>

              {/* Animated SWS pulse dot */}
              <circle cx={dotX} cy={dotX < 424 ? 122 : 172} r="6" fill="#FFFFFF" />
            </svg>
          </div>

          {/* Right: Concise checklist + backup warning */}
          <div
            style={{
              flex: 1,
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderRadius: 20,
              padding: "24px 26px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 23, fontWeight: 800, color: "#FFF" }}>
              接线要点（板子 RXD / TXD 不接）
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {[
                ["TX", "串 1kΩ 电阻 → SWS"],
                ["RX", "并联电阻板侧 → SWS"],
                ["GND", "直连价签 GND"],
                ["RTS", "直连 3V3 自动控电复位"],
              ].map(([pin, desc]) => (
                <div
                  key={pin}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    padding: "11px 16px",
                    borderRadius: 10,
                    fontFamily: THEME.fontMono,
                    fontSize: 17,
                  }}
                >
                  <span
                    style={{
                      minWidth: 56,
                      textAlign: "center",
                      backgroundColor: "rgba(59,130,246,0.22)",
                      color: "#93C5FD",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontWeight: 800,
                    }}
                  >
                    {pin}
                  </span>
                  <span style={{ color: "#E5E7EB", fontWeight: 600 }}>{desc}</span>
                </div>
              ))}
              <div
                style={{
                  marginTop: 4,
                  padding: "11px 14px",
                  borderRadius: 10,
                  backgroundColor: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  color: "#FDE68A",
                  fontSize: 16,
                  fontWeight: 600,
                  lineHeight: 1.45,
                }}
              >
                ⚠ 刷机前务必先备份原厂 512KB 固件，清配置时保留 0x76000 原厂 MAC
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: CLI Scripts vs Web Serial */}
        <div style={{ display: "flex", gap: 32 }}>
          {/* CLI Card */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#0B0D11",
              border: `1px solid ${THEME.darkBorder}`,
              borderTop: `4px solid ${THEME.green}`,
              borderRadius: 18,
              padding: "22px 26px",
              opacity: cliSpring,
              transform: `translateY(${interpolate(cliSpring, [0, 1], [30, 0])}px)`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 23, fontWeight: 800, color: "#FFF" }}>
                方式 A · 一键命令行脚本
              </span>
              <span style={{ fontFamily: THEME.fontMono, fontSize: 15, color: THEME.green }}>
                Linux / macOS / Win
              </span>
            </div>
            <div
              style={{
                fontFamily: THEME.fontMono,
                fontSize: 18,
                lineHeight: 1.75,
                color: "#E5E7EB",
              }}
            >
              <div>
                <span style={{ color: THEME.green }}>$</span> ./scripts/backup.sh{" "}
                <span style={{ color: "#6B7280" }}># 备份 512KB 原厂固件</span>
              </div>
              <div>
                <span style={{ color: THEME.green }}>$</span> ./scripts/flash.sh && ./scripts/reset_cfg.sh
              </div>
              <div>
                <span style={{ color: THEME.green }}>$</span> ./scripts/restore.sh{" "}
                <span style={{ color: "#6B7280" }}># 随时无损还原</span>
              </div>
            </div>
          </div>

          {/* Web Serial Card */}
          <div
            style={{
              flex: 1,
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderTop: `4px solid ${THEME.red}`,
              borderRadius: 18,
              padding: "22px 26px",
              opacity: webSpring,
              transform: `translateY(${interpolate(webSpring, [0, 1], [30, 0])}px)`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 23, fontWeight: 800, color: "#FFF" }}>
                方式 B · 浏览器 Web Serial 直刷
              </span>
              <span style={{ fontFamily: THEME.fontMono, fontSize: 15, color: "#FF6B6B" }}>
                免装 Python 环境
              </span>
            </div>
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 10,
                padding: "11px 16px",
                fontFamily: THEME.fontMono,
                fontSize: 17,
                color: "#93C5FD",
                marginBottom: 10,
              }}
            >
              http://localhost:8080/sws_flasher.html
            </div>
            <div style={{ fontSize: 18, color: "#D1D5DB", lineHeight: 1.5 }}>
              Chrome / Edge 打开内置网页，一键连接串口、选择 <code>firmware/*.bin</code>{" "}
              即可完成单线刷写与整片备份。
            </div>
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
