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
import { SPRING_SMOOTH, THEME } from "../theme";

export const B8Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const rightSpring = spring({ frame: frame - 18, fps, config: SPRING_SMOOTH });

  return (
    <FrameChrome
      voiceover={BLE_UART_VOICEOVER.b8_outro}
      sceneIndex={8}
      totalScenes={9}
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
        {/* Left: 3-Step Quick Start Commands */}
        <div
          style={{
            flex: "1.02",
            display: "flex",
            flexDirection: "column",
            gap: 22,
            opacity: leftSpring,
            transform: `translateX(${interpolate(leftSpring, [0, 1], [-40, 0])}px)`,
          }}
        >
          <div>
            <span style={{ fontFamily: THEME.fontMono, fontSize: 16, fontWeight: 800, color: THEME.red }}>
              QUICK REPRODUCE · 3 STEPS
            </span>
            <h2 style={{ margin: "6px 0 0", fontSize: 44, fontWeight: 900, color: THEME.ink }}>
              三步上手蓝牙 5.0 串口透传
            </h2>
          </div>

          <div
            style={{
              backgroundColor: THEME.ink,
              color: "#FFF",
              borderRadius: 20,
              padding: "24px 28px",
              fontFamily: THEME.fontMono,
              fontSize: 19,
              lineHeight: 1.85,
              boxShadow: "0 14px 36px rgba(0,0,0,0.14)",
            }}
          >
            <div style={{ color: "#9CA3AF", fontSize: 15 }}># 1. 编译并 SWS 一键烧录（或直接刷 firmware/ble_uart_bridge.bin）</div>
            <div style={{ color: THEME.green }}>$ make -C examples/03_ble_uart_bridge flash-sws</div>

            <div style={{ color: "#9CA3AF", fontSize: 15, marginTop: 14 }}># 2. 直接访问 GitHub Pages 在线工具（或本地 ./scripts/serve_web.sh）</div>
            <div style={{ color: "#93C5FD" }}>https://hungtcs.github.io/aesl0213c-tlsr8250/</div>

            <div style={{ color: "#9CA3AF", fontSize: 15, marginTop: 14 }}># 3. Chrome / Edge 打开双通道控制台或无线 OTA</div>
            <div style={{ color: "#FCA5A5" }}>.../ble_uart_console.html  |  .../ble_ota.html</div>
          </div>

          <div
            style={{
              backgroundColor: THEME.paperCard,
              border: `2px solid ${THEME.paperBorder}`,
              borderRadius: 16,
              padding: "18px 22px",
              fontSize: 19,
              color: THEME.inkSoft,
              lineHeight: 1.55,
            }}
          >
            完整 AT 指令对照表、双 GATT 服务 UUID 与编译指南均已写在{" "}
            <strong style={{ fontFamily: THEME.fontMono, color: THEME.ink }}>
              examples/03_ble_uart_bridge/README.md
            </strong>
            。
          </div>
        </div>

        {/* Right: Pure Open Source Card + QR + Author + Credits */}
        <div
          style={{
            flex: "0.98",
            backgroundColor: THEME.ink,
            color: "#FFF",
            borderRadius: 28,
            padding: "36px 40px",
            border: `4px solid ${THEME.ink}`,
            boxShadow: `16px 16px 0 ${THEME.red}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 650,
            opacity: rightSpring,
            transform: `scale(${interpolate(rightSpring, [0, 1], [0.93, 1])})`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "inline-block",
                  backgroundColor: THEME.red,
                  color: "#FFF",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontFamily: THEME.fontMono,
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                OPEN SOURCE REPOSITORY
              </div>
              <div
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 36,
                  fontWeight: 900,
                  marginTop: 16,
                  lineHeight: 1.15,
                }}
              >
                03_ble_uart
                <br />
                <span style={{ color: "#FF6B6B" }}>_bridge</span>
              </div>
              <div style={{ fontSize: 18, color: "#D1D5DB", marginTop: 12, lineHeight: 1.5 }}>
                预编译固件 · Web 控制台 · AT 文档 · 内置 Telink BLE 5.0 SDK
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#FFFFFF",
                padding: 12,
                borderRadius: 16,
                border: `3px solid ${THEME.red}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <Img
                src={staticFile("assets/github-qr.svg")}
                style={{ width: 152, height: 152, display: "block" }}
              />
              <span style={{ fontFamily: THEME.fontMono, fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                GitHub 仓库直达
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "14px 18px",
                fontFamily: THEME.fontMono,
                fontSize: 17,
                color: "#93C5FD",
              }}
            >
              <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4 }}>GitHub Repository</div>
              https://github.com/hungtcs/aesl0213c-tlsr8250
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                backgroundColor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 14,
                padding: "14px 18px",
              }}
            >
              <Img
                src={staticFile("avatar.jpg")}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `2.5px solid ${THEME.red}`,
                  flexShrink: 0,
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: THEME.fontMono, fontSize: 22, fontWeight: 900, color: "#FFF" }}>
                    hungtcs
                  </span>
                  <span
                    style={{
                      fontFamily: THEME.fontMono,
                      fontSize: 13,
                      backgroundColor: "rgba(217,43,43,0.22)",
                      color: "#FCA5A5",
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontWeight: 700,
                    }}
                  >
                    Bilibili UP
                  </span>
                </div>
                <div style={{ fontFamily: THEME.fontMono, fontSize: 15, color: "#D1D5DB" }}>
                  https://space.bilibili.com/25043249
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.14)",
              fontSize: 14,
              color: "#9CA3AF",
              lineHeight: 1.55,
            }}
          >
            <span style={{ fontFamily: THEME.fontMono, color: "#D1D5DB", fontWeight: 700 }}>Credits: </span>
            atc1441 (ATC_TLSR_Paper / BLE_EPaper_OTA) · pvvx (TlsrComSwireWriter)
            <br />
            P.S. 本视频同样由 Remotion 代码生成，源码就在仓库{" "}
            <span style={{ fontFamily: THEME.fontMono, color: "#FCA5A5" }}>video/</span> 目录一起开源。
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
