#include "cfg_store.h"
#include "drivers.h"

ble_uart_cfg_t g_cfg;

static u16 calc_crc16(const u8 *data, int len) {
    u16 crc = 0xFFFF;
    for (int i = 0; i < len; i++) {
        crc ^= data[i];
        for (int b = 0; b < 8; b++) {
            if (crc & 1) {
                crc = (crc >> 1) ^ 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

int cfg_baud_is_valid(u32 baud) {
    return (baud == 9600 || baud == 19200 || baud == 38400 ||
            baud == 57600 || baud == 115200 || baud == 230400);
}

void cfg_set_defaults(const u8 mac[6]) {
    static const char hex[] = "0123456789ABCDEF";
    memset(&g_cfg, 0, sizeof(g_cfg));
    g_cfg.magic   = CFG_MAGIC;
    g_cfg.version = CFG_VERSION;

    /* Default name: "ZK_UART_XXXX" using last 2 bytes of MAC */
    memcpy(g_cfg.name, "ZK_UART_", 8);
    g_cfg.name[8]  = hex[(mac[1] >> 4) & 0x0f];
    g_cfg.name[9]  = hex[mac[1] & 0x0f];
    g_cfg.name[10] = hex[(mac[0] >> 4) & 0x0f];
    g_cfg.name[11] = hex[mac[0] & 0x0f];
    g_cfg.name[12] = '\0';

    g_cfg.baudrate        = 115200;
    g_cfg.adv_interval_ms = 100;
    g_cfg.tx_power_level  = 3; /* +3.01 dBm */
    g_cfg.echo_en         = 0; /* Pure transparent by default */
    g_cfg.log_en          = 1; /* Print connect/disconnect notices on UART */
}

int cfg_load(const u8 mac[6]) {
    ble_uart_cfg_t tmp;
    flash_read_page(CFG_FLASH_ADDR, sizeof(tmp), (u8 *)&tmp);

    if (tmp.magic != CFG_MAGIC || tmp.version != CFG_VERSION) {
        cfg_set_defaults(mac);
        return 0;
    }

    u16 expect = calc_crc16(((const u8 *)&tmp) + 8, (int)sizeof(tmp) - 8);
    if (tmp.crc16 != expect || !cfg_baud_is_valid(tmp.baudrate) || tmp.name[0] == '\0') {
        cfg_set_defaults(mac);
        return 0;
    }

    tmp.name[CFG_NAME_MAX] = '\0';
    if (tmp.adv_interval_ms < 20 || tmp.adv_interval_ms > 2000) {
        tmp.adv_interval_ms = 100;
    }
    if (tmp.tx_power_level > 4) {
        tmp.tx_power_level = 3;
    }

    memcpy(&g_cfg, &tmp, sizeof(g_cfg));
    return 1;
}

void cfg_save(void) {
    g_cfg.magic   = CFG_MAGIC;
    g_cfg.version = CFG_VERSION;
    g_cfg.crc16   = calc_crc16(((const u8 *)&g_cfg) + 8, (int)sizeof(g_cfg) - 8);

    u8 r = irq_disable();
    flash_erase_sector(CFG_FLASH_ADDR);
    flash_write_page(CFG_FLASH_ADDR, sizeof(g_cfg), (u8 *)&g_cfg);
    irq_restore(r);
}

void cfg_reset_factory(const u8 mac[6]) {
    cfg_set_defaults(mac);
    cfg_save();
}
