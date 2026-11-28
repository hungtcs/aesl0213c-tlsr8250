import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FrameChrome } from "../components/FrameChrome";
import { SPRING_SMOOTH, SPRING_SNAPPY, THEME } from "../theme";
import { VOICEOVER_DATA } from "../voiceoverData";

export const Scene5EpdPwa: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const rightSpring = spring({ frame: frame - 18, fps, config: SPRING_SMOOTH });

  // Cycle through 3 e-paper screen modes every ~115 frames
  const modeIndex = Math.floor(frame / 115) % 3;
  const localFrame = frame % 115;
  // Brief e-ink refresh flash on mode switch
  const isFlashing = frame > 20 && localFrame >= 0 && localFrame <= 5;

  const features = [
    {
      title: "三色日历 / 倒数日",
      desc: "自动排版日期、星期与红色节日/倒计时高亮",
      active: modeIndex === 0,
    },
    {
      title: "工位桌牌与待办清单",
      desc: "自定义姓名、状态标签与重点红字待办事项",
      active: modeIndex === 1,
    },
    {
      title: "图片三色抖动刷图",
      desc: "内置 Floyd-Steinberg 三色抖动算法，照片直出黑白红",
      active: modeIndex === 2,
    },
  ];

  // Animated BLE ripple rings
  const ring1 = (frame % 60) / 60;
  const ring2 = ((frame + 30) % 60) / 60;

  return (
    <FrameChrome
      voiceover={VOICEOVER_DATA.scene5_epd_pwa}
      sceneIndex={4}
      totalScenes={8}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 60,
        }}
      >
        {/* Left: Realistic 2.13" BWR E-Paper ESL Mockup */}
        <div
          style={{
            flex: "0 0 680px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            opacity: leftSpring,
            transform: `scale(${interpolate(leftSpring, [0, 1], [0.92, 1])})`,
          }}
        >
          {/* Outer white plastic bezel */}
          <div
            style={{
              width: 620,
              height: 360,
              borderRadius: 28,
              backgroundColor: "#EFECE4",
              border: `4px solid ${THEME.ink}`,
              boxShadow: "18px 18px 0 rgba(20,20,22,0.14)",
              padding: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Inner 250x122 landscape E-Ink screen */}
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 12,
                backgroundColor: isFlashing ? THEME.ink : "#FAF9F5",
                border: `3px solid ${THEME.ink}`,
                overflow: "hidden",
                position: "relative",
                display: "flex",
                filter: isFlashing ? "invert(1)" : "none",
              }}
            >
              {modeIndex === 0 && (
                /* Mode 0: BWR Calendar */
                <div style={{ display: "flex", width: "100%", height: "100%" }}>
                  <div
                    style={{
                      width: 210,
                      backgroundColor: THEME.red,
                      color: "#FFF",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 16,
                    }}
                  >
                    <div style={{ fontFamily: THEME.fontMono, fontSize: 22, fontWeight: 700 }}>
                      2026 · NOV
                    </div>
                    <div style={{ fontSize: 108, fontWeight: 900, lineHeight: 1 }}>25</div>
                    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>星期三</div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      padding: "24px 28px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 26, fontWeight: 900, color: THEME.ink }}>
                        ZK Ink 桌面日历
                      </span>
                      <span
                        style={{
                          fontFamily: THEME.fontMono,
                          fontSize: 16,
                          backgroundColor: THEME.ink,
                          color: "#FFF",
                          padding: "4px 10px",
                          borderRadius: 6,
                        }}
                      >
                        BAT 96%
                      </span>
                    </div>
                    <div style={{ borderTop: `2px solid ${THEME.ink}`, paddingTop: 14 }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: THEME.ink }}>
                        • 距离开源发布还有 <span style={{ color: THEME.red }}>3 天</span>
                      </div>
                      <div style={{ fontSize: 20, color: THEME.inkSoft, marginTop: 10 }}>
                        • 零耗电静态显示 · 断电不消失
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: THEME.fontMono,
                        fontSize: 15,
                        color: THEME.inkMuted,
                      }}
                    >
                      122×250 BWR · ATC_BLE_OEPL
                    </div>
                  </div>
                </div>
              )}

              {modeIndex === 1 && (
                /* Mode 1: Desk Nameplate & Todo */
                <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
                  <div
                    style={{
                      backgroundColor: THEME.ink,
                      color: "#FFF",
                      padding: "18px 26px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 32, fontWeight: 900 }}>hungtcs · 硬件工坊</span>
                    <span
                      style={{
                        backgroundColor: THEME.red,
                        color: "#FFF",
                        padding: "5px 14px",
                        borderRadius: 6,
                        fontSize: 18,
                        fontWeight: 800,
                      }}
                    >
                      专注编码中
                    </span>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      padding: "20px 26px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-around",
                      fontSize: 24,
                      fontWeight: 700,
                      color: THEME.ink,
                    }}
                  >
                    <div>☑ 反汇编原厂固件提取引脚</div>
                    <div>☑ 验证 128×250 显存对齐</div>
                    <div style={{ color: THEME.red }}>☐ 发布 BLE 5.0 + FindMy 固件</div>
                  </div>
                </div>
              )}

              {modeIndex === 2 && (
                /* Mode 2: Floyd-Steinberg BWR Dithering Preview */
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "22px 28px",
                    backgroundImage:
                      "radial-gradient(#141416 1.5px, transparent 1.5px)",
                    backgroundSize: "10px 10px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#FAF9F5",
                      border: `3px solid ${THEME.ink}`,
                      padding: "18px 22px",
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ fontSize: 28, fontWeight: 900, color: THEME.ink }}>
                      三色抖动算法
                    </div>
                    <div style={{ fontSize: 19, color: THEME.red, fontWeight: 800, marginTop: 6 }}>
                      Floyd-Steinberg BWR
                    </div>
                    <div style={{ fontFamily: THEME.fontMono, fontSize: 15, marginTop: 8, color: THEME.inkMuted }}>
                      Black + White + Red 3-Color
                    </div>
                  </div>
                  <div
                    style={{
                      width: 170,
                      height: 170,
                      borderRadius: "50%",
                      background: `conic-gradient(${THEME.red} 0 120deg, ${THEME.ink} 120deg 240deg, #FFF 240deg 360deg)`,
                      border: `4px solid ${THEME.ink}`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* BLE Wireless Signal Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              backgroundColor: THEME.paperCard,
              border: `2px solid ${THEME.paperBorder}`,
              borderRadius: 999,
              padding: "12px 26px",
              position: "relative",
            }}
          >
            <div style={{ position: "relative", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div
                style={{
                  position: "absolute",
                  width: 14 + ring1 * 24,
                  height: 14 + ring1 * 24,
                  borderRadius: "50%",
                  border: `2px solid ${THEME.blue}`,
                  opacity: 1 - ring1,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  width: 14 + ring2 * 24,
                  height: 14 + ring2 * 24,
                  borderRadius: "50%",
                  border: `2px solid ${THEME.blue}`,
                  opacity: 1 - ring2,
                }}
              />
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: THEME.blue }} />
            </div>
            <span style={{ fontFamily: THEME.fontMono, fontSize: 18, fontWeight: 700, color: THEME.ink }}>
              Web Bluetooth · ATC_BLE_OEPL.bin · 128×250 一键预填
            </span>
          </div>
        </div>

        {/* Right: ZK Ink PWA Feature Cards */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 22,
            opacity: rightSpring,
            transform: `translateX(${interpolate(rightSpring, [0, 1], [40, 0])}px)`,
          }}
        >
          <div>
            <span
              style={{
                backgroundColor: THEME.red,
                color: "#FFF",
                padding: "5px 14px",
                borderRadius: 6,
                fontFamily: THEME.fontMono,
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              USE CASE #1 · web/epd_pwa/
            </span>
            <h2 style={{ margin: "10px 0 0", fontSize: 48, fontWeight: 900, color: THEME.ink }}>
              ZK Ink 手机端 PWA 刷图
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 22, color: THEME.inkSoft }}>
              支持安装到手机主屏幕，无需装 App，打开网页直接蓝牙刷屏。
            </p>
          </div>

          {features.map((f, idx) => {
            const s = spring({
              frame: frame - (22 + idx * 14),
              fps,
              config: SPRING_SNAPPY,
            });
            return (
              <div
                key={f.title}
                style={{
                  backgroundColor: f.active ? THEME.ink : THEME.paperCard,
                  color: f.active ? "#FFF" : THEME.ink,
                  border: `2px solid ${f.active ? THEME.red : THEME.paperBorder}`,
                  borderRadius: 16,
                  padding: "22px 26px",
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [28, 0])}px)`,
                  boxShadow: f.active
                    ? "0 14px 32px rgba(217,43,43,0.18)"
                    : "0 4px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      backgroundColor: f.active ? THEME.red : THEME.inkMuted,
                    }}
                  />
                  <span style={{ fontSize: 25, fontWeight: 800 }}>{f.title}</span>
                </div>
                <div
                  style={{
                    fontSize: 19,
                    marginTop: 8,
                    color: f.active ? "#D1D5DB" : THEME.inkMuted,
                  }}
                >
                  {f.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </FrameChrome>
  );
};
