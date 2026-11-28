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

export const B4Mobile: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const phoneSpring = spring({ frame: frame - 18, fps, config: SPRING_SNAPPY });

  return (
    <FrameChrome
      voiceover={BLE_UART_VOICEOVER.b4_mobile}
      sceneIndex={4}
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
        {/* Left: Dual GATT Services Specification */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 22,
            opacity: leftSpring,
            transform: `translateX(${interpolate(leftSpring, [0, 1], [-40, 0])}px)`,
          }}
        >
          <div>
            <span style={{ fontFamily: THEME.fontMono, fontSize: 16, fontWeight: 800, color: THEME.red }}>
              DUAL GATT SERVICES · ZERO CUSTOM APP NEEDED
            </span>
            <h2 style={{ margin: "6px 0 0", fontSize: 48, fontWeight: 900, color: THEME.ink }}>
              双通用蓝牙服务 · 手机直连
            </h2>
          </div>

          {/* Service 1: Nordic NUS */}
          <div
            style={{
              backgroundColor: THEME.paperCard,
              border: `2px solid ${THEME.paperBorder}`,
              borderLeft: `6px solid ${THEME.red}`,
              borderRadius: 18,
              padding: "22px 26px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 25, fontWeight: 900, color: THEME.ink }}>
                1. Nordic UART Service (NUS)
              </span>
              <span
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 14,
                  backgroundColor: THEME.redSoft,
                  color: THEME.red,
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontWeight: 800,
                }}
              >
                128-bit UUID
              </span>
            </div>
            <div style={{ fontFamily: THEME.fontMono, fontSize: 16, color: THEME.inkSoft, marginTop: 12, lineHeight: 1.75 }}>
              <div>Service: <strong>6E400001</strong>-B5A3-F393-E0A9-E50E24DCCA9E</div>
              <div>RX (写): <strong>6E400002</strong> · Write / WriteWithoutRsp</div>
              <div>TX (收): <strong>6E400003</strong> · Notify / Read</div>
            </div>
          </div>

          {/* Service 2: 0xFFE0 */}
          <div
            style={{
              backgroundColor: THEME.paperCard,
              border: `2px solid ${THEME.paperBorder}`,
              borderLeft: `6px solid ${THEME.blue}`,
              borderRadius: 18,
              padding: "22px 26px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 25, fontWeight: 900, color: THEME.ink }}>
                2. 通用 16-bit 透传服务（兼容 HM-10）
              </span>
              <span
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 14,
                  backgroundColor: "rgba(59,130,246,0.14)",
                  color: THEME.blue,
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontWeight: 800,
                }}
              >
                通用手机串口 App
              </span>
            </div>
            <div style={{ fontFamily: THEME.fontMono, fontSize: 17, color: THEME.inkSoft, marginTop: 12, lineHeight: 1.7 }}>
              <div>Service: <strong>0xFFE0</strong> · 读写通知特征: <strong>0xFFE1</strong></div>
            </div>
          </div>

          {/* Unique MAC Naming */}
          <div
            style={{
              backgroundColor: THEME.ink,
              color: "#FFF",
              borderRadius: 16,
              padding: "18px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>自动读取 Flash 0x76000 原厂唯一 MAC</div>
              <div style={{ fontSize: 16, color: "#9CA3AF", marginTop: 4 }}>
                多块板子同时上电也不会重名冲突
              </div>
            </div>
            <div
              style={{
                fontFamily: THEME.fontMono,
                fontSize: 22,
                fontWeight: 900,
                color: THEME.green,
                backgroundColor: "rgba(34,197,94,0.14)",
                padding: "8px 16px",
                borderRadius: 10,
              }}
            >
              ZK_UART_A49F
            </div>
          </div>
        </div>

        {/* Right: Smartphone Mockup with Real Android Demo Clip */}
        <div
          style={{
            flex: "0 0 430px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            opacity: phoneSpring,
            transform: `scale(${interpolate(phoneSpring, [0, 1], [0.92, 1])})`,
          }}
        >
          <div
            style={{
              width: 360,
              height: 750,
              borderRadius: 42,
              backgroundColor: "#111318",
              border: `6px solid ${THEME.ink}`,
              boxShadow: "18px 18px 0 rgba(20,20,22,0.16)",
              padding: 12,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 30,
                overflow: "hidden",
                backgroundColor: "#000",
              }}
            >
              <Loop durationInFrames={290}>
                <OffthreadVideo
                  src={staticFile("demos/ble_uart/android_demo.mp4")}
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </Loop>
            </div>
          </div>
          <span style={{ fontFamily: THEME.fontMono, fontSize: 16, fontWeight: 700, color: THEME.inkMuted }}>
            Android 实机蓝牙串口收发参考
          </span>
        </div>
      </div>
    </FrameChrome>
  );
};
