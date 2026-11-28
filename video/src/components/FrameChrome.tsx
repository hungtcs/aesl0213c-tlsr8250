import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { THEME } from "../theme";
import { SceneVoiceover } from "../voiceoverData";

interface FrameChromeProps {
  voiceover: SceneVoiceover;
  sceneIndex: number; // 0..7
  totalScenes: number;
  dark?: boolean;
  children: React.ReactNode;
}

export const FrameChrome: React.FC<FrameChromeProps> = ({
  voiceover,
  sceneIndex,
  totalScenes,
  dark = false,
  children,
}) => {
  const frame = useCurrentFrame();

  const activeCue = voiceover.cues.find(
    (c) => frame >= c.startFrame && frame <= c.endFrame + 6
  );

  const cueOpacity = activeCue
    ? interpolate(
        frame,
        [
          activeCue.startFrame,
          activeCue.startFrame + 6,
          activeCue.endFrame,
          activeCue.endFrame + 6,
        ],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  const bgColor = dark ? THEME.darkBg : THEME.paper;
  const gridColor = dark ? "rgba(255,255,255,0.045)" : "rgba(20,20,22,0.055)";
  const headerText = dark ? "#E5E7EB" : THEME.ink;
  const mutedText = dark ? "#9CA3AF" : THEME.inkMuted;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        fontFamily: THEME.fontSans,
        color: headerText,
        overflow: "hidden",
      }}
    >
      {/* Subtle technical blueprint grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Top status bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          padding: "0 56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(20,20,22,0.08)"}`,
          backgroundColor: dark
            ? "rgba(17,19,23,0.75)"
            : "rgba(245,242,235,0.82)",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: THEME.red,
            }}
          />
          <span
            style={{
              fontFamily: THEME.fontMono,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 0.6,
            }}
          >
            AESL0213C-TLSR8250
          </span>
          <span style={{ color: mutedText, fontSize: 16 }}>|</span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: dark ? "#F3F4F6" : THEME.inkSoft,
            }}
          >
            {voiceover.chapter}
          </span>
        </div>

        {/* Right side: Author attribution + 8-segment chapter progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 12px 4px 6px",
              borderRadius: 999,
              backgroundColor: dark
                ? "rgba(255,255,255,0.06)"
                : "rgba(20,20,22,0.06)",
              border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(20,20,22,0.1)"}`,
            }}
          >
            <Img
              src={staticFile("avatar.jpg")}
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                objectFit: "cover",
                border: `1.5px solid ${THEME.red}`,
              }}
            />
            <span
              style={{
                fontFamily: THEME.fontMono,
                fontSize: 15,
                fontWeight: 700,
                color: headerText,
              }}
            >
              hungtcs
            </span>
            <span
              style={{
                fontFamily: THEME.fontMono,
                fontSize: 13,
                color: mutedText,
              }}
            >
              B站 UID:25043249
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {Array.from({ length: totalScenes }).map((_, i) => {
            const isActive = i === sceneIndex;
            const isDone = i < sceneIndex;
            return (
              <div
                key={i}
                style={{
                  width: isActive ? 36 : 16,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: isActive
                    ? THEME.red
                    : isDone
                      ? dark
                        ? "rgba(255,255,255,0.55)"
                        : THEME.ink
                      : dark
                        ? "rgba(255,255,255,0.16)"
                        : "rgba(20,20,22,0.14)",
                }}
              />
            );
          })}
          </div>
        </div>
      </div>

      {/* Main content safe area */}
      <div
        style={{
          position: "absolute",
          top: 64,
          bottom: 112,
          left: 56,
          right: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        {children}
      </div>

      {/* Synchronized bottom subtitle pill */}
      {activeCue && (
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 80,
            right: 80,
            display: "flex",
            justifyContent: "center",
            zIndex: 30,
            opacity: cueOpacity,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(17, 19, 23, 0.9)",
              color: "#FFFFFF",
              padding: "12px 30px",
              borderRadius: 12,
              border: `1px solid rgba(255,255,255,0.14)`,
              boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
              fontSize: 28,
              fontWeight: 500,
              lineHeight: 1.4,
              letterSpacing: 0.4,
              textAlign: "center",
              maxWidth: 1520,
            }}
          >
            {activeCue.text}
          </div>
        </div>
      )}

      {/* Scene voiceover audio */}
      <Sequence from={voiceover.leadFrames}>
        <Audio src={staticFile(voiceover.audioFile)} />
      </Sequence>
    </AbsoluteFill>
  );
};
