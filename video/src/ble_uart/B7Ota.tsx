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

const FLASH_MAP = [
  { addr: "0x00000 .. 0x3FFFF", label: "当前运行固件区 (256 KB)", color: "#3B82F6", flex: 4 },
  { addr: "0x40000 .. 0x73FFF", label: "BLE OTA 写入区 (208 KB)", color: THEME.red, flex: 3.3 },
  { addr: "0x76000", label: "原厂 MAC 保护区", color: THEME.green, flex: 1.2 },
  { addr: "0x7A000", label: "AT 配置区", color: THEME.amber, flex: 1.2 },
];

export const B7Ota: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const rightSpring = spring({ frame: frame - 18, fps, config: SPRING_SNAPPY });

  return (
    <FrameChrome
      voiceover={BLE_UART_VOICEOVER.b7_ota}
      sceneIndex={7}
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
        {/* Left: Flash Safety Layout + OTA Workflow */}
        <div
          style={{
            flex: "1.02",
            display: "flex",
            flexDirection: "column",
            gap: 22,
            opacity: leftSpring,
            transform: `translateX(${interpolate(leftSpring, [0, 1], [-36, 0])}px)`,
          }}
        >
          <div>
            <span style={{ fontFamily: THEME.fontMono, fontSize: 16, fontWeight: 800, color: THEME.red }}>
              WIRELESS UPGRADE · web/ble_ota.html
            </span>
            <h2 style={{ margin: "6px 0 0", fontSize: 44, fontWeight: 900, color: "#FFF" }}>
              浏览器 Web Bluetooth 无线 OTA
            </h2>
          </div>

          {/* 512KB Flash Safety Partition Map */}
          <div
            style={{
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderRadius: 18,
              padding: "22px 24px",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#FFF", marginBottom: 14 }}>
              512 KB Flash 安全分区保护
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FLASH_MAP.map((sec, idx) => {
                const s = spring({ frame: frame - (18 + idx * 10), fps, config: SPRING_SNAPPY });
                return (
                  <div
                    key={sec.addr}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      borderLeft: `6px solid ${sec.color}`,
                      borderRadius: 10,
                      padding: "12px 16px",
                      opacity: s,
                    }}
                  >
                    <span style={{ fontFamily: THEME.fontMono, fontSize: 17, fontWeight: 800, color: "#FFF" }}>
                      {sec.addr}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#D1D5DB" }}>{sec.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3-Step Wireless OTA */}
          <div
            style={{
              backgroundColor: "rgba(34,197,94,0.1)",
              border: `1px solid rgba(34,197,94,0.35)`,
              borderRadius: 16,
              padding: "18px 22px",
              fontSize: 18,
              color: "#D1FAE5",
              lineHeight: 1.65,
            }}
          >
            <div><strong>① 打开</strong> <code>http://localhost:8080/ble_ota.html</code> 连接 <code>ZK_UART_xxxx</code></div>
            <div><strong>② 选择</strong> 新编译的 <code>.bin</code> 固件，点击 Start DFU 开始无线写入</div>
            <div><strong>③ 观察</strong> 板子红绿灯交替快闪，100% 校验通过后自动切换新固件重启</div>
          </div>
        </div>

        {/* Right: Stacked 5.5x Fast-Forward OTA Screen + Red/Green Fast Blink LED */}
        <div
          style={{
            flex: "0.98",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            opacity: rightSpring,
            transform: `scale(${interpolate(rightSpring, [0, 1], [0.95, 1])})`,
          }}
        >
          {/* Top Video: Fast-forward browser OTA */}
          <div
            style={{
              height: 410,
              borderRadius: 18,
              overflow: "hidden",
              border: `2px solid ${THEME.red}`,
              backgroundColor: "#F3F4F6",
              position: "relative",
              boxShadow: "0 18px 42px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 12,
                zIndex: 5,
                backgroundColor: THEME.red,
                color: "#FFF",
                padding: "4px 12px",
                borderRadius: 8,
                fontFamily: THEME.fontMono,
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              5.5× 快进参考 · ble_ota.html
            </div>
            <Loop durationInFrames={235}>
              <OffthreadVideo
                src={staticFile("demos/ble_uart/ota_fast.mp4")}
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  backgroundColor: "#F3F4F6",
                  display: "block",
                }}
              />
            </Loop>
          </div>

          {/* Bottom Video: Red/Green Alternating Blink during OTA */}
          <div
            style={{
              height: 270,
              borderRadius: 18,
              overflow: "hidden",
              border: `2px solid ${THEME.amber}`,
              backgroundColor: "#000",
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
                color: "#FDE68A",
                padding: "4px 12px",
                borderRadius: 8,
                fontFamily: THEME.fontMono,
                fontSize: 14,
                fontWeight: 800,
                border: `1px solid ${THEME.amber}`,
              }}
            >
              实拍参考 · OTA 写入中红绿交替快闪
            </div>
            <Loop durationInFrames={125}>
              <OffthreadVideo
                src={staticFile("demos/ble_uart/led_ota.mp4")}
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
