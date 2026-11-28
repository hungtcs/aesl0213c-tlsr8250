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

export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // E-ink flash simulation on first 14 frames
  const flashInvert =
    (frame >= 2 && frame <= 4) || (frame >= 7 && frame <= 9) ? 1 : 0;

  const titleSpring = spring({ frame: frame - 8, fps, config: SPRING_SMOOTH });
  const imgSpring = spring({ frame: frame - 12, fps, config: SPRING_SNAPPY });

  const scanY = interpolate(frame % 90, [0, 90], [0, 100]);

  const badges = [
    { label: "2.13\" 黑白红三色墨水屏", color: THEME.red },
    { label: "TLSR8250 · BLE 5.0", color: THEME.ink },
    { label: "全套固件 + 网页工具 + C SDK", color: THEME.inkSoft },
  ];

  return (
    <FrameChrome
      voiceover={VOICEOVER_DATA.scene1_intro}
      sceneIndex={0}
      totalScenes={8}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 72,
          filter: flashInvert ? "invert(1)" : "none",
        }}
      >
        {/* Left: Real hardware photo in technical frame */}
        <div
          style={{
            flex: "0 0 540px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transform: `translateY(${interpolate(imgSpring, [0, 1], [40, 0])}px) scale(${interpolate(imgSpring, [0, 1], [0.94, 1])})`,
            opacity: imgSpring,
          }}
        >
          <div
            style={{
              position: "relative",
              width: 480,
              height: 620,
              borderRadius: 24,
              overflow: "hidden",
              border: `3px solid ${THEME.ink}`,
              boxShadow: "16px 16px 0px rgba(20,20,22,0.14)",
              backgroundColor: "#111",
            }}
          >
            <Img
              src={staticFile("assets/shell-back.jpg")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${interpolate(frame, [0, 300], [1.04, 1.12])})`,
              }}
            />
            {/* Red technical scanline */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${scanY}%`,
                height: 3,
                backgroundColor: THEME.red,
                boxShadow: `0 0 18px ${THEME.red}`,
                opacity: 0.85,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 18,
                left: 18,
                right: 18,
                backgroundColor: "rgba(20,20,22,0.88)",
                color: "#FFF",
                padding: "12px 18px",
                borderRadius: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: THEME.fontMono,
                fontSize: 16,
              }}
            >
              <span>MODEL: AESL0213C-TLSR8250</span>
              <span style={{ color: THEME.red, fontWeight: 700 }}>2.13" BWR</span>
            </div>
          </div>
        </div>

        {/* Right: Hero headline & value proposition */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 28,
            transform: `translateX(${interpolate(titleSpring, [0, 1], [50, 0])}px)`,
            opacity: titleSpring,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                backgroundColor: THEME.red,
                color: "#FFF",
                padding: "8px 18px",
                borderRadius: 8,
                fontFamily: THEME.fontMono,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              OPEN SOURCE HARDWARE HACK
            </span>
            <span
              style={{
                fontFamily: THEME.fontMono,
                fontSize: 18,
                color: THEME.inkMuted,
                fontWeight: 600,
              }}
            >
              ZK_TESR21S_V2.1
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 78,
              fontWeight: 900,
              lineHeight: 1.12,
              color: THEME.ink,
              letterSpacing: -1,
            }}
          >
            墨水屏价签
            <br />
            <span style={{ color: THEME.red }}>逆向与开源改造</span>
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1.5,
              color: THEME.inkSoft,
              maxWidth: 940,
            }}
          >
            阿里云计算 / 浙江胜百 2.13" 三色电子价签完整逆向资料：
            <br />
            从<strong>硬件引脚、SWS 单线刷机</strong>到{" "}
            <strong>无线刷图、BLE 透传、FindMy 追踪器</strong> 一站搞定。
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
            {badges.map((b, idx) => {
              const s = spring({
                frame: frame - (28 + idx * 10),
                fps,
                config: SPRING_SNAPPY,
              });
              return (
                <div
                  key={b.label}
                  style={{
                    backgroundColor: b.color,
                    color: "#FFF",
                    padding: "14px 24px",
                    borderRadius: 12,
                    fontSize: 22,
                    fontWeight: 700,
                    transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                    opacity: s,
                    boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                  }}
                >
                  {b.label}
                </div>
              );
            })}
          </div>

          {/* Author & Repo attribution strip */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "12px 20px",
              backgroundColor: THEME.paperCard,
              border: `1.5px solid ${THEME.paperBorder}`,
              borderRadius: 14,
              width: "fit-content",
            }}
          >
            <Img
              src={staticFile("avatar.jpg")}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                objectFit: "cover",
                border: `2px solid ${THEME.red}`,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontFamily: THEME.fontMono, fontSize: 18, fontWeight: 800, color: THEME.ink }}>
                hungtcs · Bilibili UID 25043249
              </div>
              <div style={{ fontFamily: THEME.fontMono, fontSize: 15, color: THEME.inkMuted }}>
                github.com/hungtcs/aesl0213c-tlsr8250
              </div>
            </div>
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
