# TLSR8250 (`AESL0213C` / `ZK_TESR21S_V2.1`) 开发与调试避坑笔记

本文档记录在 `AESL0213C-TLSR8250` 墨水屏价签上进行裸机开发、BLE 协议栈移植、低功耗休眠（Deep Retention）以及 Apple FindMy 调试过程中踩过的关键硬件与编译器坑点。

---

## 1. 启动头与 SRAM 上限（TLSR8250 vs TLSR8258）

上游开源 BLE SDK（如 `cstartup_8258_RET_16K.S`）默认针对 **TLSR8258（64KB SRAM）**，直接编译烧录到 **TLSR8250（48KB SRAM）** 会无法启动或运行崩溃。必须修正两处：

1. **Flash 启动头 `0x025d`**：偏移 `0x06..0x07` 必须包含 `.short (0x025d)`（配合 `0x08..0x0b` 的 `KNLT` 标识 `0x544c4e4b`），否则 TLSR8250 ROM Bootloader 不会从 Flash 启动。
2. **栈顶地址改为 `0x84c000`**：TLSR8258 栈顶为 `0x850000`（64KB），而 TLSR8250 实际 SRAM 为 48KB（`0x840000..0x84bfff`），不修改会在函数调用时直接栈溢出重启。

> 本仓库内置的 `examples/ble_sdk/components/boot/8258/cstartup_8258_RET_16K.S` 已包含上述两项补丁。

---

## 2. 低功耗休眠（Suspend / Deep Retention）必踩的 4 个坑

1. **唤醒后射频功率重置**：每次退出 Suspend / Deep Retention 后，RF 发射功率寄存器会复位，导致板子虽然定时醒来但信号极弱扫不到。必须：
   - 注册 `bls_app_registerEventCallback(BLT_EV_FLAG_SUSPEND_EXIT, &user_set_rf_power);`
   - 在 `user_init_deepRetn()` 中也调用 `rf_set_power_level_index(...)`。
2. **BLE FIFO 必须放在 Retention RAM**：`blt_rxfifo_b`、`blt_rxfifo`、`blt_txfifo_b`、`blt_txfifo` 必须加 `_attribute_data_retention_` 修饰，否则深睡唤醒后内存内容丢失。
3. **补全 Deep Retention 参数**：除了 `bls_pm_setSuspendMask(SUSPEND_ADV | DEEPSLEEP_RETENTION_ADV)`，还需显式调用：
   - `blc_pm_setDeepsleepRetentionThreshold(95, 95);`
   - `blc_pm_setDeepsleepRetentionEarlyWakeupTiming(240);`
   - `blc_pm_setDeepsleepRetentionType(DEEPSLEEP_MODE_RET_SRAM_LOW16K);`（需与链接脚本 `16k_retn` 匹配）
4. **切勿在唤醒路径中加长延时**：Deep Retention 唤醒后距射频发包窗口仅有约 1.5ms，若在 `main()` 或 `user_init_deepRetn()` 中加入 LED 闪烁等毫秒级延时，会直接错过 BLE 发射时隙。开机指示灯应只放在冷启动的 `user_init_normal()` 中。
5. **唤醒后重新使能 GPIO 输出**：Deep Retention 唤醒后普通 GPIO（如 LED `PB4`/`PB5`）的输出使能寄存器会被复位；业务代码里控制 LED 前需调用 `gpio_set_func(..., AS_GPIO)` 与 `gpio_set_output_en(..., 1)`，否则仅写 `gpio_write()` 不会点亮。

---

## 3. 无外部 32.768 kHz 晶振

本板仅焊接了 24 MHz 主晶振，**未焊接 32.768 kHz 外部晶振**：

- `main()` 第一行必须调用 `blc_pm_select_internal_32k_crystal();` 使用片内 32kHz RC。
- 使用他人预编译固件（如第三方 FindMy `.bin`）若无广播，很可能是对方编译时启用了外部 32kHz 晶振。

---

## 4. 二进制补丁与 GCC `-O2` 常量折叠

当固件使用固定占位符字符串（例如 FindMy 的 `OFFLINEFINDINGPUBLICKEYHERE!`）并计划在编译后用脚本直接替换 `.bin` 中的字节时：

- 若声明为 `static const u8 public_key[28] = ...`，GCC `-O2` 会将单字节读取（如 `public_key[0] | 0xC0`）直接**常量折叠为立即数指令**，导致修改 `.bin` 中的 `.rodata` 后，派生出的 BLE MAC 依然是占位符的值。
- **解法**：声明为 `static volatile const u8 public_key[28]` 并在运行时逐字节读取到局部变量，彻底禁止编译器常量折叠。

---

## 5. Apple FindMy 地址类型与扫描器过滤

- Apple Offline Finding 规范要求使用 **Random Static Address (`TxAdd=1`)**，需先调用 `blc_ll_setRandomAddr(mac_addr)`，并在 `bls_ll_setAdvParam` 中传入 `OWN_ADDRESS_RANDOM`（而非 `OWN_ADDRESS_PUBLIC`）。
- 在 Linux 上使用 `bluetoothctl` 验证不可连接（`ADV_NONCONN_IND`）广播时，默认的 `scan on` 可能过滤掉无 Flags 的广播包，建议使用 `scan le`（或手机端 nRF Connect 关闭所有过滤器）进行验证。

---

## 6. 善用硬件串口日志与 Flash 分区保护

- 背面焊盘 **`TXD = PC2`、`RXD = PC3`** 是 TLSR8250 原生硬件 UART，可与 `SWS (PA7)` 烧录同时连接、互不干扰。遇到 BLE 不广播或休眠异常时，优先通过 `115200 8N1` 打印 API 返回值与唤醒心跳，比看 LED 盲猜效率高得多。
- **Flash 关键分区切勿误擦**：
  - `0x76000`：原厂唯一 BLE MAC
  - `0x77000`：出厂晶振频偏校准电容值
  - `0x78000`：原厂墨水屏参数
  - `0x79000`：`ATC_BLE_OEPL` 动态配置区（异常时用 `./scripts/reset_cfg.sh` 仅擦 `0x79000..0x7ffff`）
  - `0x7A000`：`03_ble_uart_bridge` 配置持久化扇区

---

## 7. Telink BLE OTA 双分区与 `FW_CHECK_AGTHM2` 避坑

1. **`bls_ota_set_fwSize_and_fwBootAddr()` 必须在 `main()` 中、`cpu_wakeup_init()` 之前调用**：
   - `cpu_wakeup_init()` 内部的 `cpu_wakeup_no_deepretn_back_init()` 会将 `ota_program_bootAddr` 写入 `ota_program_offset`（两者均位于 `.retention_data`，深睡不丢失）。放到 `user_init_normal()` 中调用为时已晚，会导致 `ota_program_offset` 停留在默认值 `0x20000`。
2. **推荐固定使用 `124KB / 0x20000` 非重叠双分区**：
   - A 区 `0x00000..0x1EFFF`、B 区 `0x20000..0x3EFFF`，互不重叠且远离 `0x76000` 出厂 MAC。
   - **禁止跨分区方案做无线 OTA**：若旧固件把新固件写入 `0x20000`，而新固件声明了 `208KB / 0x40000`，重启从 `0x20000` 启动后 `bls_ota_clearNewFwDataArea()` 会擦除 `0x00000..0x33FFF`，直接把自己擦掉。
3. **固件 `.bin` 必须满足 Telink `FW_CHECK_AGTHM2` 格式**：
   - `cstartup_8258_RET_16K.S` 在 `0x06..0x07` 固定写入了 `0x5d 0x02`，`liblt_8258.a` 的 `otaWrite()` 会强制校验：
     - 原始 `.bin` 用 `0xFF` 补齐到 16 字节对齐；
     - `0x18..0x1B`（小端 `u32`）写入 `padded_len + 4`（因此文件总长度必须满足 `len % 16 == 4`）；
     - 尾部追加 4 字节**小端序** Telink CRC32（`crc32_half_tbl`，初值 `0xFFFFFFFF`，无最终取反，等价于 `(~zlib.crc32(padded)) & 0xFFFFFFFF`）。
   - 本仓库内置的 `examples/ble_sdk/make/tl_firmware_tools.py` 已修复并自动完成上述后处理。
