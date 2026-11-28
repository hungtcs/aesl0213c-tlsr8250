# Telink BLE OTA 无线升级协议说明

- **对应原页面**：`web/ble_ota.html`
- **移植代码**：`webapp/src/lib/ota.ts` + `webapp/src/pages/tools/BleOtaPage.tsx`
- **一致性测试**：`webapp/src/lib/__tests__/ota.test.ts`

---

## 1. GATT 服务与特征

| 项目               | UUID                                   | 说明                                    |
| ------------------ | -------------------------------------- | --------------------------------------- |
| OTA Service        | `00010203-0405-0607-0809-0a0b0c0d1912` | Telink 私有 OTA 服务                    |
| OTA Characteristic | `00010203-0405-0607-0809-0a0b0c0d2b12` | 支持 `READ` 与 `WRITE_WITHOUT_RESPONSE` |

---

## 2. 为什么这样写（关键协议设计解析）

### 2.1 固件魔数校验（偏移 `0x08` 处为 `4b4e4c54`）

- Telink 825x 启动头在文件偏移 8~11 字节写入固定标识 `0x544C4E4B`（小端字节序即 `4b 4e 4c 54`，ASCII `"KNLT"` / 倒读 `"TLNK"`）。
- 在发送前校验这 4 字节，能防止误选非 Telink `.bin` 文件把设备刷成砖。

### 2.2 为什么按 16 字节对齐并用 `0xFF` 填充？

- Telink 蓝牙 OTA 协议规定每个数据包携带 **16 字节固件正文**；加上 2 字节块序号和 2 字节 CRC16，正好 **20 字节**，完美贴合 BLE 4.0 默认 ATT MTU（23 字节 − 3 字节 ATT 头 = 20 字节），无需依赖高 MTU 协商。
- SPI Nor Flash 擦除后的空白态是 `0xFF`，尾部不足 16 字节用 `0xFF` 填充不会引入多余编程位。

### 2.3 握手、分块与 CRC16-Modbus

1. **启动序列**：先写 `00ff`（OTA 准备/版本查询），再写 `01ff`（进入 OTA 接收状态），并等待 300ms 让芯片擦除/准备目标分区。
2. **单块 20 字节结构**：
   ```
   [块序号 u16 LE (2B)] [固件数据 (16B)] [CRC16-Modbus u16 LE (2B)]
   ```
   CRC16 多项式为 `0xA001`、初值 `0xFFFF`，覆盖前 18 字节（块序号 + 16B 数据）。
3. **为什么每 8 块调用一次 `readValue()`？**
   - Telink OTA 特征默认走 `writeWithoutResponse`（无应答写入）以追求速度；如果浏览器一口气把几千个包全塞给系统蓝牙栈，芯片端来不及写 Flash 就会丢包。
   - 每发 8 块（128 字节）执行一次同步 GATT `readValue()`，强制等待芯片端把缓冲区写入 Flash 并返回 ATT Read Response，起到**轻量级硬件流控**作用。
4. **结束校验帧（`02ff`）**：
   ```
   [0x02, 0xFF] [lastBlockIndex u16 LE] [~lastBlockIndex & 0xFFFF u16 LE]
   ```
   把最后一块序号及其按位取反值一起发给芯片，芯片核对总块数无误后设置启动标志并自动重启切换到新固件。
