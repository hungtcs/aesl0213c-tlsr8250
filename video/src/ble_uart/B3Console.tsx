import React from "react";
import {
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

const CORE_SPECS = [
  {
    tag: "MTU 247B",
    title: "大包高速传输 + DLE",
    desc: "自动协商 ATT MTU 至 247 字节，单包有效负载最高 244 字节",
  },
  {
    tag: "1KB RING",
    title: "UART 环形缓冲 + 15ms 组帧",
    desc: "满包立即发或 15ms 空闲超时自动打包，避免拆包粘包错乱",
  },
  {
    tag: "BACKPRESSURE",
    title: "BLE TX FIFO 背压重试队列",
    desc: "蓝牙发送忙时自动排队重试，高速连续发送不丢字节",
  },
  {
    tag: "WEB CONSOLE",
    title: "同页双通道对照调试",
    desc: "左侧 Web Bluetooth + 右侧 Web Serial，内置 ASCII/HEX 与 100B 长包测试",
  },
];

export const B3Console: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const rightSpring = spring({ frame: frame - 18, fps, config: SPRING_SMOOTH });

  return (
    <FrameChrome
      voiceover={BLE_UART_VOICEOVER.b3_console}
      sceneIndex={3}
      totalScenes={9}
      dark
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 44,
        }}
      >
        {/* Left: Core throughput architecture specs */}
        <div
          style={{
            flex: "0.95",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            opacity: leftSpring,
            transform: `translateX(${interpolate(leftSpring, [0, 1], [-36, 0])}px)`,
          }}
        >
          <div>
            <span style={{ fontFamily: THEME.fontMono, fontSize: 16, fontWeight: 800, color: THEME.red }}>
              THROUGHPUT ARCHITECTURE · web/ble_uart_console.html
            </span>
            <h2 style={{ margin: "6px 0 0", fontSize: 44, fontWeight: 900, color: "#FFF" }}>
              稳定不丢包的透传内核
            </h2>
          </div>

          {CORE_SPECS.map((sp, idx) => {
            const s = spring({ frame: frame - (16 + idx * 12), fps, config: SPRING_SNAPPY });
            return (
              <div
                key={sp.tag}
                style={{
                  backgroundColor: THEME.darkCard,
                  border: `1px solid ${THEME.darkBorder}`,
                  borderLeft: `5px solid ${idx === 0 ? THEME.red : idx === 3 ? THEME.blue : THEME.green}`,
                  borderRadius: 14,
                  padding: "16px 20px",
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [18, 0])}px)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontFamily: THEME.fontMono,
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#FFF",
                      backgroundColor: "rgba(255,255,255,0.1)",
                      padding: "3px 9px",
                      borderRadius: 6,
                    }}
                  >
                    {sp.tag}
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#FFF" }}>{sp.title}</span>
                </div>
                <div style={{ fontSize: 17, color: "#9CA3AF", marginTop: 6 }}>{sp.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Right: Browser Console Real Demo Clip */}
        <div
          style={{
            flex: "1.05",
            display: "flex",
            flexDirection: "column",
            opacity: rightSpring,
            transform: `scale(${interpolate(rightSpring, [0, 1], [0.95, 1])})`,
          }}
        >
          <div
            style={{
              backgroundColor: "#1B1F27",
              borderRadius: 20,
              overflow: "hidden",
              border: `2px solid ${THEME.blue}`,
              boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Browser chrome header */}
            <div
              style={{
                padding: "12px 18px",
                backgroundColor: "#0F1218",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: `1px solid ${THEME.darkBorder}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: "#EF4444" }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: "#22C55E" }} />
                <span style={{ fontFamily: THEME.fontMono, fontSize: 15, color: "#93C5FD", marginLeft: 8 }}>
                  localhost:8080/ble_uart_console.html
                </span>
              </div>
              <span
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 13,
                  backgroundColor: "rgba(34,197,94,0.18)",
                  color: THEME.green,
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontWeight: 700,
                }}
              >
                实机双向透传参考
              </span>
            </div>

            <div style={{ position: "relative", width: "100%", height: 610, backgroundColor: "#0B0E14" }}>
              <Loop durationInFrames={290}>
                <OffthreadVideo
                  src={staticFile("demos/ble_uart/console_bridge.mp4")}
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </Loop>
            </div>
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
