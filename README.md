# AESL0213C-TLSR8250 (`ZK_TESR21S_V2.1`) 墨水屏价签逆向与开发资料

阿里云计算 / 浙江胜百（智控 ZKONG）2.13 英寸黑白红三色电子墨水屏价签的完整已验证硬件参数、原厂固件备份、纯 SWS 烧录脚本、蓝牙刷图网页及裸机 C 开发模板。

---

## 1. 已验证硬件规格

| 项目                      | 参数                                                                                                                   |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------------- |
| **外壳型号**              | `AESL0213C-TLSR8250`（阿里云计算 / 浙江胜百信息科技）                                                                  |
| **主板丝印**              | `ZK_TESR21S_V2.1`（`3.08.01.0334`）                                                                                    |
| **主控芯片**              | Telink `TLSR8250F512ET32`（TC32 架构，512KB 内置 Flash，无外置 Flash）                                                 |
| **屏幕排线**              | `HINK-E0213A170-FPC-A0`（合力泰 2.13" 黑白红三色）                                                                     |
| **物理分辨率 / 显存对齐** | `122 × 250` 可见像素；**显存每行必须 8 像素对齐 = `128 × 250`（16 字节/行，4000 字节/通道）**，最右侧 6 像素为不可见区 |
| **驱动协议**              | 类 UC8151 / JD79653（`BUSY` 低电平忙、高电平闲）                                                                       |
| **原厂备份 MAC**          | `A4:C1:38:CD:A4:9F`（位于 Flash `0x76000`）                                                                            |
| **背面调试焊盘**          | `GND` / `RXD` / `TXD` / `SWS` / `3V3`（无独立 `RST` 引脚）                                                             |

### 1.1 精确 GPIO 引脚表（从原厂固件反汇编 + 实机点屏验证）

| 功能                 | 引脚      | 说明                                                       |
| :------------------- | :-------- | :--------------------------------------------------------- |
| **EPD_PWR (ENABLE)** | **`PB1`** | **高电平有效**：`1` = 给墨水屏通电，`0` = 断电             |
| **EPD_CS**           | **`PD2`** | SPI 片选（低电平有效）                                     |
| **EPD_DC**           | **`PD3`** | 数据/命令（`0` = 命令，`1` = 数据）                        |
| **EPD_RST**          | **`PA1`** | 硬件复位（低电平复位）                                     |
| **EPD_CLK**          | **`PD7`** | SPI 时钟                                                   |
| **EPD_MOSI**         | **`PB7`** | SPI 数据（MSB First）                                      |
| **EPD_BUSY**         | **`PA0`** | 忙信号（**低电平 = 忙，高电平 = 空闲**）                   |
| **LED 红**           | **`PB4`** | 低电平点亮（共阳极）                                       |
| **LED 绿**           | **`PB5`** | 低电平点亮（共阳极）                                       |
| **UART_TX (`TXD`)**  | **`PC2`** | 背面 `TXD` 焊盘，TLSR8250 原生硬件 `UART_TX`（`7816_TRX`） |
| **UART_RX (`RXD`)**  | **`PC3`** | 背面 `RXD` 焊盘，TLSR8250 原生硬件 `UART_RX`               |
| **SWS (`SWS`)**      | **`PA7`** | 背面 `SWS` 焊盘，Telink 单线烧录/调试口（开发时勿复用）    |

### 1.2 屏幕原生初始化指令与颜色编码（`epd_type = 0x6C`）

- **初始化序列**：`PB1 = 1` → `RST` 低 20ms 高 20ms → `0x4D 0x55` → `0xA9 0x25` → `0xF3 0x0A`
- **写显存**：`0x10`（黑白通道 4000B）→ `0x13`（红色通道 4000B）
- **刷新与休眠**：`0x04`（开升压）→ 等 `BUSY=1` → `0x12`（刷新）→ 等 `BUSY=1` → `0x02`（关升压）→ `0x07 0xA5`（深度休眠）→ `PB1 = 0`
- **颜色真值表**：
  - **白色**：`0x10` = `1`（`0xFF`），`0x13` = `0`（`0x00`）
  - **黑色**：`0x10` = `0`（`0x00`），`0x13` = `0`（`0x00`）
  - **红色**：`0x13` = `1`（`0xFF`）（红色优先于黑白）

### 1.3 `TLSR8250F512ET32` 芯片关键规格

| 维度            | 参数说明                                                                                                                                |
| :-------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **CPU 内核**    | 32 位 RISC（Telink TC32 架构），最高主频 **48 MHz**（常用 16/24/32/48 MHz），无硬件 FPU                                                 |
| **算力定位**    | 整数性能约等于 Cortex-M0 @ 48MHz（STM32F0 级别），远强于 ATmega328P，弱于 nRF52832 / ESP32                                              |
| **SRAM**        | **48 KB** 片上 SRAM（含可保持休眠区，足以容纳双通道 8KB 墨水屏显存及 BLE 协议栈）                                                       |
| **Flash**       | **512 KB** 片上集成 Flash（支持 XIP 与指令缓存，本板无外置 SPI Flash）                                                                  |
| **2.4GHz 射频** | 支持 **BLE 5.0**（1M/2M/Coded PHY、BLE Mesh）、**IEEE 802.15.4（Zigbee）**、私有 2.4GHz，最大发射功率 +10 dBm                           |
| **低功耗**      | Deep Sleep 约 **0.4 µA**；Deep Retention（保持 RAM）约 **1.2 ~ 1.8 µA**                                                                 |
| **主要外设**    | 硬件 UART（带 DMA）、SPI、I2C、6 路 PWM、14-bit SAR ADC（支持内部 `VBAT` 采样）、硬件 AES-128、TRNG、QDEC、USB 1.1（需 `PA5/PA6` 引出） |
| **板载时钟**    | 外接 24 MHz 晶振，**无**外接 32.768 kHz 晶振（低功耗需使用内部 32kHz RC）                                                               |

---

## 2. SWS 烧录接线（CH343 / CH340 纯单线模式）

**板子的 `RXD` 和 `TXD` 均不接**，只需要 1 颗 **1kΩ 电阻**：

| USB-TTL (推荐 CH343)       | 价签板子                      | 说明                                                                               |
| :------------------------- | :---------------------------- | :--------------------------------------------------------------------------------- |
| **`TX`**                   | 接 1kΩ 电阻一端               | —                                                                                  |
| **`RX`**                   | 接 1kΩ 电阻另一端 + **`SWS`** | 与 `SWS` 并联在电阻靠板子侧                                                        |
| **`GND`**                  | **`GND`**                     | 共地                                                                               |
| **`RTS`**（推荐）或 `3.3V` | **`3V3`**                     | 接 `RTS` 可自动控电复位；接 `3.3V` 需在脚本出现 `Activate (5000 ms)...` 时手动上电 |

---

## 3. 快速上手：刷自研 InkCard 蓝牙固件 + 网页传图

### 3.1 安装 Python 依赖

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### 3.2 备份 / 刷机 / 还原

```bash
# 1. 备份当前板子原厂 512KB 固件（推荐每块新板子都先备份）
./scripts/backup.sh

# 2. 刷入自研 InkCard 蓝牙墨水屏固件（开箱免配置、保留 0x76000 MAC）
./scripts/flash.sh firmware/ble_epd.bin

# 如需还原原厂固件：
./scripts/restore.sh
```

> 也可以免装 Python，直接用 InkCard 网页内置的 **SWS 串口单线烧录器**（`/tools/sws`）通过浏览器烧录 `firmware/ble_epd.bin`。首次线刷后，后续升级可直接通过 **Telink BLE OTA 升级**（`/tools/ota`）无线完成。

### 3.3 网页蓝牙传图

1. 拔掉 SWS 线，给板子接正常 `3.3V` 或装电池（绿灯快闪 2 下表示启动正常，红灯闪 3 下表示低电）。
2. 启动本地网页服务：

   ```bash
   pnpm --dir webapp dev
   ```

3. 用支持 Web Bluetooth 的浏览器（**iPhone 首选 Safari + beacio 插件**（样式完美；注意**不要**用 iOS 主屏幕 PWA，Safari 扩展在 PWA 中不生效；备用 SHX Browser）、**Android Chrome**、**电脑 Chrome / Edge**）打开：`http://localhost:5173/`
4. 点击顶栏 **连接蓝牙**，选择 **`InkCard_XXXX`**（免硬件配置，连上即用），任选 14 套模板、上传图片或三色涂鸦，点击 **推送到墨水屏** 即可（PackBits RLE 压缩，卡片通常不到 0.5 秒传完，三色屏刷新约 15 秒）。

> **兼容旧固件说明**：`webapp/` 仍向后兼容第三方 `ATC_BLE_OEPL.bin`（仅支持 Android / 电脑端）；如需使用旧固件，可在右上角 **⚙️ 设置 → `ATC_BLE_OEPL` 硬件配置** 卡片中一键写入本板 128×250 参数。

---

## 4. 自主固件开发与示例（`examples/`）

所有开发示例统一放在 `examples/` 目录下，编译产物统一输出到各自目录的 `build/` 中（已加入 `.gitignore`）：

| 目录                           | 说明                                                                                                                                                           | 依赖                                          |
| :----------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- |
| `examples/common/`             | 板级引脚定义 `board.h`、共享启动汇编 `cstartup.S`、链接脚本 `boot_825x.link` 与 `baremetal.mk`                                                                 | —                                             |
| `examples/sdk/`                | 精简 TLSR825x 裸机寄存器头文件                                                                                                                                 | —                                             |
| `examples/ble_sdk/`            | 内置 Telink B85m BLE 5.0 SDK（已打 TLSR8250 `0x025d` 启动头、`0x84c000` 48KB SRAM 栈顶与 `FW_CHECK_AGTHM2` OTA CRC32 补丁）                                    | —                                             |
| `examples/01_uart_echo/`       | 硬件 UART（`TX=PC2` / `RX=PC3`，`115200 8N1`）交互式终端，支持回显与 `r`/`g`/`b` 控灯                                                                          | 仅 `tc32-elf-gcc`                             |
| `examples/02_epd_bars/`        | 1.5KB 最小裸机三色墨水屏点屏测试（黑/白/红三色条纹）                                                                                                           | 仅 `tc32-elf-gcc`                             |
| `examples/03_ble_uart_bridge/` | 正式版 BLE 5.0 串口透传固件（大 MTU 247B / NUS + `0xFFE0` / AT 指令 + Flash 持久化 / ADC `VBAT` / BLE OTA，详见[说明](examples/03_ble_uart_bridge/README.md)） | `tc32-elf-gcc`（使用内置 `examples/ble_sdk`） |
| `examples/04_findmy_tag/`      | 超低功耗 Apple FindMy / OpenHaystack 追踪器固件（Deep Retention + 2 秒广播 + `patch_key.py` 密钥注入工具，详见[说明](examples/04_findmy_tag/README.md)）       | `tc32-elf-gcc`（使用内置 `examples/ble_sdk`） |
| `examples/05_ble_epd/`         | **推荐主力**：自研 InkCard 低功耗三色墨水屏 BLE 5.0 刷图固件（全平台含 iOS 兼容 / PackBits RLE 压缩 / 16K Deep Retention / 电量与低电保护 / 双分区 BLE OTA，详见[说明](examples/05_ble_epd/README.md)） | `tc32-elf-gcc`（使用内置 `examples/ble_sdk`） |

### 安装 `tc32-elf-gcc` 工具链（Linux / Windows）

- **Linux (x86_64)**：

  ```bash
  mkdir -p toolchain
  curl -fSL http://shyboy.oss-cn-shenzhen.aliyuncs.com/readonly/tc32_gcc_v2.0.tar.bz2 -o tc32_gcc_v2.0.tar.bz2
  tar -xjf tc32_gcc_v2.0.tar.bz2 -C toolchain
  ```

- **Windows**：
  - 社区镜像直链：`http://shyboy.oss-cn-shenzhen.aliyuncs.com/readonly/tc32_win.rar`（解压后将 `bin/` 加入 `PATH`，或放到 `toolchain/tc32/`）
- **官方与长期备用源**（上述 OSS 镜像为社区第三方源，如遇失效可改用）：
  - **泰凌微官方**：[泰凌微官网](https://www.telink-semi.com) / [泰凌微文档中心](https://doc.telink-semi.cn)（下载 Telink IoT Studio，内置 Windows/Linux `tc32-elf-gcc`）
  - **GitHub 开源镜像**：[atc1441/ATC_TLSR_Paper](https://github.com/atc1441/ATC_TLSR_Paper)（`Firmware/tc32_linux` 与 `Firmware/tc32_windows`）
  - 也可直接从本仓库的 GitHub Releases 下载已归档的工具链压缩包。

### 编译并一键烧录

```bash
# 01: 硬件串口终端
make -C examples/01_uart_echo flash
screen /dev/ttyUSB0 115200

# 02: 三色墨水屏点屏测试
make -C examples/02_epd_bars flash

# 03: BLE 5.0 串口透传固件（零外部路径依赖，直接编译烧录）
make -C examples/03_ble_uart_bridge flash-sws

# 05: 自研 InkCard 墨水屏 BLE 刷图固件（推荐主力）
make -C examples/05_ble_epd flash-sws
```

### 新增裸机示例规范

新增一个裸机示例只需新建 `examples/<编号>_<名称>/`，放 2 个文件：

1. `Makefile`（3 行即可）：

   ```makefile
   TARGET = my_demo
   include ../common/baremetal.mk
   ```

2. `main.c`（可直接 `#include "board.h"` 使用所有已验证板级引脚）。

---

## 5. 目录结构

- `docs/`：主板正反面高清实拍照片、接线参考图、[开发与调试避坑笔记](docs/troubleshooting.md)与协议解析文档（[BLE OTA](docs/protocols/ble-ota.md) / [SWS 串口烧录](docs/protocols/sws-flasher.md)）
- `firmware/`：开箱即用的预编译固件（均经实机验证，可直接用 `scripts/flash.sh` 或 InkCard 内置的 SWS 串口烧录器刷入）
  - `ble_epd.bin`：**推荐主力**，自研 InkCard 低功耗三色墨水屏 BLE 刷图 + OTA 固件（`05_ble_epd`，全平台含 iOS 兼容）
  - `ble_uart_bridge.bin`：正式版 BLE 5.0 串口透传 + AT 指令 + OTA 固件（`03_ble_uart_bridge`）
  - `findmy_tag_template.bin`：超低功耗 Apple FindMy 追踪器通用模板（不含密钥，用 `examples/04_findmy_tag/patch_key.py` 注入公钥）
  - `uart_echo.bin`：硬件串口自检终端（`01_uart_echo`）
  - `epd_bars.bin`：三色墨水屏点屏自检固件（`02_epd_bars`）
  - `ATC_BLE_OEPL.bin`：（旧版兼容保留）第三方蓝牙三色墨水屏固件
- `scripts/`：纯 SWS 烧录工具（含 Linux/Windows 版 `TLSR825xComFlasher.py` 与 macOS 版 `TLSR825xComFlasher-macos.py`）与一键备份/刷机/清配置/还原脚本
- `webapp/`：**InkCard 墨水屏卡片助手 & 硬件工具集**（React 19 + Vite 8 + Tailwind CSS v4 + React Router，自动构建部署到 GitHub Pages，本地通过 `pnpm --dir webapp dev` 启动）
  - 14 套三色墨水屏实用与创意模板（挪车电话 / Wi-Fi 分享 / 门口提示 / 收纳标签 / 个人名片 / 防丢牌 / 日历 / 倒数日 / 工位桌牌 / 习惯打卡 / 竖排诗词 / 万能二维码与截图识别重绘 / 图片三色抖动刷图 / 三色涂鸦）
  - 内置硬件工具路由：BLE-UART 双通道上位机（`/tools/uart`）、Telink BLE OTA 升级（`/tools/ota`）、SWS 串口单线烧录器（`/tools/sws`）
- `examples/`：完全自包含的 TLSR8250 裸机与 BLE 开发示例、板级头文件、精简裸机 SDK 与内置 BLE SDK

---

## 6. 上游来源与致谢

本项目使用的第三方固件、烧录脚本、网页工具和 SDK 均来自以下开源项目，特此致谢：

- **`firmware/ATC_BLE_OEPL.bin`、OEPL 刷图协议与 Telink BLE OTA 协议**：来自 [atc1441/atc1441.github.io](https://github.com/atc1441/atc1441.github.io)，相关项目：[atc1441/ATC_TLSR_Paper](https://github.com/atc1441/ATC_TLSR_Paper)、[OpenEPaperLink](https://github.com/OpenEPaperLink/OpenEPaperLink)
- **`examples/ble_sdk/`**：提取自 [atc1441/ATC_TLSR_Paper](https://github.com/atc1441/ATC_TLSR_Paper)（`Firmware/components` 与 `Firmware/make`，基于泰凌微 Telink B85m BLE SDK，并针对 TLSR8250 补充了 `0x025d` 启动头与 `0x84c000` 48KB 栈顶修正）
- **`scripts/TLSR825xComFlasher.py`、`scripts/TLSR825xComFlasher-macos.py`、SWS 串口烧录协议（原 `USBCOMFlashTx.html`）**：来自 [pvvx/TlsrComSwireWriter](https://github.com/pvvx/TlsrComSwireWriter)
- **`examples/sdk/`、`examples/common/boot_825x.link`、`examples/common/cstartup.S`（模板）**：提取自 [pvvx/TlsrComProg825x](https://github.com/pvvx/TlsrComProg825x)（基于泰凌微 Telink TLSR825x SDK 头文件）
