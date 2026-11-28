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

const HIGHLIGHTS = [
  { label: "MTU 247B · DLE", color: THEME.red },
  { label: "NUS + 0xFFE0 双服务", color: THEME.ink },
  { label: "完整 AT 指令 + CRC16", color: THEME.inkSoft },
  { label: "Web Bluetooth 无线 OTA", color: THEME.blue },
];

export const B1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgSpring = spring({ frame: frame - 8, fps, config: SPRING_SNAPPY });
  const titleSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });

  return (
    <FrameChrome
      voiceover={BLE_UART_VOICEOVER.b1_intro}
      sceneIndex={0}
      totalScenes={9}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 56,
        }}
      >
        {/* Left: Real hardware setup photo + HC-06 comparison card */}
        <div
          style={{
            flex: "0 0 660px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            opacity: imgSpring,
            transform: `scale(${interpolate(imgSpring, [0, 1], [0.94, 1])})`,
          }}
        >
          <div
            style={{
              borderRadius: 24,
              overflow: "hidden",
              border: `3px solid ${THEME.ink}`,
              boxShadow: "14px 14px 0 rgba(20,20,22,0.14)",
              backgroundColor: "#FFF",
              position: "relative",
            }}
          >
            <Img
              src={staticFile("demos/ble_uart/wiring_annotated.png")}
              style={{
                width: "100%",
                height: 440,
                objectFit: "cover",
                display: "block",
              }}
            />
            <div
              style={{
                backgroundColor: THEME.ink,
                color: "#FFF",
                padding: "12px 22px",
                display: "flex",
                justifyContent: "space-between",
                fontFamily: THEME.fontMono,
                fontSize: 16,
              }}
            >
              <span>examples/03_ble_uart_bridge</span>
              <span style={{ color: THEME.green, fontWeight: 700 }}>BLE 5.0 ↔ UART</span>
            </div>
          </div>

          {/* HC-06 vs TLSR8250 comparison strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              backgroundColor: THEME.paperCard,
              border: `2px solid ${THEME.paperBorder}`,
              borderRadius: 18,
              padding: "12px 18px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
            }}
          >
            <Img
              src={staticFile("demos/ble_uart/hc06_compare.png")}
              style={{
                width: 120,
                height: 82,
                objectFit: "contain",
                backgroundColor: "#FFF",
                borderRadius: 10,
                border: `1px solid ${THEME.paperBorder}`,
                padding: 4,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 19, fontWeight: 900, color: THEME.ink }}>
                平替传统 HC-06 / HM-10 透传模块
              </div>
              <div style={{ fontSize: 16, color: THEME.inkMuted, marginTop: 4 }}>
                支持 BLE 5.0 · 247B 大 MTU · 14-bit 电压采样 · 浏览器无线 OTA
              </div>
            </div>
          </div>
        </div>

        {/* Right: Hero headline */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 24,
            opacity: titleSpring,
            transform: `translateX(${interpolate(titleSpring, [0, 1], [44, 0])}px)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                backgroundColor: THEME.red,
                color: "#FFF",
                padding: "7px 16px",
                borderRadius: 8,
                fontFamily: THEME.fontMono,
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              实机演示 &amp; AT 指令精讲
            </span>
            <span style={{ fontFamily: THEME.fontMono, fontSize: 17, color: THEME.inkMuted, fontWeight: 700 }}>
              firmware/ble_uart_bridge.bin
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 70,
              fontWeight: 900,
              lineHeight: 1.12,
              color: THEME.ink,
            }}
          >
            BLE 5.0 串口透传
            <br />
            <span style={{ color: THEME.red }}>完整实战与 AT 教程</span>
          </h1>

          <p style={{ margin: 0, fontSize: 26, lineHeight: 1.5, color: THEME.inkSoft }}>
            买到一块<strong>屏幕损坏的 2.13&quot; 墨水屏价签</strong>？别扔！
            <br />
            刷入开源透传固件，直接变身<strong>低功耗蓝牙 5.0 串口透传模块</strong>。
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 4 }}>
            {HIGHLIGHTS.map((h, idx) => {
              const s = spring({ frame: frame - (20 + idx * 8), fps, config: SPRING_SNAPPY });
              return (
                <div
                  key={h.label}
                  style={{
                    backgroundColor: h.color,
                    color: "#FFF",
                    padding: "12px 20px",
                    borderRadius: 12,
                    fontFamily: THEME.fontMono,
                    fontSize: 19,
                    fontWeight: 800,
                    opacity: s,
                    transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
                  }}
                >
                  {h.label}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "10px 18px",
              backgroundColor: THEME.paperCard,
              border: `1.5px solid ${THEME.paperBorder}`,
              borderRadius: 14,
              width: "fit-content",
            }}
          >
            <Img
              src={staticFile("avatar.jpg")}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                objectFit: "cover",
                border: `2px solid ${THEME.red}`,
              }}
            />
            <div style={{ fontFamily: THEME.fontMono, fontSize: 16, fontWeight: 700, color: THEME.ink }}>
              hungtcs · Bilibili UID 25043249 · github.com/hungtcs/aesl0213c-tlsr8250
            </div>
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
