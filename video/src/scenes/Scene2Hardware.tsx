import React from "react";
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FrameChrome } from "../components/FrameChrome";
import { SPRING_SMOOTH, SPRING_SNAPPY, THEME } from "../theme";
import { VOICEOVER_DATA } from "../voiceoverData";

const SPECS = [
  {
    tag: "MCU",
    title: "Telink TLSR8250F512ET32",
    desc: "32 位 TC32 RISC 内核，最高 48 MHz，外接 24 MHz 晶振",
  },
  {
    tag: "MEM",
    title: "512 KB Flash · 48 KB SRAM",
    desc: "片上集成 Flash（支持 XIP），内存足够双通道 8KB 显存 + BLE 协议栈",
  },
  {
    tag: "RF",
    title: "BLE 5.0 · Zigbee · 2.4 GHz",
    desc: "支持 1M / 2M / Coded PHY 与 BLE Mesh，最大发射功率 +10 dBm",
  },
  {
    tag: "PWR",
    title: "0.4 µA Deep Sleep 超低功耗",
    desc: "Deep Retention 保持 RAM 仅 1.2 ~ 1.8 µA，纽扣电池轻松续航数月",
  },
  {
    tag: "EPD",
    title: "2.13\" 黑白红三色墨水屏",
    desc: "合力泰 HINK-E0213A170-FPC-A0 · 类 UC8151 / JD79653 协议",
  },
];

const CALLOUTS = [
  { x: 50, y: 8, label: "2.13\" EPD FPC", delay: 16 },
  { x: 58, y: 27, label: "5× 调试焊盘 (SWS/UART)", delay: 30 },
  { x: 60, y: 65, label: "U1: TLSR8250", delay: 44 },
  { x: 75, y: 74, label: "24 MHz 晶振", delay: 56 },
  { x: 74, y: 92, label: "红/绿双色 LED", delay: 68 },
];

export const Scene2Hardware: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const boardSpring = spring({ frame: frame - 4, fps, config: SPRING_SMOOTH });

  return (
    <FrameChrome
      voiceover={VOICEOVER_DATA.scene2_hardware}
      sceneIndex={1}
      totalScenes={8}
      dark
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
        }}
      >
        {/* Left: PCB photo with dynamic technical callout pins */}
        <div
          style={{
            flex: "0 0 560px",
            position: "relative",
            height: 760,
            borderRadius: 24,
            overflow: "hidden",
            border: `2px solid ${THEME.darkBorder}`,
            boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
            transform: `scale(${interpolate(boardSpring, [0, 1], [0.95, 1])})`,
            opacity: boardSpring,
          }}
        >
          <Img
            src={staticFile("assets/board-front.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(17,19,23,0.18) 0%, rgba(17,19,23,0.05) 50%, rgba(17,19,23,0.35) 100%)",
            }}
          />
          {CALLOUTS.map((c) => {
            const s = spring({
              frame: frame - c.delay,
              fps,
              config: SPRING_SNAPPY,
            });
            return (
              <div
                key={c.label}
                style={{
                  position: "absolute",
                  left: `${c.x}%`,
                  top: `${c.y}%`,
                  transform: `translate(-50%, -50%) scale(${s})`,
                  opacity: s,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: THEME.red,
                    border: "3px solid #FFF",
                    boxShadow: `0 0 14px ${THEME.red}`,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    backgroundColor: "rgba(17,19,23,0.9)",
                    color: "#FFF",
                    padding: "5px 12px",
                    borderRadius: 8,
                    border: `1px solid ${THEME.red}`,
                    fontFamily: THEME.fontMono,
                    fontSize: 15,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Structured specs panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <div
              style={{
                fontFamily: THEME.fontMono,
                fontSize: 18,
                color: THEME.red,
                fontWeight: 700,
                letterSpacing: 1.5,
              }}
            >
              PCB SILKSCREEN · ZK_TESR21S_V2.1
            </div>
            <h2
              style={{
                margin: "6px 0 0",
                fontSize: 50,
                fontWeight: 900,
                color: "#FFF",
              }}
            >
              硬核硬件规格一览
            </h2>
          </div>

          {SPECS.map((spec, idx) => {
            const s = spring({
              frame: frame - (14 + idx * 14),
              fps,
              config: SPRING_SNAPPY,
            });
            return (
              <div
                key={spec.tag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  backgroundColor: THEME.darkCard,
                  border: `1px solid ${THEME.darkBorder}`,
                  borderLeft: `5px solid ${idx === 0 || idx === 3 ? THEME.red : "#4B5563"}`,
                  borderRadius: 14,
                  padding: "18px 24px",
                  transform: `translateX(${interpolate(s, [0, 1], [44, 0])}px)`,
                  opacity: s,
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor:
                      idx === 0 || idx === 3
                        ? "rgba(217,43,43,0.18)"
                        : "rgba(255,255,255,0.07)",
                    color: idx === 0 || idx === 3 ? "#FF6B6B" : "#D1D5DB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: THEME.fontMono,
                    fontSize: 18,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {spec.tag}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 25,
                      fontWeight: 800,
                      color: "#FFFFFF",
                    }}
                  >
                    {spec.title}
                  </div>
                  <div
                    style={{
                      fontSize: 19,
                      color: "#9CA3AF",
                      marginTop: 4,
                    }}
                  >
                    {spec.desc}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Hardware identification notice */}
          <div
            style={{
              marginTop: 4,
              padding: "12px 20px",
              borderRadius: 12,
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              color: "#FDE68A",
              fontSize: 17,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontFamily: THEME.fontMono, fontWeight: 800 }}>[核对同款]</span>
            <span>
              请确认外壳为 <code>AESL0213C-TLSR8250</code> 且主板丝印为 <code>ZK_TESR21S_V2.1</code>（不同批次/主控固件不通用）
            </span>
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
