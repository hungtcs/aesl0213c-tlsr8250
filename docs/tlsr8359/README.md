# TLSR8359 (`TLSR8359F512ET32`) 硬件与刷机参考手册

- **官方数据手册**：[DS-TLSR8359-E8.pdf](./DS-TLSR8359-E8.pdf)（Ver. 0.8.7，179 页）
- **同门芯片对比**：[TLSR8250F512 官方手册](../tlsr8250/DS-TLSR8250-E2.pdf)

---

## 1. 芯片核心规格（`TLSR8359F512ET32`）

| 参数 | 规格说明 | 与 `TLSR8250F512` 对比 |
| --- | --- | --- |
| 内核与主频 | 32-bit Telink B85 内核，最高 **48 MHz** | 架构与指令集一致 |
| 内置 Flash | **512 KB**（型号后缀 `F512`） | 相同（512 KB） |
| 片上 SRAM | **64 KB**（32 KB 深睡保持 + 32 KB 非保持） | 多 16 KB（8250 为 48 KB） |
| 封装 | **QFN-32**（`ET32`，每边 8 脚） | 同封装尺寸 |
| 射频能力 | 官方定位 2.4 GHz 私有协议（2380~2500 MHz）；**底层硬件同源 TLSR8258，完整支持 BLE** | 同样可跑 BLE 固件 |
| 外设 | SPI / I2C / UART / USB / SWS / 6路 PWM / 14-bit ADC / AES-CCM / 温度传感器 | 基本一致 |

---

## 2. QFN-32 关键引脚速查

以芯片表面圆点（1 脚）为起点**逆时针编号（1~32）**：

| 脚位 | 引脚名 | 关键用途 |
| --- | --- | --- |
| **Pin 1** | `PD4` | SWM（单线主控）/ GPIO |
| **Pin 2** | `PD7` | SPI CLK / UART TX / GPIO |
| **Pin 3** | `PA0` | UART RX / PWM0 / GPIO |
| **Pin 4** | `PA1` | GPIO |
| **Pin 5** | `PA7` (**SWS**) | **单线烧录与调试口**（接 USB-TTL 的 `TX`） |
| **Pin 6** | `PB1` | UART TX / GPIO |
| **Pin 25** | **`RESETB`** | **硬件低电平复位**（旁接上电复位电容，烧录激活时短接 `GND` 后松开） |
| **Pin 27** | `ANT` | 2.4 GHz 射频天线输出口 |
| **Pin 29~30** | `XC1` / `XC2` | 24 MHz 外部晶振 |
| **底部焊盘** | `GND` | 公共接地 |

---

## 3. SWS 串口烧录与 Flash 解锁（关键避坑）

### 3.1 接线方式
拆掉板载电池后，用 USB-TTL（CH340 / CP2102 / FTDI）连接板子测试焊盘（常见于 4-pin 排针孔）：

| 价签焊盘 | USB-TTL 引脚 | 说明 |
| --- | --- | --- |
| `SWS`（Pin 5 / `PA7`） | **`TXD`** | SWS 单线数据 |
| `GND` | **`GND`** | 共地 |
| `3V3` | **`3V3`** | 供电（严禁 5V，先拆电池） |
| `RESETB`（Pin 25） | 手动触碰 **`GND`** | 激活瞬间松开，拦住出厂深睡固件 |

### 3.2 为什么首次烧录需要 `Unlock Flash`？
大量采用 TLSR8359 的商业电子价签（如汉朔 Stellar / Nebular 系列）出厂时对片内 SPI Flash 开启了 **Status Register 块写保护（BP 位）**。如果不先解锁，扇区擦除和页写入会被 Flash 静默忽略。

**标准解锁指令序列（通过 SWS 操作 SPI 寄存器 `0x0D` 片选 / `0x0C` 数据口）**：
1. 发 `0x06`（Write Enable）
2. 拉低片选 `[0x0D]=0x00` → 写 `[0x0C]=0x01`（Write Status Register）→ 写 `[0x0C]=0x00, 0x01`（清零状态寄存器 1 并拉高片选）
3. 再发 `0x06`（Write Enable）
4. 拉低片选 `[0x0D]=0x00` → 写 `[0x0C]=0x01` → 连续写 `0x00, 0x00` 并拉高片选（兼容 2 字节状态寄存器的 Flash 型号）

### 3.3 激活与烧录步骤
1. 先用 `scripts/backup.sh` 备份原厂 512 KB Flash。
2. 推荐使用波特率 `460800`、`Atime = 3 sec`。
3. 先将 `RESETB` 短接 `GND` → 点击 **Unlock Flash** → 日志出现 `Activate` 时松开 `RESETB`。
4. 重复「按住 `RESETB` → 点 **Write to Flash** → 出现 `Activate` 松开 `RESETB`」完成烧录。

---

## 4. 常见兼容价签命名规则（以汉朔 Stellar 为例）

参考 `ATC_TLSR_Paper` 社区整理的型号编码（例如 `Stellar-M3N@ E31HA`）：

- **`M`**：2.13 英寸（`S` 为 1.54 英寸）
- **`3`**：黑白红三色屏（`Y` 为黑白黄三色）
- **`N`**：带 NFC 芯片（**带 `N` 的 Stellar 型号通常采用 TLSR8359**，不带 `N` 的多为其他主控）
- **`H`**：高分辨率（如 2.13" `250×122`）
- **`@`**：带板载 LED 指示灯

已验证直接兼容 `ATC_TLSR_Paper` / `ATC_BLE_OEPL` 的典型型号：
- `Stellar-M3N@ E31HA`（2.13" 黑白红 `250×122`）
- `Stellar-MN@ E31H`（2.13" 黑白 `250×122`）
- `Stellar-MFN@ E31A`（2.13" `212×104`）
- `Stellar-S3TN@ E31HA`（1.54" `200×200`）

---

## 5. 上游参考资源

- 蓝牙墨水屏固件：[atc1441/ATC_TLSR_Paper](https://github.com/atc1441/ATC_TLSR_Paper)
- OpenEPaperLink 生态：[OpenEPaperLink/OpenEPaperLink](https://github.com/OpenEPaperLink/OpenEPaperLink)
- SWS 串口烧录原理：[docs/protocols/sws-flasher.md](../protocols/sws-flasher.md)
