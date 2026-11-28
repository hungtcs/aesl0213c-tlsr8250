#pragma once

#include "tl_common.h"

/*
 * Persistent configuration stored in internal Flash at 0x7A000
 * (Safe area: Firmware 0x00000..0x3FFFF, OTA 0x40000..0x73FFF,
 *  Factory MAC 0x76000, XTAL cap 0x77000, Factory EPD cfg 0x78000)
 */
#define CFG_FLASH_ADDR   0x7A000
#define CFG_MAGIC        0x5A4B5554UL /* "ZKUT" */
#define CFG_VERSION      1

#define CFG_NAME_MAX     20

typedef struct __attribute__((packed)) {
    u32 magic;
    u16 version;
    u16 crc16;

    char name[CFG_NAME_MAX + 1]; /* Null-terminated BLE device name */
    u8   reserved0;
    u32  baudrate;               /* 9600 / 19200 / 38400 / 57600 / 115200 / 230400 */
    u16  adv_interval_ms;        /* 20 .. 2000 ms */
    u8   tx_power_level;         /* 0..4 preset index */
    u8   echo_en;                /* 0 = off, 1 = echo BLE RX back to BLE TX */
    u8   log_en;                 /* 0 = pure transparent UART, 1 = print status logs */
    u8   reserved[7];
} ble_uart_cfg_t;

extern ble_uart_cfg_t g_cfg;

void cfg_set_defaults(const u8 mac[6]);
int  cfg_load(const u8 mac[6]);
void cfg_save(void);
void cfg_reset_factory(const u8 mac[6]);
int  cfg_baud_is_valid(u32 baud);
