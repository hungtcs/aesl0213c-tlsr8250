import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FrameChrome } from "../components/FrameChrome";
import { SPRING_SMOOTH, SPRING_SNAPPY, THEME } from "../theme";
import { VOICEOVER_DATA } from "../voiceoverData";

const AT_LOGS = [
  { frame: 18, cmd: "AT+INFO?", res: "FW=v1.0 MAC=A4:C1:38:CD:A4:9F MTU=247" },
  { frame: 55, cmd: "AT+VBAT?", res: "+VBAT: 3042 mV (14-bit SAR ADC)" },
  { frame: 92, cmd: "AT+TXPWR=4", res: "OK (+10.3 dBm · Saved to Flash 0x7A000)" },
  { frame: 128, cmd: "AT+BAUD=230400", res: "OK (PC2/PC3 Hardware UART + 1KB RingBuf)" },
];

export const Scene6BleUart: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const archSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const termSpring = spring({ frame: frame - 22, fps, config: SPRING_SNAPPY });
  const otaSpring = spring({ frame: frame - 42, fps, config: SPRING_SNAPPY });

  const otaPct = Math.round(
    interpolate(frame, [110, 260], [12, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const packetX = (frame * 4) % 100;

  return (
    <FrameChrome
      voiceover={VOICEOVER_DATA.scene6_ble_uart}
      sceneIndex={5}
      totalScenes={8}
      dark
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 30,
        }}
      >
        {/* Header + Dataflow Architecture Bar */}
        <div
          style={{
            opacity: archSpring,
            transform: `translateY(${interpolate(archSpring, [0, 1], [24, 0])}px)`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
            <div>
              <span
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 16,
                  fontWeight: 800,
                  color: THEME.red,
                }}
              >
                USE CASE #2 · examples/03_ble_uart_bridge/
              </span>
              <h2 style={{ margin: "4px 0 0", fontSize: 44, fontWeight: 900, color: "#FFF" }}>
                正式版 BLE 5.0 串口透传 + 无线 OTA
              </h2>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {["MTU 247B", "NUS + 0xFFE0", "WDT 2000ms"].map((t) => (
                <span
                  key={t}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: `1px solid ${THEME.darkBorder}`,
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontFamily: THEME.fontMono,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#E5E7EB",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* 3-Node Architecture Flow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderRadius: 18,
              padding: "22px 32px",
            }}
          >
            {[
              { title: "手机 / 网页控制台", sub: "ble_uart_console.html (Web BLE)" },
              { title: "TLSR8250 透传核", sub: "1KB 环形缓冲 · CRC16 配置存储" },
              { title: "目标外设 / MCU", sub: "PC2 TX / PC3 RX · 最高 230400 bps" },
            ].map((node, i) => (
              <React.Fragment key={node.title}>
                <div
                  style={{
                    backgroundColor: i === 1 ? "rgba(217,43,43,0.16)" : "rgba(255,255,255,0.04)",
                    border: `2px solid ${i === 1 ? THEME.red : THEME.darkBorder}`,
                    borderRadius: 14,
                    padding: "16px 24px",
                    minWidth: 370,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 23, fontWeight: 800, color: "#FFF" }}>{node.title}</div>
                  <div style={{ fontFamily: THEME.fontMono, fontSize: 15, color: "#9CA3AF", marginTop: 6 }}>
                    {node.sub}
                  </div>
                </div>
                {i < 2 && (
                  <div style={{ flex: 1, height: 4, backgroundColor: THEME.darkBorder, margin: "0 18px", position: "relative", borderRadius: 2 }}>
                    <div
                      style={{
                        position: "absolute",
                        top: -5,
                        left: `${packetX}%`,
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        backgroundColor: i === 0 ? THEME.blue : THEME.green,
                        boxShadow: `0 0 12px ${i === 0 ? THEME.blue : THEME.green}`,
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Bottom Split: AT Command Terminal + BLE OTA Card */}
        <div style={{ display: "flex", gap: 32, flex: 1, maxHeight: 410 }}>
          {/* Left: AT Terminal */}
          <div
            style={{
              flex: "1.2",
              backgroundColor: "#0A0C10",
              border: `1px solid ${THEME.darkBorder}`,
              borderRadius: 18,
              padding: "22px 26px",
              display: "flex",
              flexDirection: "column",
              opacity: termSpring,
              transform: `translateY(${interpolate(termSpring, [0, 1], [28, 0])}px)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#EF4444" }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#22C55E" }} />
              <span style={{ fontFamily: THEME.fontMono, fontSize: 16, color: "#9CA3AF", marginLeft: 8 }}>
                AT Command Console (+++ 切入 AT 模式)
              </span>
            </div>
            <div style={{ fontFamily: THEME.fontMono, fontSize: 18, lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 10 }}>
              {AT_LOGS.map((item) => {
                const visible = frame >= item.frame;
                const op = interpolate(frame, [item.frame, item.frame + 10], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                return (
                  <div key={item.cmd} style={{ opacity: visible ? op : 0 }}>
                    <span style={{ color: THEME.green, fontWeight: 700 }}>&gt; {item.cmd}</span>
                    <div style={{ color: "#D1D5DB", paddingLeft: 18 }}>{item.res}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Web Bluetooth OTA */}
          <div
            style={{
              flex: "0.85",
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderTop: `4px solid ${THEME.red}`,
              borderRadius: 18,
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              opacity: otaSpring,
              transform: `translateY(${interpolate(otaSpring, [0, 1], [28, 0])}px)`,
            }}
          >
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#FFF" }}>
                浏览器 Web Bluetooth OTA
              </div>
              <div style={{ fontFamily: THEME.fontMono, fontSize: 16, color: "#93C5FD", marginTop: 6 }}>
                web/ble_ota.html · 无线固件升级
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: THEME.fontMono, fontSize: 18, marginBottom: 10 }}>
                <span style={{ color: "#D1D5DB" }}>Flashing 0x40000..0x73FFF</span>
                <span style={{ color: THEME.green, fontWeight: 800 }}>{otaPct}%</span>
              </div>
              <div style={{ height: 18, backgroundColor: "#0D1016", borderRadius: 9, overflow: "hidden", border: `1px solid ${THEME.darkBorder}` }}>
                <div
                  style={{
                    width: `${otaPct}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${THEME.red}, #F97316)`,
                    borderRadius: 9,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                backgroundColor: "rgba(34,197,94,0.1)",
                border: `1px solid rgba(34,197,94,0.35)`,
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 17,
                color: "#D1FAE5",
                lineHeight: 1.5,
              }}
            >
              安全保护机制：OTA 升级绝不覆盖 <code style={{ fontFamily: THEME.fontMono }}>0x76000</code>{" "}
              原厂唯一 MAC 与 <code style={{ fontFamily: THEME.fontMono }}>0x7A000</code> 配置区。
            </div>
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
