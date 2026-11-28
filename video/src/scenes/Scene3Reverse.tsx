import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FrameChrome } from "../components/FrameChrome";
import { SPRING_SMOOTH, SPRING_SNAPPY, THEME } from "../theme";
import { VOICEOVER_DATA } from "../voiceoverData";

const PIN_GROUPS = [
  {
    group: "墨水屏 7 线接口 (SPI + PWR)",
    accent: THEME.red,
    pins: [
      ["PB1", "EPD_PWR (高电平通电)"],
      ["PD2", "EPD_CS"],
      ["PD3", "EPD_DC"],
      ["PA1", "EPD_RST"],
      ["PD7", "EPD_CLK"],
      ["PB7", "EPD_MOSI"],
      ["PA0", "EPD_BUSY (低忙高闲)"],
    ],
  },
  {
    group: "串口 · 调试 · 双色 LED",
    accent: THEME.ink,
    pins: [
      ["PC2 / PC3", "原生硬件 UART TX / RX"],
      ["PA7", "SWS 单线烧录调试口"],
      ["PB4 / PB5", "红灯 / 绿灯 (低电平点亮)"],
    ],
  },
];

export const Scene3Reverse: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const rightSpring = spring({ frame: frame - 24, fps, config: SPRING_SMOOTH });

  // Highlight invisible 6px strip after frame 120
  const highlightInvisible = interpolate(frame, [110, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <FrameChrome
      voiceover={VOICEOVER_DATA.scene3_reverse}
      sceneIndex={2}
      totalScenes={8}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 52,
        }}
      >
        {/* Left: Complete GPIO Pinout Table */}
        <div
          style={{
            flex: "0 0 820px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            opacity: leftSpring,
            transform: `translateX(${interpolate(leftSpring, [0, 1], [-40, 0])}px)`,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: THEME.fontMono,
                fontSize: 17,
                fontWeight: 700,
                color: THEME.red,
                letterSpacing: 1.4,
              }}
            >
              DISASSEMBLY + HARDWARE VERIFIED
            </span>
            <h2
              style={{
                margin: "6px 0 0",
                fontSize: 46,
                fontWeight: 900,
                color: THEME.ink,
              }}
            >
              全引脚定义与显存对齐秘密
            </h2>
          </div>

          {PIN_GROUPS.map((g, gi) => (
            <div
              key={g.group}
              style={{
                backgroundColor: THEME.paperCard,
                border: `2px solid ${THEME.paperBorder}`,
                borderTop: `5px solid ${g.accent}`,
                borderRadius: 16,
                padding: "20px 24px",
                boxShadow: "0 10px 26px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  marginBottom: 14,
                  color: THEME.ink,
                }}
              >
                {g.group}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: gi === 0 ? "1fr 1fr" : "1fr",
                  gap: "10px 18px",
                }}
              >
                {g.pins.map(([pin, fn], pi) => {
                  const s = spring({
                    frame: frame - (16 + gi * 20 + pi * 5),
                    fps,
                    config: SPRING_SNAPPY,
                  });
                  return (
                    <div
                      key={pin}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 12px",
                        borderRadius: 10,
                        backgroundColor: "#F9F7F2",
                        border: `1px solid ${THEME.paperBorder}`,
                        opacity: s,
                        transform: `translateY(${interpolate(s, [0, 1], [12, 0])}px)`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: THEME.fontMono,
                          fontSize: 17,
                          fontWeight: 800,
                          color: "#FFF",
                          backgroundColor: g.accent,
                          padding: "4px 10px",
                          borderRadius: 6,
                          minWidth: gi === 0 ? 58 : 112,
                          textAlign: "center",
                        }}
                      >
                        {pin}
                      </span>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 600,
                          color: THEME.inkSoft,
                        }}
                      >
                        {fn}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right: 122 vs 128 pixel alignment visualization + color truth table */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 24,
            opacity: rightSpring,
            transform: `translateX(${interpolate(rightSpring, [0, 1], [40, 0])}px)`,
          }}
        >
          {/* Alignment Diagram */}
          <div
            style={{
              backgroundColor: THEME.darkBg,
              color: "#FFF",
              borderRadius: 20,
              padding: "28px 30px",
              border: `2px solid ${THEME.ink}`,
              boxShadow: "0 18px 40px rgba(0,0,0,0.16)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                }}
              >
                关键避坑：显存 8 像素对齐
              </span>
              <span
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 16,
                  backgroundColor: THEME.red,
                  padding: "4px 12px",
                  borderRadius: 6,
                  fontWeight: 700,
                }}
              >
                16 Bytes / Row
              </span>
            </div>

            {/* Visual row bar: 122 visible + 6 hidden */}
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: THEME.fontMono,
                  fontSize: 16,
                  color: "#9CA3AF",
                  marginBottom: 8,
                }}
              >
                <span>← 122 px 可见屏幕区 →</span>
                <span style={{ color: "#FF6B6B", fontWeight: 700 }}>
                  +6 px 不可见
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  height: 150,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.22)",
                }}
              >
                <div
                  style={{
                    flex: 122,
                    backgroundColor: "#F5F2EB",
                    color: THEME.ink,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: THEME.fontMono,
                  }}
                >
                  <div style={{ fontSize: 34, fontWeight: 900 }}>122 × 250</div>
                  <div style={{ fontSize: 16, color: THEME.inkMuted, marginTop: 4 }}>
                    Visible E-Ink Area
                  </div>
                </div>
                <div
                  style={{
                    flex: 24,
                    backgroundColor: `rgba(217, 43, 43, ${0.45 + highlightInvisible * 0.55})`,
                    borderLeft: "3px dashed #FFF",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: THEME.fontMono,
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#FFF",
                    textAlign: "center",
                    padding: 4,
                  }}
                >
                  <div>6px</div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>PAD</div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontFamily: THEME.fontMono,
                  fontSize: 17,
                  color: "#D1D5DB",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>总显存：128 × 250 = 4000 B / 通道</span>
                <span style={{ color: THEME.amber }}>未对齐会斜向撕裂!</span>
              </div>
            </div>
          </div>

          {/* Color Truth Table */}
          <div
            style={{
              backgroundColor: THEME.paperCard,
              border: `2px solid ${THEME.paperBorder}`,
              borderRadius: 20,
              padding: "24px 28px",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                marginBottom: 16,
                color: THEME.ink,
              }}
            >
              双通道颜色真值表（指令 0x10 / 0x13）
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {[
                { name: "白色", bg: "#FFFFFF", fg: THEME.ink, ch1: "0x10 = 1", ch2: "0x13 = 0" },
                { name: "黑色", bg: THEME.ink, fg: "#FFFFFF", ch1: "0x10 = 0", ch2: "0x13 = 0" },
                { name: "红色 (优先)", bg: THEME.red, fg: "#FFFFFF", ch1: "0x10 = *", ch2: "0x13 = 1" },
              ].map((c) => (
                <div
                  key={c.name}
                  style={{
                    backgroundColor: c.bg,
                    color: c.fg,
                    border: `2px solid ${THEME.ink}`,
                    borderRadius: 14,
                    padding: "16px 14px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{c.name}</div>
                  <div
                    style={{
                      fontFamily: THEME.fontMono,
                      fontSize: 15,
                      marginTop: 8,
                      opacity: 0.9,
                    }}
                  >
                    {c.ch1}
                    <br />
                    {c.ch2}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
