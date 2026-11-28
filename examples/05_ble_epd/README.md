# 05_ble_epd — InkCard 低功耗三色墨水屏 BLE 刷图固件

面向 **AESL0213C-TLSR8250**（PCB `ZK_TESR21S_V2.1`，`HINK-E0213A170` 2.13 英寸 122×250 黑白红三色墨水屏）的自研开源 BLE 5.0 刷图固件。

## 特性

- **全平台蓝牙直连刷图**：单包上限 163 字节（160B 负载），低于 iOS CoreBluetooth 182B MTU 上限，原生兼容 **iPhone（首选 Safari + beacio 插件，勿用 iOS 主屏幕 PWA；备用 SHX Browser）**、**Android Chrome** 与 **电脑 Chrome / Edge**；支持 PackBits RLE 压缩（卡片通常仅 5~10 包、不到 0.5 秒传完）。
- **开箱免配置**：内置已验证的本板引脚与 `HINK-E0213A170`（`epd_type 0x6c`）初始化时序，烧录即用。
- **超低功耗待机**：空闲广播采用 1s 间隔 + **16K Deep Retention** 深度休眠；非刷新期间切断墨水屏电源（`PB1=0`）并拉低所有 SPI 脚防止漏电。
- **异步刷屏不断连**：刷屏约 15 秒期间通过状态机轮询 `EPD_BUSY`，保持 BLE 连接并在刷新完成后主动推送完成通知。
- **实时电量检测与极低电保护**：
  - 使用内部 14-bit SAR ADC（`PB6`）采样电池电压 `VBAT`。
  - 低于 `2.55V` 上报 `low_bat = 1`（WebApp 顶部显示红色闪烁低电徽章）。
  - 低于 `2.45V` 时自动触发一次全屏红色 **LOW BATTERY** 提示页（通过 Retention 标志单次锁存，换新电池回升至 `≥ 2.60V` 或冷启动后复位）。
- **内置 Telink BLE OTA**：支持通过网页 OTA 工具无线升级，也可随时刷回 `ATC_BLE_OEPL.bin`。

## 指示灯状态

硬件引脚：红灯 `PB4`、绿灯 `PB5`（均为**低电平点亮**）。

| 设备状态                   | 指示灯表现                                      | 说明                                    |
| :------------------------- | :---------------------------------------------- | :-------------------------------------- |
| **冷启动（电量正常）**     | 绿灯快闪 2 下（70ms 亮 / 70ms 灭）              | 电池电压 `≥ 2.55V`，系统启动完成        |
| **冷启动（低电量）**       | 红灯快闪 3 下（90ms 亮 / 90ms 灭）              | 电池电压 `< 2.55V`，提示尽快更换电池    |
| **待机 / 蓝牙已连接空闲**  | 红绿灯全灭                                      | 进入 16K Deep Retention 低功耗待机      |
| **墨水屏刷新中（约 15s）** | 绿灯常亮                                        | 刷新完成并切断墨水屏电源后自动熄灭      |
| **BLE OTA 升级中**         | 红绿灯交替快闪（每 100ms 切换一次）             | 升级完成重启后绿灯闪 2 下；中途断开熄灭 |

## BLE GATT 服务定义

- **广播名称**：`InkCard_XXXX`（取自 Flash `0x76000` 出厂 MAC 后 4 位十六进制）
- **广播服务 UUID**：`0xFE01`
- **Scan Response**：厂商自定义数据 `0xCAFE` + `[vbat_lo, vbat_hi, low_bat]`
- **GATT 服务**：
  - `0xFE01` InkCard EPD Service
    - `0xFE02` Control & Data Characteristic（`READ | WRITE | WRITE_WITHOUT_RSP | NOTIFY`）
  - `00010203-0405-0607-0809-0a0b0c0d1912` Telink Standard OTA Service
    - `00010203-0405-0607-0809-0a0b0c0d2b12` OTA Data

## 通信协议规范（小端序二进制）

### 图像数据格式（8000 字节）

- 逻辑画布：`128 × 250`（可见区域为左侧 `122 × 250`，每行 16 字节，MSB 在左）。
- 排列顺序：`4000B 黑白平面` + `4000B 红色平面`（共 `8000` 字节，与 OEPL 位图平面一致）：
  - 黑白平面：`1 = 黑色`，`0 = 白色`（固件写入 `DTM1 0x10` 时自动按位取反）。
  - 红色平面：`1 = 红色`，`0 = 无红`（直接写入 `DTM2 0x13`）。
- 校验算法：标准 IEEE 802.3 CRC32（多项式 `0xEDB88320`，覆盖全部 8000 字节）。

### 指令与响应表

| 方向       | Opcode               | 载荷格式                                                  | 说明                                                      |
| :--------- | :------------------- | :-------------------------------------------------------- | :-------------------------------------------------------- |
| Host → Dev | `0x01` `START`       | `[0x01, mode(0=raw/1=RLE), len(u16 LE), crc32(u32 LE)]`   | 开始传图（`mode=0` 原始 8000B，`mode=1` PackBits RLE）    |
| Dev → Host | `0x81`               | `[0x81, status, chunk(160), vbat_mv(u16 LE), low_bat]`    | `status`: `0=OK`, `1=刷屏中`, `2=参数/长度错误`           |
| Host → Dev | `0x02` `DATA`        | `[0x02, seq(u16 LE), payload(1..160B)]`                   | 写入偏移 `seq * 160` 处的数据                             |
| Dev → Host | `0x82`               | `[0x82, status, seq(u16 LE)]`                             | `status`: `0=OK`, `1=未开始或越界`                        |
| Host → Dev | `0x03` `COMMIT`      | `[0x03]`                                                  | 结束传图，校验 CRC32（RLE 时解码）并异步启动刷新          |
| Dev → Host | `0x83`               | `[0x83, status]`                                          | `status`: `0=开始刷屏`, `1=CRC 失败`, `2=状态错`, `3=RLE 错` |
| Dev → Host | `0x84` `DONE`        | `[0x84, status, vbat_mv(u16 LE), low_bat]`                | 约 15 秒刷屏完成后主动推送（`0=成功`, `1=超时`）          |
| Host → Dev | `0x04` `INFO`        | `[0x04]`                                                  | 查询固件版本、状态、电量与分辨率                          |
| Dev → Host | `0x85`               | `[0x85, maj, min, state, vbat(u16), low, w(u16), h(u16)]` | `state`: `0=IDLE`, `1=RX`, `2=REFRESHING`                 |
| Host → Dev | `0x05` `TEST_LOWBAT` | `[0x05]`                                                  | 主动刷新一次内置低电量提示页（依次回复 `0x83` 与 `0x84`） |

## 编译与烧录

```bash
# 编译固件（输出 build/ble_epd.bin）
cd examples/05_ble_epd
make clean && make -j4

# 方式一：首次从原厂 / ATC_BLE_OEPL 固件迁移，需通过 SWS 单线烧录（也可用网页「SWS 串口单线烧录器」）
make flash-sws

# 方式二：刷入本固件后，后续更新可直接通过网页「Telink BLE OTA 升级」无线刷入 firmware/ble_epd.bin
```

## BLE OTA 双分区与固件校验注意事项（避坑记录）

本固件使用 Telink B85m SDK（`liblt_8258.a`）原生双分区 BLE OTA，修改构建脚本或启动流程时必须遵守以下 3 条硬性规则，否则会导致 OTA 校验断开或重启后擦掉自己：

1. **`bls_ota_set_fwSize_and_fwBootAddr()` 必须在 `main()` 中、`cpu_wakeup_init()` 之前调用**：
   - `cpu_wakeup_init()` 内部的 `cpu_wakeup_no_deepretn_back_init()` 会在冷启动时把 `ota_program_bootAddr` 写入 `ota_program_offset`（均在 `.retention_data` 中，16K Deep Retention 唤醒不会丢失）。
   - 如果放到 `user_init_normal()` 里调用，将无法更新 `ota_program_offset`。
2. **固定使用 `124KB / 0x20000` 非重叠双分区（`bls_ota_set_fwSize_and_fwBootAddr(124, 0x20000)`）**：
   - A 区：`0x00000 ~ 0x1EFFF`（124 KB）；B 区：`0x20000 ~ 0x3EFFF`（124 KB），远离 `0x76000` 出厂 MAC。
   - **禁止跨分区方案做无线 OTA**：例如旧固件写到 `0x20000` 后，如果新固件声明 `208KB / 0x40000`，重启从 `0x20000` 启动后 `bls_ota_clearNewFwDataArea()` 会擦除 `0x00000 ~ 0x33FFF` 从而把自己擦掉。若未来固件超过 124 KB 需要改用 `0x40000`，该次迁移必须通过 SWS 线刷完成。
3. **`.bin` 必须满足 Telink `FW_CHECK_AGTHM2` 格式（已由 `examples/ble_sdk/make/tl_firmware_tools.py` 自动处理）**：
   - `cstartup_8258_RET_16K.S` 在 `0x06..0x07` 固定写入了 `0x5d 0x02`，`otaWrite()` 会强制开启 `FW_CHECK_AGTHM2`：
     - 原始 `.bin` 先用 `0xFF` 补齐到 16 字节整数倍；
     - `0x18..0x1B`（小端 `u32`）写入 `padded_len + 4`（因此文件总长度必须满足 `len % 16 == 4`）；
     - 尾部追加 4 字节**小端序** Telink CRC32（`crc32_half_tbl`，初值 `0xFFFFFFFF`，**无最终取反**，等价于 `(~zlib.crc32(padded)) & 0xFFFFFFFF`）。
   - 若 `0x18` 长度尾数不为 `4` 或 CRC 算法/字节序错误，`otaWrite()` 会在收到第 1 块或最后一块时立即触发 `OTA_FW_CHECK_ERR` 并调用 `start_reboot()` 断开连接。
