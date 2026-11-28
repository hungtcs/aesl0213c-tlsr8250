import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FrameChrome } from "../components/FrameChrome";
import { BLE_UART_VOICEOVER } from "../bleUartVoiceoverData";
import { SPRING_SMOOTH, SPRING_SNAPPY, THEME } from "../theme";

export const B2Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const rightSpring = spring({ frame: frame - 20, fps, config: SPRING_SNAPPY });

  return (
    <FrameChrome
      voiceover={BLE_UART_VOICEOVER.b2_flash}
      sceneIndex={1}
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
        {/* Left: Two Flashing Methods */}
        <div
          style={{
            flex: "1.12",
            display: "flex",
            flexDirection: "column",
            gap: 22,
            opacity: leftSpring,
            transform: `translateX(${interpolate(leftSpring, [0, 1], [-36, 0])}px)`,
          }}
        >
          <div>
            <span style={{ fontFamily: THEME.fontMono, fontSize: 16, fontWeight: 800, color: THEME.red }}>
              STEP 1 · FLASH FIRMWARE VIA SWS
            </span>
            <h2 style={{ margin: "6px 0 0", fontSize: 44, fontWeight: 900, color: "#FFF" }}>
              先把透传固件刷进板子
            </h2>
          </div>

          {/* Method A: Prebuilt Binary */}
          <div
            style={{
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderTop: `4px solid ${THEME.green}`,
              borderRadius: 18,
              padding: "22px 26px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: "#FFF" }}>
                方式 A · 直接刷预编译固件（最省事）
              </span>
              <span
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 14,
                  color: THEME.green,
                  backgroundColor: "rgba(34,197,94,0.16)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontWeight: 800,
                }}
              >
                免装编译工具链
              </span>
            </div>
            <div
              style={{
                backgroundColor: "#0B0D12",
                borderRadius: 12,
                padding: "14px 18px",
                fontFamily: THEME.fontMono,
                fontSize: 17,
                lineHeight: 1.75,
                color: "#E5E7EB",
              }}
            >
              <div>
                <span style={{ color: THEME.green }}>$</span> ./scripts/backup.sh{" "}
                <span style={{ color: "#6B7280" }}># 首次刷机先备份原厂固件</span>
              </div>
              <div>
                <span style={{ color: THEME.green }}>$</span> ./scripts/flash.sh firmware/ble_uart_bridge.bin
              </div>
            </div>
            <div style={{ fontSize: 17, color: "#9CA3AF", marginTop: 10 }}>
              或者直接打开 <code style={{ color: "#93C5FD", fontFamily: THEME.fontMono }}>GitHub Pages</code> 在线页面（<code style={{ color: "#93C5FD", fontFamily: THEME.fontMono }}>sws_flasher.html</code>），免装环境直接刷写{" "}
              <code style={{ color: "#FCA5A5", fontFamily: THEME.fontMono }}>ble_uart_bridge.bin</code>。
            </div>
          </div>

          {/* Method B: Build & Flash from Source */}
          <div
            style={{
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderTop: `4px solid ${THEME.blue}`,
              borderRadius: 18,
              padding: "22px 26px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: "#FFF" }}>
                方式 B · 源码一键编译并烧录
              </span>
              <span
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 14,
                  color: "#93C5FD",
                  backgroundColor: "rgba(59,130,246,0.16)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontWeight: 800,
                }}
              >
                内置 BLE 5.0 SDK
              </span>
            </div>
            <div
              style={{
                backgroundColor: "#0B0D12",
                borderRadius: 12,
                padding: "14px 18px",
                fontFamily: THEME.fontMono,
                fontSize: 18,
                color: "#93C5FD",
              }}
            >
              <span style={{ color: THEME.green }}>$</span> make -C examples/03_ble_uart_bridge flash-sws
            </div>
          </div>
        </div>

        {/* Right: Quick SWS Reminder + Previous Episode Pointer */}
        <div
          style={{
            flex: "0.88",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            opacity: rightSpring,
            transform: `translateX(${interpolate(rightSpring, [0, 1], [36, 0])}px)`,
          }}
        >
          <div
            style={{
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderRadius: 20,
              padding: "26px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, color: "#FFF" }}>
              SWS 单线烧录接线速览
            </div>
            <div style={{ fontSize: 16, color: "#9CA3AF" }}>
              仅需普通 CH343 / CH340 串口模块 + 1 颗 1kΩ 电阻：
            </div>

            {[
              ["TX", "串 1kΩ 电阻 → 价签 SWS"],
              ["RX", "并联电阻板侧 → 价签 SWS"],
              ["GND", "直连价签 GND 共地"],
              ["RTS", "直连 3V3 自动控电复位"],
            ].map(([pin, desc]) => (
              <div
                key={pin}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  padding: "12px 16px",
                  borderRadius: 10,
                  fontFamily: THEME.fontMono,
                  fontSize: 17,
                }}
              >
                <span
                  style={{
                    minWidth: 56,
                    textAlign: "center",
                    backgroundColor: "rgba(217,43,43,0.22)",
                    color: "#FCA5A5",
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
          </div>

          <div
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              border: "1.5px solid rgba(245, 158, 11, 0.45)",
              borderRadius: 18,
              padding: "20px 24px",
              color: "#FDE68A",
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1.55,
            }}
          >
            📺 详细的 1kΩ 电阻单线接线图、原厂固件备份与救砖还原教程，可以直接看上一期视频！
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
