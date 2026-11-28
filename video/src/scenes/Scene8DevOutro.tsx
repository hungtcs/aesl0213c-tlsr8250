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

const EXAMPLES = [
  ["01_uart_echo", "硬件串口回显 + r/g/b 双色灯控制"],
  ["02_epd_bars", "1.5KB 最小裸机三色墨水屏点屏自检"],
  ["03_ble_uart_bridge", "正式版 BLE 5.0 透传 + AT + OTA"],
  ["04_findmy_tag", "超低功耗 Apple FindMy 追踪器"],
];

export const Scene8DevOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const rightSpring = spring({ frame: frame - 20, fps, config: SPRING_SMOOTH });

  return (
    <FrameChrome
      voiceover={VOICEOVER_DATA.scene8_dev_outro}
      sceneIndex={7}
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
        {/* Left: Self-contained SDK + 3-line Makefile */}
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
            <span
              style={{
                fontFamily: THEME.fontMono,
                fontSize: 16,
                fontWeight: 800,
                color: THEME.red,
              }}
            >
              SELF-CONTAINED BARE-METAL & BLE 5.0 SDK
            </span>
            <h2 style={{ margin: "6px 0 0", fontSize: 44, fontWeight: 900, color: THEME.ink }}>
              开箱即用的 C 自主开发生态
            </h2>
          </div>

          <div
            style={{
              backgroundColor: THEME.paperCard,
              border: `2px solid ${THEME.paperBorder}`,
              borderRadius: 18,
              padding: "18px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {EXAMPLES.map(([dir, desc], idx) => {
              const s = spring({
                frame: frame - (16 + idx * 10),
                fps,
                config: SPRING_SNAPPY,
              });
              return (
                <div
                  key={dir}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 16px",
                    borderRadius: 10,
                    backgroundColor: "#F8F6F0",
                    border: `1px solid ${THEME.paperBorder}`,
                    opacity: s,
                    transform: `translateY(${interpolate(s, [0, 1], [14, 0])}px)`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: THEME.fontMono,
                      fontSize: 18,
                      fontWeight: 800,
                      color: THEME.red,
                    }}
                  >
                    examples/{dir}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: THEME.inkSoft }}>
                    {desc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 3-line Makefile card */}
          <div
            style={{
              backgroundColor: THEME.ink,
              color: "#FFF",
              borderRadius: 18,
              padding: "18px 24px",
              fontFamily: THEME.fontMono,
              fontSize: 18,
              lineHeight: 1.65,
            }}
          >
            <div style={{ color: "#9CA3AF", fontSize: 15, marginBottom: 4 }}>
              # 仅需 3 行 Makefile 新建裸机工程，直接 #include &quot;board.h&quot;
            </div>
            <div>
              <span style={{ color: "#93C5FD" }}>TARGET</span> = my_demo
            </div>
            <div>
              <span style={{ color: "#FCA5A5" }}>include</span> ../common/baremetal.mk
            </div>
            <div style={{ color: THEME.green, marginTop: 4 }}>
              $ make -C examples/my_demo flash
            </div>
          </div>
        </div>

        {/* Right: Pure Open Source Info Card + Author + GitHub QR + Credits */}
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
          {/* Top: Project Title + QR Code */}
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
                  letterSpacing: 1,
                }}
              >
                OPEN SOURCE REPOSITORY
              </div>
              <div
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 38,
                  fontWeight: 900,
                  marginTop: 16,
                  lineHeight: 1.15,
                }}
              >
                AESL0213C
                <br />
                <span style={{ color: "#FF6B6B" }}>TLSR8250</span>
              </div>
              <div style={{ fontSize: 19, color: "#D1D5DB", marginTop: 12, lineHeight: 1.5 }}>
                硬件逆向资料 · 预编译固件 · Web 工具链 · 裸机与 BLE 开发模板
              </div>
            </div>

            {/* Scannable GitHub QR Code */}
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
              <span
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 12,
                  fontWeight: 800,
                  color: THEME.ink,
                }}
              >
                GitHub 仓库直达
              </span>
            </div>
          </div>

          {/* Middle: Direct URLs & Author Identity */}
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
                wordBreak: "break-all",
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

          {/* Bottom: Upstream Open Source Credits */}
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
            <span style={{ fontFamily: THEME.fontMono, color: "#D1D5DB", fontWeight: 700 }}>
              Credits:{" "}
            </span>
            atc1441 (ATC_TLSR_Paper) · OpenEPaperLink · pvvx (TlsrComSwireWriter / TlsrComProg825x)
            <br />
            P.S. 本视频同样由 Remotion 代码生成，源码就在仓库{" "}
            <span style={{ fontFamily: THEME.fontMono, color: "#FCA5A5" }}>video/</span> 目录一起开源。
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
