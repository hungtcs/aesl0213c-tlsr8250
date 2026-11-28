import React from "react";
import {
  Img,
  Loop,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FrameChrome } from "../components/FrameChrome";
import { BLE_UART_VOICEOVER } from "../bleUartVoiceoverData";
import { SPRING_SMOOTH, SPRING_SNAPPY, THEME } from "../theme";

const LED_STATES = [
  { state: "待机广播", desc: "绿灯每 2s 闪 1 次", dot: THEME.green },
  { state: "已连接", desc: "绿灯常亮", dot: THEME.green },
  { state: "BLE→UART", desc: "闪绿灯", dot: "#4ADE80" },
  { state: "UART→BLE", desc: "闪红灯", dot: THEME.red },
  { state: "OTA 升级", desc: "红绿交替快闪", dot: THEME.amber },
];

export const B2Wiring: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const rightSpring = spring({ frame: frame - 18, fps, config: SPRING_SMOOTH });

  // Animated data packets along crossed TX/RX lines
  const t = (frame % 60) / 60;
  const rxDotX = interpolate(t, [0, 1], [190, 520]);
  const txDotX = interpolate(t, [0, 1], [520, 190]);

  return (
    <FrameChrome
      voiceover={BLE_UART_VOICEOVER.b2_wiring}
      sceneIndex={2}
      totalScenes={9}
      dark
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 38,
        }}
      >
        {/* Left: Crisp Custom SVG UART Wiring Diagram + LED Legend */}
        <div
          style={{
            flex: "1.12",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            opacity: leftSpring,
            transform: `translateX(${interpolate(leftSpring, [0, 1], [-36, 0])}px)`,
          }}
        >
          <div>
            <span style={{ fontFamily: THEME.fontMono, fontSize: 16, fontWeight: 800, color: THEME.red }}>
              UART WIRING DIAGRAM · 115200 8N1
            </span>
            <h2 style={{ margin: "4px 0 0", fontSize: 42, fontWeight: 900, color: "#FFF" }}>
              串口透传接线示意图与 LED 状态
            </h2>
          </div>

          {/* Crisp SVG Wiring Diagram */}
          <div
            style={{
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderRadius: 20,
              padding: "18px 22px",
            }}
          >
            <svg
              viewBox="0 0 760 270"
              style={{
                width: "100%",
                height: 235,
                backgroundColor: "#0D1016",
                borderRadius: 14,
                border: `1px solid ${THEME.darkBorder}`,
              }}
            >
              {/* Left Box: USB-TTL / Target MCU */}
              <rect x="20" y="20" width="170" height="230" rx="12" fill="#1B2230" stroke="#3B82F6" strokeWidth="2.5" />
              <text x="105" y="48" textAnchor="middle" fill="#93C5FD" fontSize="15" fontWeight="800" fontFamily="monospace">
                USB-TTL / MCU
              </text>

              {[
                { y: 84, label: "GND", color: "#9CA3AF" },
                { y: 132, label: "TX", color: "#F59E0B" },
                { y: 180, label: "RX", color: "#38BDF8" },
                { y: 226, label: "3.3V", color: "#EF4444" },
              ].map((p) => (
                <g key={p.label}>
                  <text x="168" y={p.y + 5} textAnchor="end" fill="#F3F4F6" fontSize="15" fontWeight="800" fontFamily="monospace">
                    {p.label}
                  </text>
                  <circle cx="190" cy={p.y} r="6" fill={p.color} stroke="#0D1016" strokeWidth="2" />
                </g>
              ))}

              {/* Right Box: 2.13" ESL Back 5 Pads */}
              <rect x="520" y="20" width="220" height="230" rx="12" fill="#18271E" stroke="#22C55E" strokeWidth="2.5" />
              <text x="630" y="48" textAnchor="middle" fill="#86EFAC" fontSize="15" fontWeight="800" fontFamily="monospace">
                价签背面 5 焊盘
              </text>

              {[
                { y: 84, label: "GND", sub: "共地", active: true, color: "#9CA3AF" },
                { y: 118, label: "RXD", sub: "PC3 硬件RX", active: true, color: "#F59E0B" },
                { y: 154, label: "TXD", sub: "PC2 硬件TX", active: true, color: "#38BDF8" },
                { y: 190, label: "SWS", sub: "刷机用(可选)", active: false, color: "#6B7280" },
                { y: 226, label: "3V3", sub: "3.3V 供电", active: true, color: "#EF4444" },
              ].map((p) => (
                <g key={p.label}>
                  <circle
                    cx="520"
                    cy={p.y}
                    r="6"
                    fill={p.active ? p.color : "#1F2937"}
                    stroke={p.active ? "#0D1016" : "#6B7280"}
                    strokeWidth="2"
                  />
                  <text
                    x="538"
                    y={p.y + 5}
                    fill={p.active ? "#FFFFFF" : "#6B7280"}
                    fontSize="15"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {p.label}
                  </text>
                  <text
                    x="726"
                    y={p.y + 4}
                    textAnchor="end"
                    fill={p.active ? "#9CA3AF" : "#6B7280"}
                    fontSize="12"
                    fontWeight="600"
                  >
                    {p.sub}
                  </text>
                </g>
              ))}

              {/* Wire: GND -> GND */}
              <path d="M 196 84 L 514 84" stroke="#9CA3AF" strokeWidth="3.5" fill="none" strokeDasharray="8 4" />
              <text x="355" y="75" textAnchor="middle" fill="#9CA3AF" fontSize="13" fontWeight="700">
                GND 共地
              </text>

              {/* Wire: TTL TX -> Board RXD (PC3) */}
              <path d="M 196 132 L 320 132 L 385 118 L 514 118" stroke="#F59E0B" strokeWidth="3.5" fill="none" />
              <text x="355" y="109" textAnchor="middle" fill="#FDE68A" fontSize="13" fontWeight="700">
                TX → RXD (交叉连接)
              </text>

              {/* Wire: TTL RX <- Board TXD (PC2) */}
              <path d="M 196 180 L 320 180 L 385 154 L 514 154" stroke="#38BDF8" strokeWidth="3.5" fill="none" />
              <text x="355" y="176" textAnchor="middle" fill="#7DD3FC" fontSize="13" fontWeight="700">
                RX ← TXD (交叉连接)
              </text>

              {/* Wire: 3.3V -> 3V3 */}
              <path d="M 196 226 L 514 226" stroke="#EF4444" strokeWidth="3.5" fill="none" />
              <text x="355" y="246" textAnchor="middle" fill="#FCA5A5" fontSize="13" fontWeight="700">
                3.3V 供电（切勿接 5V）
              </text>

              {/* Animated packets */}
              <circle cx={rxDotX} cy={rxDotX < 350 ? 132 : 118} r="5.5" fill="#FFF" />
              <circle cx={txDotX} cy={txDotX > 350 ? 154 : 180} r="5.5" fill="#7DD3FC" />
            </svg>
          </div>

          {/* Compact LED + Reused EPD Control Pins Card */}
          <div
            style={{
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderRadius: 18,
              padding: "16px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 19, fontWeight: 800, color: "#FFF" }}>
              复用拆屏空闲 EPD 引脚（标准硬件控制口）
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div
                style={{
                  backgroundColor: "rgba(59,130,246,0.12)",
                  border: `1px solid rgba(59,130,246,0.38)`,
                  borderRadius: 10,
                  padding: "10px 14px",
                }}
              >
                <div style={{ fontFamily: THEME.fontMono, fontSize: 16, fontWeight: 900, color: "#93C5FD" }}>
                  PA1 · STATE 输出（原 EPD_RST）
                </div>
                <div style={{ fontSize: 15, color: "#D1D5DB", marginTop: 4 }}>
                  高电平 3.3V = BLE 已连接 · 低电平 0V = 未连接
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "rgba(217,43,43,0.14)",
                  border: `1px solid rgba(217,43,43,0.42)`,
                  borderRadius: 10,
                  padding: "10px 14px",
                }}
              >
                <div style={{ fontFamily: THEME.fontMono, fontSize: 16, fontWeight: 900, color: "#FCA5A5" }}>
                  PA0 · AT_KEY 输入（原 EPD_BUSY）
                </div>
                <div style={{ fontSize: 15, color: "#D1D5DB", marginTop: 4 }}>
                  内置 10K 上拉 · 悬空透传，接地拉低强制进 AT 模式
                </div>
              </div>
            </div>

            {/* ESD / Unremoved Screen Warning */}
            <div
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.42)",
                borderRadius: 10,
                padding: "9px 13px",
                fontSize: 14,
                color: "#FDE68A",
                lineHeight: 1.45,
              }}
            >
              <strong>⚠ 未拆屏风险提示：</strong>断电墨水屏内部 ESD 二极管可能拉低{" "}
              <code style={{ fontFamily: THEME.fontMono }}>PA0</code> 导致无法透传并产生寄生漏电。请<strong>断电后拆除坏屏排线</strong>（防切口短接）；好屏板子请在{" "}
              <code style={{ fontFamily: THEME.fontMono }}>src/app.c</code> 中禁用{" "}
              <code style={{ fontFamily: THEME.fontMono }}>PIN_AT_KEY</code>。
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
              {LED_STATES.map((item, idx) => {
                const s = spring({ frame: frame - (22 + idx * 5), fps, config: SPRING_SNAPPY });
                return (
                  <div
                    key={item.state}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      backgroundColor: "rgba(255,255,255,0.05)",
                      padding: "6px 11px",
                      borderRadius: 8,
                      opacity: s,
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        backgroundColor: item.dot,
                        boxShadow: `0 0 8px ${item.dot}`,
                      }}
                    />
                    <span style={{ fontFamily: THEME.fontMono, fontSize: 14, fontWeight: 800, color: "#FFF" }}>
                      {item.state}
                    </span>
                    <span style={{ fontSize: 14, color: "#9CA3AF" }}>{item.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Real Wiring Example Photo + Standby LED Clip */}
        <div
          style={{
            flex: "0.88",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            opacity: rightSpring,
            transform: `translateX(${interpolate(rightSpring, [0, 1], [36, 0])}px)`,
          }}
        >
          {/* Top: User's Real Wiring Photo as Instance Reference */}
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: `2px solid ${THEME.darkBorder}`,
              backgroundColor: "#FFF",
              position: "relative",
              boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 12,
                zIndex: 5,
                backgroundColor: "rgba(17,19,23,0.88)",
                color: "#93C5FD",
                padding: "4px 12px",
                borderRadius: 8,
                fontFamily: THEME.fontMono,
                fontSize: 14,
                fontWeight: 800,
                border: `1px solid ${THEME.blue}`,
              }}
            >
              实物接线实例（串口 + SWS 同时接入）
            </div>
            <Img
              src={staticFile("demos/ble_uart/wiring_annotated.png")}
              style={{
                width: "100%",
                height: 350,
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          {/* Bottom: Re-cropped Standby Green Blink Clip */}
          <div
            style={{
              height: 310,
              backgroundColor: THEME.darkCard,
              border: `2px solid ${THEME.green}`,
              borderRadius: 18,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 12,
                zIndex: 5,
                backgroundColor: "rgba(17,19,23,0.88)",
                color: THEME.green,
                padding: "4px 12px",
                borderRadius: 8,
                fontFamily: THEME.fontMono,
                fontSize: 14,
                fontWeight: 800,
                border: `1px solid ${THEME.green}`,
              }}
            >
              实拍参考 · 待机绿灯每 2s 慢闪
            </div>
            <Loop durationInFrames={165}>
              <OffthreadVideo
                src={staticFile("demos/ble_uart/led_idle.mp4")}
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </Loop>
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
