import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FrameChrome } from "../components/FrameChrome";
import { BLE_UART_VOICEOVER } from "../bleUartVoiceoverData";
import { SPRING_SMOOTH, SPRING_SNAPPY, THEME } from "../theme";

const CONFIG_CMDS = [
  { cmd: "AT+NAME=<str>", desc: "修改蓝牙广播名称（1~20 字符），立即生效" },
  { cmd: "AT+BAUD=<rate>", desc: "9600 / 19200 / 38400 / 57600 / 115200 / 230400" },
  { cmd: "AT+TXPWR=<0..4>", desc: "五档射频功率：-9.9 / -3.6 / 0 / +3.0 / +10.3 dBm" },
  { cmd: "AT+ADVINT=<ms>", desc: "自定义广播间隔（20 ~ 2000 ms），平衡功耗与发现速度" },
  { cmd: "AT+ECHO=<0|1>", desc: "开关 BLE 接收回显（默认 0 纯透传不回显）" },
  { cmd: "AT+LOG=<0|1>", desc: "开关串口连接状态提示（+CONNECTED / +DISCONNECTED）" },
];

const CTRL_CMDS = [
  { cmd: "AT+DISC", desc: "主动断开当前 BLE 连接" },
  { cmd: "AT+EXIT", desc: "退出 AT 模式，恢复纯透传" },
  { cmd: "AT+RESET", desc: "软件重启芯片" },
  { cmd: "AT+DEFAULT", desc: "恢复出厂默认配置并重启" },
];

export const B6AtConfig: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({ frame: frame - 6, fps, config: SPRING_SMOOTH });
  const footerSpring = spring({ frame: frame - 50, fps, config: SPRING_SNAPPY });

  return (
    <FrameChrome
      voiceover={BLE_UART_VOICEOVER.b6_at_config}
      sceneIndex={6}
      totalScenes={9}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            opacity: headerSpring,
            transform: `translateY(${interpolate(headerSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          <div>
            <span style={{ fontFamily: THEME.fontMono, fontSize: 16, fontWeight: 800, color: THEME.red }}>
              AT COMMAND GUIDE PART 2 · CONFIGURATION &amp; PERSISTENCE
            </span>
            <h2 style={{ margin: "4px 0 0", fontSize: 44, fontWeight: 900, color: THEME.ink }}>
              全套参数配置指令与 Flash 掉电保存
            </h2>
          </div>
          <span
            style={{
              backgroundColor: THEME.ink,
              color: "#FFF",
              padding: "8px 16px",
              borderRadius: 10,
              fontFamily: THEME.fontMono,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            亦可在网页底部可视化一键设置
          </span>
        </div>

        {/* Two Columns: Parameter Configs + System Controls */}
        <div style={{ display: "flex", gap: 32, alignItems: "stretch" }}>
          {/* Left: 6 Parameter Config Commands */}
          <div
            style={{
              flex: "1.35",
              backgroundColor: THEME.paperCard,
              border: `2px solid ${THEME.paperBorder}`,
              borderTop: `5px solid ${THEME.red}`,
              borderRadius: 18,
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 11,
              boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
              参数配置类（自动写入 Flash 掉电保存）
            </div>
            {CONFIG_CMDS.map((item, idx) => {
              const s = spring({ frame: frame - (14 + idx * 8), fps, config: SPRING_SNAPPY });
              return (
                <div
                  key={item.cmd}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "11px 14px",
                    borderRadius: 10,
                    backgroundColor: "#F8F6F0",
                    border: `1px solid ${THEME.paperBorder}`,
                    opacity: s,
                    transform: `translateX(${interpolate(s, [0, 1], [-18, 0])}px)`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: THEME.fontMono,
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#FFF",
                      backgroundColor: THEME.ink,
                      padding: "6px 12px",
                      borderRadius: 7,
                      minWidth: 185,
                      textAlign: "center",
                    }}
                  >
                    {item.cmd}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: THEME.inkSoft }}>
                    {item.desc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right: 4 Control Commands + Flash Persistence Box */}
          <div style={{ flex: "0.85", display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                flex: 1,
                backgroundColor: THEME.paperCard,
                border: `2px solid ${THEME.paperBorder}`,
                borderTop: `5px solid ${THEME.ink}`,
                borderRadius: 18,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 900, color: THEME.ink, marginBottom: 2 }}>
                连接与系统控制类
              </div>
              {CTRL_CMDS.map((item, idx) => {
                const s = spring({ frame: frame - (24 + idx * 10), fps, config: SPRING_SNAPPY });
                return (
                  <div
                    key={item.cmd}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "11px 14px",
                      borderRadius: 10,
                      backgroundColor: "#F8F6F0",
                      border: `1px solid ${THEME.paperBorder}`,
                      opacity: s,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: THEME.fontMono,
                        fontSize: 17,
                        fontWeight: 800,
                        color: THEME.red,
                        backgroundColor: THEME.redSoft,
                        padding: "5px 10px",
                        borderRadius: 6,
                        minWidth: 132,
                        textAlign: "center",
                      }}
                    >
                      {item.cmd}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 600, color: THEME.inkSoft }}>
                      {item.desc}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Flash 0x7A000 Persistence Banner */}
            <div
              style={{
                backgroundColor: THEME.ink,
                color: "#FFF",
                borderRadius: 18,
                padding: "20px 24px",
                borderLeft: `6px solid ${THEME.green}`,
                opacity: footerSpring,
                transform: `translateY(${interpolate(footerSpring, [0, 1], [16, 0])}px)`,
              }}
            >
              <div style={{ fontFamily: THEME.fontMono, fontSize: 19, fontWeight: 900, color: THEME.green }}>
                Flash 0x7A000 掉电持久存储
              </div>
              <div style={{ fontSize: 17, color: "#D1D5DB", marginTop: 8, lineHeight: 1.5 }}>
                带 <strong>Magic 魔数 + CRC16 校验</strong>；断电重启自动恢复全部配置，配置损坏时自动回退安全默认值。
              </div>
            </div>
          </div>
        </div>
      </div>
    </FrameChrome>
  );
};
