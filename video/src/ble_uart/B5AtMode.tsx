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
import { BLE_UART_VOICEOVER } from "../bleUartVoiceoverData";
import { SPRING_SMOOTH, SPRING_SNAPPY, THEME } from "../theme";

const QUERY_CMDS = [
  { cmd: "AT", desc: "通信握手自检，返回 OK" },
  { cmd: "AT+HELP", desc: "打印完整 AT 指令帮助列表" },
  { cmd: "AT+INFO?", desc: "一次查询版本、MAC、名称、波特率、功率、MTU 与电压" },
  { cmd: "AT+VBAT?", desc: "片上 14-bit SAR ADC 实时采样供电电压 (mV)" },
];

export const B5AtMode: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const topSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const bottomSpring = spring({ frame: frame - 24, fps, config: SPRING_SMOOTH });

  return (
    <FrameChrome
      voiceover={BLE_UART_VOICEOVER.b5_at_mode}
      sceneIndex={5}
      totalScenes={9}
      dark
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 26,
        }}
      >
        {/* Top: AT Mode <-> Transparent Mode State Machine */}
        <div
          style={{
            opacity: topSpring,
            transform: `translateY(${interpolate(topSpring, [0, 1], [24, 0])}px)`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
            <div>
              <span style={{ fontFamily: THEME.fontMono, fontSize: 16, fontWeight: 800, color: THEME.red }}>
                AT COMMAND GUIDE PART 1 · MODE SWITCHING
              </span>
              <h2 style={{ margin: "4px 0 0", fontSize: 42, fontWeight: 900, color: "#FFF" }}>
                AT 模式切换机制与状态查询
              </h2>
            </div>
            <span
              style={{
                fontFamily: THEME.fontMono,
                fontSize: 16,
                backgroundColor: "rgba(245,158,11,0.16)",
                color: "#FDE68A",
                border: "1px solid rgba(245,158,11,0.4)",
                padding: "7px 14px",
                borderRadius: 8,
                fontWeight: 700,
              }}
            >
              指令统一以 \r\n 结尾
            </span>
          </div>

          <div
            style={{
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderRadius: 18,
              padding: "22px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            {/* State 1: AT Mode */}
            <div
              style={{
                flex: 1,
                backgroundColor: "rgba(34,197,94,0.12)",
                border: `2px solid ${THEME.green}`,
                borderRadius: 14,
                padding: "16px 20px",
              }}
            >
              <div style={{ fontFamily: THEME.fontMono, fontSize: 22, fontWeight: 900, color: THEME.green }}>
                AT 指令模式
              </div>
              <div style={{ fontSize: 17, color: "#E5E7EB", marginTop: 6 }}>
                未连接 BLE 时<strong>默认进入</strong>；串口直接解析 AT 指令
              </div>
            </div>

            {/* Bidirectional Transition Arrows */}
            <div
              style={{
                flex: "0 0 430px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                textAlign: "center",
                fontFamily: THEME.fontMono,
              }}
            >
              <div
                style={{
                  backgroundColor: "rgba(59,130,246,0.16)",
                  border: `1px solid ${THEME.blue}`,
                  color: "#93C5FD",
                  padding: "7px 12px",
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                蓝牙建立连接 / 发 AT+EXIT ──▶
              </div>
              <div
                style={{
                  backgroundColor: "rgba(217,43,43,0.18)",
                  border: `1px solid ${THEME.red}`,
                  color: "#FCA5A5",
                  padding: "7px 12px",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                ◀── 发 +++ (≥15ms) 或 PA0 接地拉低
              </div>
            </div>

            {/* State 2: Transparent Mode */}
            <div
              style={{
                flex: 1,
                backgroundColor: "rgba(59,130,246,0.12)",
                border: `2px solid ${THEME.blue}`,
                borderRadius: 14,
                padding: "16px 20px",
              }}
            >
              <div style={{ fontFamily: THEME.fontMono, fontSize: 22, fontWeight: 900, color: "#93C5FD" }}>
                纯透传模式
              </div>
              <div style={{ fontSize: 17, color: "#E5E7EB", marginTop: 6 }}>
                已连接 BLE 时<strong>自动切换</strong>；所有字节原样双向转发
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Query Commands + Real AT Console Screenshot */}
        <div
          style={{
            display: "flex",
            gap: 32,
            flex: 1,
            maxHeight: 455,
            opacity: bottomSpring,
            transform: `translateY(${interpolate(bottomSpring, [0, 1], [24, 0])}px)`,
          }}
        >
          {/* Left: 4 Query Commands */}
          <div style={{ flex: "1.05", display: "flex", flexDirection: "column", gap: 12 }}>
            {QUERY_CMDS.map((item, idx) => {
              const s = spring({ frame: frame - (30 + idx * 12), fps, config: SPRING_SNAPPY });
              return (
                <div
                  key={item.cmd}
                  style={{
                    backgroundColor: THEME.darkCard,
                    border: `1px solid ${THEME.darkBorder}`,
                    borderLeft: `5px solid ${idx >= 2 ? THEME.red : THEME.green}`,
                    borderRadius: 14,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    opacity: s,
                    transform: `translateX(${interpolate(s, [0, 1], [-24, 0])}px)`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: THEME.fontMono,
                      fontSize: 20,
                      fontWeight: 900,
                      color: idx >= 2 ? "#FCA5A5" : THEME.green,
                      backgroundColor: "rgba(0,0,0,0.35)",
                      padding: "8px 14px",
                      borderRadius: 8,
                      minWidth: 150,
                      textAlign: "center",
                    }}
                  >
                    {item.cmd}
                  </span>
                  <span style={{ fontSize: 19, color: "#E5E7EB", fontWeight: 600 }}>
                    {item.desc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right: Real AT+INFO? & AT+VBAT? Screenshot Reference */}
          <div
            style={{
              flex: "0.95",
              backgroundColor: THEME.darkCard,
              border: `2px solid ${THEME.darkBorder}`,
              borderRadius: 18,
              overflow: "hidden",
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                backgroundColor: "#0D1016",
                display: "flex",
                justifyContent: "space-between",
                fontFamily: THEME.fontMono,
                fontSize: 14,
                color: "#9CA3AF",
              }}
            >
              <span>实机截图参考 · AT+INFO? &amp; AT+VBAT?</span>
              <span style={{ color: THEME.green, fontWeight: 800 }}>实测 VBAT: 2945mV · MTU: 247</span>
            </div>
            <Img
              src={staticFile("demos/ble_uart/console_at_shot.jpg")}
              style={{
                width: "100%",
                flex: 1,
                objectFit: "cover",
                objectPosition: "center top",
              }}
            />
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
