#!/usr/bin/env python3
"""
Generate Chinese TTS voiceover MP3s for the BLE UART Bridge tutorial & demo video,
measure exact durations via ffprobe, and emit src/bleUartVoiceoverData.ts.
"""

import asyncio
import json
import math
import subprocess
from pathlib import Path
import edge_tts

VOICE = "zh-CN-YunxiNeural"
RATE = "+6%"
FPS = 30
LEAD_FRAMES = 10
TAIL_FRAMES = 18

VIDEO_DIR = Path(__file__).resolve().parent.parent
AUDIO_DIR = VIDEO_DIR / "public" / "audio_ble_uart"
OUT_TS = VIDEO_DIR / "src" / "bleUartVoiceoverData.ts"

SCENES = [
    {
        "id": "b1_intro",
        "chapter": "01 / 透传固件概览",
        "lines": [
            "我们上次说的那块 2.13 寸三色墨水屏价签，折腾了好久怎么点都不亮，最后才发现屏幕竟然是坏的，呜呼哀哉！",
            "既然屏废了，干脆给它写个蓝牙 5.0 串口透传固件玩玩：支持 247 字节大 MTU、双通用服务、完整 AT 指令和浏览器无线 OTA。",
        ],
    },
    {
        "id": "b2_flash",
        "chapter": "02 / 固件编译与烧录",
        "lines": [
            "正式使用前，先把透传固件刷进板子。最省事的方式是直接拿仓库预编译好的固件，用一键脚本，或者直接打开项目部署好的 GitHub Pages 在线烧录页写入；",
            "如果你想自己改代码，直接运行一条 make 命令就能一键编译并完成单线烧录。",
            "详细的 1 千欧电阻单线接线和原厂固件备份步骤，可以直接看上一期视频。",
        ],
    },
    {
        "id": "b2_wiring",
        "chapter": "03 / 串口接线与硬件引脚",
        "lines": [
            "固件刷好之后，接上串口就能使用了：把板子背面的硬件串口 PC2 和 PC3，和 USB 转串口模块交叉接好并共地，再接 3.3 伏供电。",
            "更实用的是，我把拆屏后空闲的排线引脚也复用了起来：PA1 作为 STATE 连接状态输出，高电平表示蓝牙已连接；PA0 作为 AT 按键输入，自带 10K 上拉，接地拉低就能强制切入 AT 模式。",
            "注意一个硬件避坑点：如果没拆屏，断电墨水屏内部的 ESD 二极管可能会把 PA0 下拉导致锁死在 AT 模式并产生漏电，所以务必先断电拆除坏屏排线并防切口短接；如果是好屏板子，建议在 app.c 里关闭 AT 引脚检测。",
            "上电后看右下角双色灯：待机广播时绿灯每两秒闪一次，连上后绿灯常亮，收发数据则分别用绿灯和红灯指示。",
        ],
    },
    {
        "id": "b3_console",
        "chapter": "04 / 双通道透传与上位机",
        "lines": [
            "为了保证连续收发不丢包，透传内核支持将 MTU 协商到 247 字节，单包最高 244 字节，并搭配了 1KB 串口环形缓冲、15 毫秒自动组帧和发送背压重试。",
            "直接打开项目的 GitHub Pages 在线网页控制台，在同一个浏览器页面里就能同时连上蓝牙和串口，右侧就是毫秒级双向透传的实机效果。",
        ],
    },
    {
        "id": "b4_mobile",
        "chapter": "05 / 双 GATT 服务与手机兼容",
        "lines": [
            "为了免装专用 App，固件同时开放了两套通用蓝牙透传服务：一套是标准的 Nordic 串口服务，另一套是兼容 HM-10 的 0xFFE0 服务。",
            "固件还会自动读取原厂 MAC 生成唯一广播名，手机上随便找个常见蓝牙调试工具连上 ZK UART 设备，就能和电脑串口稳定互发数据。",
        ],
    },
    {
        "id": "b5_at_mode",
        "chapter": "06 / AT 模式切换与状态查询",
        "lines": [
            "接下来重点讲 AT 指令怎么用。未连接蓝牙时，串口默认处于 AT 模式，所有指令都以回车换行结尾；",
            "连上蓝牙后，串口会自动切为纯透传模式。如果想临时改配置，既可以连续发三个加号并保持前后静默至少 15 毫秒，也可以直接把 PA0 引脚接地拉低强制切入 AT 模式，用完发 AT+EXIT 即可恢复透传。",
            "日常查询用 AT+INFO? 就能一次看全版本、MAC、波特率、MTU 和电压；AT+VBAT? 则会调用片上 14 位 ADC 实时测量当前供电电压。",
        ],
    },
    {
        "id": "b6_at_config",
        "chapter": "07 / AT 配置与掉电保存",
        "lines": [
            "参数配置指令也很齐全：AT+NAME 改蓝牙名称，AT+BAUD 支持 9600 到 230400 六档波特率并即时生效；",
            "AT+TXPWR 可以在负 9.9 到正 10.3 dBm 之间切换五档发射功率，AT+ADVINT 调整广播间隔，另外还提供回显和状态日志开关。",
            "所有配置都会带魔数和 CRC16 校验写入 Flash 0x7A000 扇区，掉电不丢失；调乱了随时发 AT+DEFAULT 就能一键恢复出厂。",
        ],
    },
    {
        "id": "b7_ota",
        "chapter": "08 / 浏览器无线 OTA 升级",
        "lines": [
            "如果板子已经装进外壳不方便接线，固件还内置了标准蓝牙 OTA 升级服务。",
            "打开项目里的蓝牙 OTA 网页，连上设备选好新固件就能无线刷写，写入过程中板子红绿灯会交替快闪，完成后自动校验重启。",
            "为了防刷丢数据，OTA 只写入 0x40000 到 0x73FFF 区域，严格避开 0x76000 原厂 MAC 和 0x7A000 配置区。",
        ],
    },
    {
        "id": "b8_outro",
        "chapter": "09 / 快速复刻与开源",
        "lines": [
            "想复刻非常简单，只需要三步：烧录透传固件，直接打开项目部署好的 GitHub Pages 在线工具页，连上浏览器控制台就能开测。",
            "预编译固件、AT 指令文档、网页工具和完整源码都已经开源在 GitHub，按需自取——顺便一提，这期视频同样是用 Remotion 写代码生成并一起开源的。",
        ],
    },
]


def get_duration_sec(mp3_path: Path) -> float:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(mp3_path),
    ]
    out = subprocess.check_output(cmd, text=True).strip()
    return float(out)


async def generate_all():
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    OUT_TS.parent.mkdir(parents=True, exist_ok=True)

    results = {}
    total_sec = 0.0

    for scene in SCENES:
        sid = scene["id"]
        lines = scene["lines"]
        # Replace underscores with spaces for natural TTS pronunciation while keeping exact text in subtitles
        full_text = "".join(lines).replace("_", " ")
        mp3_path = AUDIO_DIR / f"{sid}.mp3"

        communicate = edge_tts.Communicate(full_text, VOICE, rate=RATE)
        await communicate.save(str(mp3_path))

        dur = get_duration_sec(mp3_path)
        total_sec += dur
        audio_frames = math.ceil(dur * FPS)
        duration_frames = LEAD_FRAMES + audio_frames + TAIL_FRAMES

        weights = [max(len(line), 1) for line in lines]
        total_w = sum(weights)
        cues = []
        cursor = LEAD_FRAMES
        for idx, line in enumerate(lines):
            if idx == len(lines) - 1:
                end_f = LEAD_FRAMES + audio_frames
            else:
                span = round(audio_frames * (weights[idx] / total_w))
                end_f = cursor + span
            cues.append(
                {
                    "text": line,
                    "startFrame": cursor,
                    "endFrame": end_f,
                }
            )
            cursor = end_f

        results[sid] = {
            "id": sid,
            "chapter": scene["chapter"],
            "audioFile": f"audio_ble_uart/{sid}.mp3",
            "durationSec": round(dur, 3),
            "leadFrames": LEAD_FRAMES,
            "durationInFrames": duration_frames,
            "cues": cues,
        }
        print(f"[OK] {sid}: {dur:.2f}s ({duration_frames} frames)")

    ts_content = (
        "// Auto-generated by scripts/generate_ble_uart_tts.py\n"
        "import { SceneVoiceover } from './voiceoverData';\n\n"
        f"export const BLE_UART_FPS = {FPS};\n\n"
        f"export const BLE_UART_VOICEOVER = {json.dumps(results, ensure_ascii=False, indent=2)} as const;\n\n"
        "export type BleUartSceneId = keyof typeof BLE_UART_VOICEOVER;\n"
        "export type BleUartVoiceoverCheck = Record<BleUartSceneId, SceneVoiceover>;\n"
    )
    OUT_TS.write_text(ts_content, encoding="utf-8")
    print(f"\nGenerated {OUT_TS} (total audio: {total_sec:.2f}s)")


if __name__ == "__main__":
    asyncio.run(generate_all())
