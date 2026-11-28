import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FrameChrome } from "../components/FrameChrome";
import { SPRING_SMOOTH, SPRING_SNAPPY, THEME } from "../theme";
import { VOICEOVER_DATA } from "../voiceoverData";

const STEPS = [
  {
    num: "01",
    title: "零密钥硬编码模板",
    code: "firmware/findmy_tag_template.bin",
    desc: "开源仓库仅含 28B 占位符，保护你的个人隐私安全",
  },
  {
    num: "02",
    title: "一键注入公钥并重算 CRC32",
    code: "python3 patch_key.py --keys my_tag.keys",
    desc: "兼容 OpenHaystack / macless-haystack，自动生成可刷固件",
  },
  {
    num: "03",
    title: "Deep Retention 超低功耗广播",
    code: "0x004C (12 19) · 2s 间隔 · 片内 32kHz RC",
    desc: "无需外部 32.768kHz 晶振，两颗纽扣电池续航数月以上",
  },
];

export const Scene7FindMy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const radarSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });

  const pulse1 = (frame % 75) / 75;
  const pulse2 = ((frame + 25) % 75) / 75;
  const pulse3 = ((frame + 50) % 75) / 75;
  const sweepDeg = (frame * 3) % 360;

  return (
    <FrameChrome
      voiceover={VOICEOVER_DATA.scene7_findmy}
      sceneIndex={6}
      totalScenes={8}
      dark
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
        }}
      >
        {/* Left: Apple Offline Finding Radar Animation */}
        <div
          style={{
            flex: "0 0 600px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 26,
            opacity: radarSpring,
            transform: `scale(${interpolate(radarSpring, [0, 1], [0.9, 1])})`,
          }}
        >
          <div
            style={{
              width: 480,
              height: 480,
              borderRadius: "50%",
              backgroundColor: "#0B111C",
              border: `2px solid rgba(59,130,246,0.35)`,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              boxShadow: "0 0 80px rgba(59,130,246,0.18)",
            }}
          >
            {/* Concentric grid rings */}
            {[160, 290, 410].map((d) => (
              <div
                key={d}
                style={{
                  position: "absolute",
                  width: d,
                  height: d,
                  borderRadius: "50%",
                  border: "1px dashed rgba(147,197,253,0.22)",
                }}
              />
            ))}

            {/* Rotating radar sweep */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "conic-gradient(from 0deg, rgba(59,130,246,0.32) 0deg, rgba(59,130,246,0) 65deg, transparent 360deg)",
                transform: `rotate(${sweepDeg}deg)`,
              }}
            />

            {/* Expanding BLE beacon pulses */}
            {[pulse1, pulse2, pulse3].map((p, idx) => (
              <div
                key={idx}
                style={{
                  position: "absolute",
                  width: 60 + p * 400,
                  height: 60 + p * 400,
                  borderRadius: "50%",
                  border: `2px solid ${THEME.blue}`,
                  opacity: (1 - p) * 0.85,
                }}
              />
            ))}

            {/* Center Tag Icon */}
            <div
              style={{
                width: 112,
                height: 112,
                borderRadius: "50%",
                backgroundColor: "#FFFFFF",
                border: `4px solid ${THEME.blue}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 5,
                boxShadow: "0 0 30px rgba(59,130,246,0.5)",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 900, color: THEME.ink }}>FindMy</div>
              <div style={{ fontFamily: THEME.fontMono, fontSize: 13, fontWeight: 800, color: THEME.red }}>
                TLSR8250
              </div>
            </div>
          </div>

          {/* Broadcast Packet Spec */}
          <div
            style={{
              backgroundColor: THEME.darkCard,
              border: `1px solid ${THEME.darkBorder}`,
              borderRadius: 14,
              padding: "14px 24px",
              fontFamily: THEME.fontMono,
              fontSize: 16,
              color: "#93C5FD",
              textAlign: "center",
            }}
          >
            Random Static MAC (TxAdd=1) · Apple 0x004C · 31B Offline Finding Payload
          </div>
        </div>

        {/* Right: Workflow Steps */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <span
              style={{
                backgroundColor: "rgba(59,130,246,0.2)",
                color: "#93C5FD",
                border: `1px solid ${THEME.blue}`,
                padding: "5px 14px",
                borderRadius: 6,
                fontFamily: THEME.fontMono,
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              USE CASE #3 · examples/04_findmy_tag/
            </span>
            <h2 style={{ margin: "12px 0 0", fontSize: 48, fontWeight: 900, color: "#FFF" }}>
              碎屏价签重生：AirTag 平替
            </h2>
          </div>

          {STEPS.map((st, idx) => {
            const s = spring({
              frame: frame - (18 + idx * 18),
              fps,
              config: SPRING_SNAPPY,
            });
            return (
              <div
                key={st.num}
                style={{
                  backgroundColor: THEME.darkCard,
                  border: `1px solid ${THEME.darkBorder}`,
                  borderLeft: `5px solid ${idx === 2 ? THEME.green : THEME.blue}`,
                  borderRadius: 16,
                  padding: "20px 26px",
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [40, 0])}px)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    style={{
                      fontFamily: THEME.fontMono,
                      fontSize: 20,
                      fontWeight: 900,
                      color: idx === 2 ? THEME.green : "#60A5FA",
                    }}
                  >
                    {st.num}
                  </span>
                  <span style={{ fontSize: 25, fontWeight: 800, color: "#FFF" }}>{st.title}</span>
                </div>
                <div
                  style={{
                    fontFamily: THEME.fontMono,
                    fontSize: 17,
                    color: "#FCA5A5",
                    marginTop: 8,
                    backgroundColor: "rgba(0,0,0,0.32)",
                    padding: "6px 12px",
                    borderRadius: 8,
                    display: "inline-block",
                  }}
                >
                  {st.code}
                </div>
                <div style={{ fontSize: 19, color: "#9CA3AF", marginTop: 8 }}>{st.desc}</div>
              </div>
            );
          })}

          <div
            style={{
              fontSize: 15,
              color: "#6B7280",
              marginTop: 2,
              paddingLeft: 4,
            }}
          >
            * 仅用于个人物品定位与低功耗蓝牙技术学习研究，公钥需由用户自行生成并注入。
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
