#include "tl_common.h"
#include "drivers.h"
#include "stack/ble/ble.h"
#include "stack/ble/service/ble_ll_ota.h"
#include "app_config.h"
#include "cfg_store.h"
#include "uart_hal.h"
#include "vbat.h"

/*
 * ZK_TESR21S_V2.1 (AESL0213C-TLSR8250) Production BLE <-> UART Transparent Bridge
 *
 * Features:
 *   - MTU up to 247 bytes (244B payload) + DLE (Data Length Extension)
 *   - 1KB UART RX ring buffer + packet batching (full-MTU or 15ms idle) + TX retry queue
 *   - Dual GATT services:
 *       1) Nordic UART Service (NUS): 6E400001 / RX=6E400002 / TX=6E400003
 *       2) Generic 16-bit UART Service: 0xFFE0 / RW+Notify=0xFFE1
 *   - Built-in Telink BLE OTA Service (0x1912 / 0x2B12) compatible with web/ble_ota.html
 *   - Full AT command suite (when disconnected, or enter via "+++" while connected)
 *   - Flash-persisted config @ 0x7A000 (name, baudrate, TX power, adv interval, echo, log)
 *   - Factory MAC from Flash @ 0x76000 + internal 14-bit SAR ADC VBAT measurement
 *   - Dual LED state indicator (RED=PB4, GRN=PB5) + Hardware Watchdog
 */

#define FW_VERSION_STR   "1.0.0"
#define FACTORY_MAC_ADDR 0x76000
#define MAX_ATT_MTU      247
#define MAX_NOTIFY_LEN   (MAX_ATT_MTU - 3)

#define LED_RED          GPIO_PB4
#define LED_GRN          GPIO_PB5

/* Hardware control pins repurposed from unused EPD connector (for screenless board) */
#define PIN_BLE_STATE    GPIO_PA1  /* Output: HIGH(3.3V) = BLE Connected, LOW(0V) = Disconnected */
#define PIN_AT_KEY       GPIO_PA0  /* Input (10K pull-up): pull LOW(GND) to force AT mode */

/* ---------------- BLE Link Layer RX/TX FIFOs (sized for MTU 247 + DLE) ---------------- */
#define RX_FIFO_SIZE     264
#define RX_FIFO_NUM      4
#define TX_FIFO_SIZE     264
#define TX_FIFO_NUM      8

MYFIFO_INIT(blt_rxfifo, RX_FIFO_SIZE, RX_FIFO_NUM);
MYFIFO_INIT(blt_txfifo, TX_FIFO_SIZE, TX_FIFO_NUM);

/* ---------------- RF TX Power Presets ---------------- */
static const RF_PowerTypeDef s_txpwr_tbl[5] = {
    RF_POWER_N9p89dBm,  /* 0: -9.9 dBm */
    RF_POWER_N3p61dBm,  /* 1: -3.6 dBm */
    RF_POWER_P0p04dBm,  /* 2:  0.0 dBm */
    RF_POWER_P3p01dBm,  /* 3: +3.0 dBm */
    RF_POWER_P10p29dBm, /* 4: +10.3 dBm */
};
static const char *s_txpwr_str[5] = {
    "-9.9dBm", "-3.6dBm", "0dBm", "+3.0dBm", "+10.3dBm"
};

/* ---------------- Runtime State ---------------- */
static u8  s_mac[6];
static volatile int s_ble_connected = 0;
static volatile int s_ota_active    = 0;
static int s_at_mode_when_conn      = 0;

static u16 s_nus_tx_ccc = 0;
static u16 s_ffe1_ccc   = 0;

static u8  s_nus_tx_val[20] = "ZK_UART";
static u8  s_nus_rx_val[20] = {0};
static u8  s_ffe1_val[20]   = {0};
static u8  s_ota_val[20]    = {0};

/* Pending BLE Notify packet (backpressure retry buffer) */
static u8  s_pending_buf[MAX_NOTIFY_LEN];
static int s_pending_len   = 0;
static int s_pending_mask  = 0; /* BIT(0)=NUS, BIT(1)=FFE1 */

/* AT command line buffer */
static char s_at_line[80];
static int  s_at_len = 0;

/* LED pulse timers */
static u32 s_led_red_off_tick = 0;
static u32 s_led_grn_off_tick = 0;
static u32 s_led_hb_tick      = 0;

/* ---------------- GATT Attribute Table ---------------- */
static const u16 primaryServiceUUID = GATT_UUID_PRIMARY_SERVICE;
static const u16 characterUUID      = GATT_UUID_CHARACTER;
static const u16 clientCharCfgUUID  = GATT_UUID_CLIENT_CHAR_CFG;
static const u16 userDescUUID       = GATT_UUID_CHAR_USER_DESC;

static const u16 gapServiceUUID     = SERVICE_UUID_GENERIC_ACCESS;
static const u16 devNameUUID        = GATT_UUID_DEVICE_NAME;
static const u16 appearanceUUID     = GATT_UUID_APPEARANCE;
static const u16 my_appearance      = 0x0000;

/* Nordic UART Service (NUS) */
static const u8 nusServiceUUID[16] = {
    0x9e, 0xca, 0xdc, 0x24, 0x0e, 0xe5, 0xa9, 0xe0,
    0x93, 0xf3, 0xa3, 0xb5, 0x01, 0x00, 0x40, 0x6e
};
static const u8 nusRxCharUUID[16] = {
    0x9e, 0xca, 0xdc, 0x24, 0x0e, 0xe5, 0xa9, 0xe0,
    0x93, 0xf3, 0xa3, 0xb5, 0x02, 0x00, 0x40, 0x6e
};
static const u8 nusTxCharUUID[16] = {
    0x9e, 0xca, 0xdc, 0x24, 0x0e, 0xe5, 0xa9, 0xe0,
    0x93, 0xf3, 0xa3, 0xb5, 0x03, 0x00, 0x40, 0x6e
};

/* Generic 16-bit UART Service (0xFFE0 / 0xFFE1) */
static const u16 ffe0ServiceUUID = 0xFFE0;
static const u16 ffe1CharUUID    = 0xFFE1;

/* Telink Standard OTA Service (0x1912 / 0x2B12) */
static const u8 otaServiceUUID[16] = TELINK_OTA_UUID_SERVICE;
static const u8 otaCharUUID[16]    = TELINK_SPP_DATA_OTA;
static const u8 otaDescStr[]       = "OTA";

static const u8 propWrite      = CHAR_PROP_WRITE | CHAR_PROP_WRITE_WITHOUT_RSP;
static const u8 propNotifyRead = CHAR_PROP_NOTIFY | CHAR_PROP_READ;
static const u8 propRWNotify   = CHAR_PROP_READ | CHAR_PROP_WRITE | CHAR_PROP_WRITE_WITHOUT_RSP | CHAR_PROP_NOTIFY;
static const u8 propOTA        = CHAR_PROP_READ | CHAR_PROP_WRITE_WITHOUT_RSP;

static const u8 gapNameCharVal[5] = {
    CHAR_PROP_READ,
    U16_LO(3), U16_HI(3),
    U16_LO(GATT_UUID_DEVICE_NAME), U16_HI(GATT_UUID_DEVICE_NAME)
};
static const u8 gapAppearanceCharVal[5] = {
    CHAR_PROP_READ,
    U16_LO(5), U16_HI(5),
    U16_LO(GATT_UUID_APPEARANCE), U16_HI(GATT_UUID_APPEARANCE)
};

enum {
    ATT_H_START = 0,
    /* GAP: 1..5 */
    GAP_PS_H,
    GAP_NAME_CD_H,
    GAP_NAME_DP_H,
    GAP_APPEAR_CD_H,
    GAP_APPEAR_DP_H,
    /* NUS: 6..11 */
    NUS_PS_H,
    NUS_RX_CD_H,
    NUS_RX_DP_H,
    NUS_TX_CD_H,
    NUS_TX_DP_H,
    NUS_TX_CCC_H,
    /* FFE0: 12..15 */
    FFE0_PS_H,
    FFE1_CD_H,
    FFE1_DP_H,
    FFE1_CCC_H,
    /* OTA: 16..19 */
    OTA_PS_H,
    OTA_CD_H,
    OTA_DP_H,
    OTA_DESC_H,
    ATT_END_H,
};

/* ---------------- Helpers ---------------- */
static void led_pulse_red(u32 us) {
    gpio_write(LED_RED, 0);
    s_led_red_off_tick = clock_time() + us * CLOCK_SYS_CLOCK_1US;
    if (s_led_red_off_tick == 0) s_led_red_off_tick = 1;
}

static void led_pulse_grn(u32 us) {
    /* When connected (Green solid ON), briefly turn OFF to blink visibly; when ADV, turn ON */
    gpio_write(LED_GRN, s_ble_connected ? 1 : 0);
    s_led_grn_off_tick = clock_time() + us * CLOCK_SYS_CLOCK_1US;
    if (s_led_grn_off_tick == 0) s_led_grn_off_tick = 1;
}

static void log_puts(const char *s) {
    if (g_cfg.log_en) {
        uart_hal_puts(s);
    }
}

static int get_effective_payload_max(void) {
    int mtu = (int)blc_att_getEffectiveMtuSize(BLS_CONN_HANDLE);
    int payload = mtu - 3;
    if (payload < 20) payload = 20;
    if (payload > MAX_NOTIFY_LEN) payload = MAX_NOTIFY_LEN;
    return payload;
}

static void print_mac(void) {
    for (int i = 5; i >= 0; i--) {
        uart_hal_put_hex8(s_mac[i]);
        if (i > 0) uart_hal_putc(':');
    }
}

static void apply_ble_adv_config(void) {
    u8 adv_data[31];
    int idx = 0;

    /* Flags */
    adv_data[idx++] = 0x02;
    adv_data[idx++] = 0x01;
    adv_data[idx++] = 0x06;

    /* Complete Local Name */
    int name_len = (int)strlen(g_cfg.name);
    if (name_len > CFG_NAME_MAX) name_len = CFG_NAME_MAX;
    adv_data[idx++] = (u8)(name_len + 1);
    adv_data[idx++] = 0x09;
    memcpy(&adv_data[idx], g_cfg.name, (unsigned int)name_len);
    idx += name_len;

    /* Scan Response: 16-bit FFE0 + 128-bit NUS UUID */
    static const u8 scan_rsp[] = {
        0x03, 0x03, 0xE0, 0xFF,
        0x11, 0x07,
        0x9e, 0xca, 0xdc, 0x24, 0x0e, 0xe5, 0xa9, 0xe0,
        0x93, 0xf3, 0xa3, 0xb5, 0x01, 0x00, 0x40, 0x6e
    };

    bls_ll_setAdvData(adv_data, (u8)idx);
    bls_ll_setScanRspData((u8 *)scan_rsp, sizeof(scan_rsp));

    /* Convert ms to 0.625ms units: units = ms * 8 / 5 */
    u16 interval = (u16)((u32)g_cfg.adv_interval_ms * 8 / 5);
    if (interval < 0x0020) interval = 0x0020;
    if (interval > 0x0C80) interval = 0x0C80;

    bls_ll_setAdvParam(
        interval,
        interval,
        ADV_TYPE_CONNECTABLE_UNDIRECTED,
        OWN_ADDRESS_PUBLIC,
        0,
        NULL,
        BLT_ENABLE_ADV_ALL,
        ADV_FP_NONE
    );
    rf_set_power_level_index(s_txpwr_tbl[g_cfg.tx_power_level]);
}

/* ---------------- GATT Write Callbacks ---------------- */
static int handle_ble_rx_data(const u8 *data, int len, u16 reply_handle, u16 reply_ccc) {
    if (len <= 0) return 0;

    led_pulse_grn(60000);

    /* Forward raw bytes directly to UART TX */
    uart_hal_write(data, len);

    /* Optional echo back to phone */
    if (g_cfg.echo_en && s_ble_connected && (reply_ccc & CLIENT_CHAR_CFG_NOTI)) {
        int max_p = get_effective_payload_max();
        int send_len = (len > max_p) ? max_p : len;
        bls_att_pushNotifyData(reply_handle, (u8 *)data, send_len);
    }
    return 0;
}

static int nus_rx_write_cb(void *p) {
    rf_packet_att_write_t *pw = (rf_packet_att_write_t *)p;
    return handle_ble_rx_data(&pw->value, (int)pw->l2capLen - 3, NUS_TX_DP_H, s_nus_tx_ccc);
}

static int nus_tx_ccc_write_cb(void *p) {
    rf_packet_att_write_t *pw = (rf_packet_att_write_t *)p;
    if (pw->l2capLen >= 5) {
        u8 *v = &pw->value;
        s_nus_tx_ccc = (u16)(v[0] | (v[1] << 8));
        log_puts((s_nus_tx_ccc & CLIENT_CHAR_CFG_NOTI) ? "\r\n+NUS_NOTIFY:1\r\n" : "\r\n+NUS_NOTIFY:0\r\n");
    }
    return 0;
}

static int ffe1_write_cb(void *p) {
    rf_packet_att_write_t *pw = (rf_packet_att_write_t *)p;
    return handle_ble_rx_data(&pw->value, (int)pw->l2capLen - 3, FFE1_DP_H, s_ffe1_ccc);
}

static int ffe1_ccc_write_cb(void *p) {
    rf_packet_att_write_t *pw = (rf_packet_att_write_t *)p;
    if (pw->l2capLen >= 5) {
        u8 *v = &pw->value;
        s_ffe1_ccc = (u16)(v[0] | (v[1] << 8));
        log_puts((s_ffe1_ccc & CLIENT_CHAR_CFG_NOTI) ? "\r\n+FFE1_NOTIFY:1\r\n" : "\r\n+FFE1_NOTIFY:0\r\n");
    }
    return 0;
}

static attribute_t s_attributes[] = {
    { ATT_END_H - 1, 0, 0, 0, 0, 0, 0, 0 },

    /* 1..5: GAP Service */
    { 5, ATT_PERMISSIONS_READ, 2, 2, (u8 *)&primaryServiceUUID, (u8 *)&gapServiceUUID, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, sizeof(gapNameCharVal), (u8 *)&characterUUID, (u8 *)gapNameCharVal, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, CFG_NAME_MAX, (u8 *)&devNameUUID, (u8 *)g_cfg.name, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, sizeof(gapAppearanceCharVal), (u8 *)&characterUUID, (u8 *)gapAppearanceCharVal, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, sizeof(my_appearance), (u8 *)&appearanceUUID, (u8 *)&my_appearance, 0, 0 },

    /* 6..11: Nordic UART Service (NUS) */
    { 6, ATT_PERMISSIONS_READ, 2, 16, (u8 *)&primaryServiceUUID, (u8 *)nusServiceUUID, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, 1, (u8 *)&characterUUID, (u8 *)&propWrite, 0, 0 },
    { 0, ATT_PERMISSIONS_WRITE, 16, sizeof(s_nus_rx_val), (u8 *)nusRxCharUUID, s_nus_rx_val, nus_rx_write_cb, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, 1, (u8 *)&characterUUID, (u8 *)&propNotifyRead, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 16, sizeof(s_nus_tx_val), (u8 *)nusTxCharUUID, s_nus_tx_val, 0, 0 },
    { 0, ATT_PERMISSIONS_RDWR, 2, sizeof(s_nus_tx_ccc), (u8 *)&clientCharCfgUUID, (u8 *)&s_nus_tx_ccc, nus_tx_ccc_write_cb, 0 },

    /* 12..15: Generic 16-bit UART Service (0xFFE0 / 0xFFE1) */
    { 4, ATT_PERMISSIONS_READ, 2, 2, (u8 *)&primaryServiceUUID, (u8 *)&ffe0ServiceUUID, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, 1, (u8 *)&characterUUID, (u8 *)&propRWNotify, 0, 0 },
    { 0, ATT_PERMISSIONS_RDWR, 2, sizeof(s_ffe1_val), (u8 *)&ffe1CharUUID, s_ffe1_val, ffe1_write_cb, 0 },
    { 0, ATT_PERMISSIONS_RDWR, 2, sizeof(s_ffe1_ccc), (u8 *)&clientCharCfgUUID, (u8 *)&s_ffe1_ccc, ffe1_ccc_write_cb, 0 },

    /* 16..19: Telink Standard BLE OTA Service */
    { 4, ATT_PERMISSIONS_READ, 2, 16, (u8 *)&primaryServiceUUID, (u8 *)otaServiceUUID, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, 1, (u8 *)&characterUUID, (u8 *)&propOTA, 0, 0 },
    { 0, ATT_PERMISSIONS_RDWR, 16, sizeof(s_ota_val), (u8 *)otaCharUUID, s_ota_val, otaWrite, otaRead },
    { 0, ATT_PERMISSIONS_READ, 2, sizeof(otaDescStr) - 1, (u8 *)&userDescUUID, (u8 *)otaDescStr, 0, 0 },
};

/* ---------------- BLE & OTA Event Callbacks ---------------- */
static void ble_connect_cb(u8 e, u8 *p, int n) {
    (void)e; (void)p; (void)n;
    s_ble_connected = 1;
    s_at_mode_when_conn = 0;
    s_nus_tx_ccc = 0;
    s_ffe1_ccc   = 0;
    s_pending_len = 0;
    s_pending_mask = 0;
    s_at_len = 0;
    uart_hal_rx_clear();

    /* Request larger MTU (247) & low-latency connection interval (15..30ms) */
    blc_att_requestMtuSizeExchange(BLS_CONN_HANDLE, MAX_ATT_MTU);
    bls_l2cap_requestConnParamUpdate(12, 24, 0, 400);

    gpio_write(LED_GRN, 0);
    gpio_write(PIN_BLE_STATE, 1);
    log_puts("\r\n+CONNECTED\r\n");
}

static void ble_terminate_cb(u8 e, u8 *p, int n) {
    (void)e; (void)n;
    s_ble_connected = 0;
    s_ota_active    = 0;
    s_at_mode_when_conn = 0;
    s_nus_tx_ccc = 0;
    s_ffe1_ccc   = 0;
    s_pending_len = 0;
    s_pending_mask = 0;
    uart_hal_rx_clear();

    gpio_write(LED_GRN, 1);
    gpio_write(LED_RED, 1);
    gpio_write(PIN_BLE_STATE, 0);
    if (g_cfg.log_en) {
        uart_hal_puts("\r\n+DISCONNECTED:0x");
        uart_hal_put_hex8(p ? p[0] : 0);
        uart_hal_puts("\r\n");
    }
}

static void ota_start_cb(void) {
    s_ota_active = 1;
    log_puts("\r\n+OTA_START\r\n");
}

static void ota_result_cb(int result) {
    s_ota_active = 0;
    if (g_cfg.log_en) {
        uart_hal_puts("\r\n+OTA_RESULT:");
        uart_hal_put_u32((u32)result);
        uart_hal_puts("\r\n");
    }
}

/* ---------------- AT Command Parser ---------------- */
static int str_starts_with(const char *s, const char *prefix) {
    while (*prefix) {
        if (*s++ != *prefix++) return 0;
    }
    return 1;
}

static u32 parse_u32(const char *s, int *ok) {
    u32 v = 0;
    if (*s < '0' || *s > '9') {
        *ok = 0;
        return 0;
    }
    while (*s >= '0' && *s <= '9') {
        v = v * 10 + (u32)(*s - '0');
        s++;
    }
    *ok = (*s == '\0');
    return v;
}

static void at_print_info(void) {
    u16 mv = vbat_read_mv();
    uart_hal_puts("+VER:" FW_VERSION_STR "\r\n");
    uart_hal_puts("+MAC:"); print_mac(); uart_hal_puts("\r\n");
    uart_hal_puts("+NAME:"); uart_hal_puts(g_cfg.name); uart_hal_puts("\r\n");
    uart_hal_puts("+BAUD:"); uart_hal_put_u32(g_cfg.baudrate); uart_hal_puts("\r\n");
    uart_hal_puts("+TXPWR:"); uart_hal_put_u32(g_cfg.tx_power_level);
    uart_hal_puts(" ("); uart_hal_puts(s_txpwr_str[g_cfg.tx_power_level]); uart_hal_puts(")\r\n");
    uart_hal_puts("+ADVINT:"); uart_hal_put_u32(g_cfg.adv_interval_ms); uart_hal_puts("ms\r\n");
    uart_hal_puts("+ECHO:"); uart_hal_put_u32(g_cfg.echo_en); uart_hal_puts("\r\n");
    uart_hal_puts("+LOG:"); uart_hal_put_u32(g_cfg.log_en); uart_hal_puts("\r\n");
    uart_hal_puts("+STATE:"); uart_hal_puts(s_ble_connected ? "CONNECTED" : "ADV"); uart_hal_puts("\r\n");
    uart_hal_puts("+MTU:"); uart_hal_put_u32(blc_att_getEffectiveMtuSize(BLS_CONN_HANDLE)); uart_hal_puts("\r\n");
    uart_hal_puts("+VBAT:"); uart_hal_put_u32(mv); uart_hal_puts("mV\r\n");
    uart_hal_puts("OK\r\n");
}

static void at_print_help(void) {
    uart_hal_puts("AT Commands:\r\n");
    uart_hal_puts("  AT / AT+HELP / AT+INFO? / AT+VBAT?\r\n");
    uart_hal_puts("  AT+NAME=<str>        (1..20 chars)\r\n");
    uart_hal_puts("  AT+BAUD=<rate>       (9600/19200/38400/57600/115200/230400)\r\n");
    uart_hal_puts("  AT+TXPWR=<0..4>      (-9.5/-3.9/0/+3.0/+10.3 dBm)\r\n");
    uart_hal_puts("  AT+ADVINT=<20..2000> (ms)\r\n");
    uart_hal_puts("  AT+ECHO=<0|1>        (echo BLE RX back to phone)\r\n");
    uart_hal_puts("  AT+LOG=<0|1>         (print connect/disconnect notices)\r\n");
    uart_hal_puts("  AT+DISC / AT+EXIT / AT+RESET / AT+DEFAULT\r\n");
    uart_hal_puts("  (While connected, send +++ to enter AT mode)\r\n");
    uart_hal_puts("OK\r\n");
}

static void process_at_command(char *cmd) {
    /* Trim trailing CR/LF/spaces */
    int len = (int)strlen(cmd);
    while (len > 0 && (cmd[len - 1] == '\r' || cmd[len - 1] == '\n' || cmd[len - 1] == ' ')) {
        cmd[--len] = '\0';
    }
    if (len == 0) return;

    if (strcmp(cmd, "AT") == 0) {
        uart_hal_puts("OK\r\n");
    } else if (strcmp(cmd, "AT+HELP") == 0 || strcmp(cmd, "AT+?") == 0) {
        at_print_help();
    } else if (strcmp(cmd, "AT+INFO?") == 0 || strcmp(cmd, "AT+VER?") == 0) {
        at_print_info();
    } else if (strcmp(cmd, "AT+VBAT?") == 0) {
        uart_hal_puts("+VBAT:");
        uart_hal_put_u32(vbat_read_mv());
        uart_hal_puts("mV\r\nOK\r\n");
    } else if (str_starts_with(cmd, "AT+NAME=")) {
        const char *val = cmd + 8;
        int nlen = (int)strlen(val);
        if (nlen >= 1 && nlen <= CFG_NAME_MAX) {
            memset(g_cfg.name, 0, sizeof(g_cfg.name));
            memcpy(g_cfg.name, val, (unsigned int)nlen);
            s_attributes[GAP_NAME_DP_H].attrLen = (u32)nlen;
            cfg_save();
            apply_ble_adv_config();
            uart_hal_puts("OK\r\n");
        } else {
            uart_hal_puts("ERROR\r\n");
        }
    } else if (str_starts_with(cmd, "AT+BAUD=")) {
        int ok = 0;
        u32 baud = parse_u32(cmd + 8, &ok);
        if (ok && cfg_baud_is_valid(baud)) {
            g_cfg.baudrate = baud;
            cfg_save();
            uart_hal_puts("OK\r\n");
            uart_hal_flush_tx();
            uart_hal_init(g_cfg.baudrate);
        } else {
            uart_hal_puts("ERROR\r\n");
        }
    } else if (str_starts_with(cmd, "AT+TXPWR=")) {
        int ok = 0;
        u32 lvl = parse_u32(cmd + 9, &ok);
        if (ok && lvl <= 4) {
            g_cfg.tx_power_level = (u8)lvl;
            cfg_save();
            rf_set_power_level_index(s_txpwr_tbl[g_cfg.tx_power_level]);
            uart_hal_puts("OK\r\n");
        } else {
            uart_hal_puts("ERROR\r\n");
        }
    } else if (str_starts_with(cmd, "AT+ADVINT=")) {
        int ok = 0;
        u32 ms = parse_u32(cmd + 10, &ok);
        if (ok && ms >= 20 && ms <= 2000) {
            g_cfg.adv_interval_ms = (u16)ms;
            cfg_save();
            apply_ble_adv_config();
            uart_hal_puts("OK\r\n");
        } else {
            uart_hal_puts("ERROR\r\n");
        }
    } else if (str_starts_with(cmd, "AT+ECHO=")) {
        if (cmd[8] == '0' || cmd[8] == '1') {
            g_cfg.echo_en = (u8)(cmd[8] - '0');
            cfg_save();
            uart_hal_puts("OK\r\n");
        } else {
            uart_hal_puts("ERROR\r\n");
        }
    } else if (str_starts_with(cmd, "AT+LOG=")) {
        if (cmd[7] == '0' || cmd[7] == '1') {
            g_cfg.log_en = (u8)(cmd[7] - '0');
            cfg_save();
            uart_hal_puts("OK\r\n");
        } else {
            uart_hal_puts("ERROR\r\n");
        }
    } else if (strcmp(cmd, "AT+DISC") == 0) {
        if (s_ble_connected) {
            bls_ll_terminateConnection(HCI_ERR_REMOTE_USER_TERM_CONN);
        }
        uart_hal_puts("OK\r\n");
    } else if (strcmp(cmd, "AT+EXIT") == 0) {
        s_at_mode_when_conn = 0;
        uart_hal_puts("OK\r\n");
    } else if (strcmp(cmd, "AT+RESET") == 0) {
        uart_hal_puts("OK\r\n");
        uart_hal_flush_tx();
        start_reboot();
    } else if (strcmp(cmd, "AT+DEFAULT") == 0) {
        cfg_reset_factory(s_mac);
        uart_hal_puts("OK\r\n");
        uart_hal_flush_tx();
        start_reboot();
    } else {
        uart_hal_puts("ERROR\r\n");
    }
}

/* ---------------- Transparent UART -> BLE Pump with Retry ---------------- */
static void pump_pending_ble_tx(void) {
    if (!s_ble_connected || s_pending_len <= 0) {
        s_pending_len = 0;
        s_pending_mask = 0;
        return;
    }

    if (s_pending_mask & BIT(0)) {
        if (bls_att_pushNotifyData(NUS_TX_DP_H, s_pending_buf, s_pending_len) == BLE_SUCCESS) {
            s_pending_mask &= ~BIT(0);
            led_pulse_red(60000);
        }
    }
    if (s_pending_mask & BIT(1)) {
        if (bls_att_pushNotifyData(FFE1_DP_H, s_pending_buf, s_pending_len) == BLE_SUCCESS) {
            s_pending_mask &= ~BIT(1);
            led_pulse_red(60000);
        }
    }

    if (s_pending_mask == 0) {
        s_pending_len = 0;
    }
}

static void pump_uart_data(void) {
    int hw_at_key = (gpio_read(PIN_AT_KEY) == 0);
    int in_at_mode = (!s_ble_connected) || s_at_mode_when_conn || hw_at_key;

    if (in_at_mode) {
        u8 c;
        while (uart_hal_rx_pop(&c)) {
            if (c == '\r' || c == '\n') {
                if (s_at_len > 0) {
                    s_at_line[s_at_len] = '\0';
                    process_at_command(s_at_line);
                    s_at_len = 0;
                }
            } else if (s_at_len < (int)sizeof(s_at_line) - 1) {
                s_at_line[s_at_len++] = (char)c;
            }
        }
        return;
    }

    /* Connected transparent mode: retry any pending packet first */
    if (s_pending_len > 0) {
        pump_pending_ble_tx();
        if (s_pending_len > 0) {
            return; /* Still waiting for BLE TX FIFO space */
        }
    }

    int avail = uart_hal_rx_count();
    if (avail == 0) return;

    int max_payload = get_effective_payload_max();
    int idle_15ms = clock_time_exceed(uart_hal_last_rx_tick(), 15000);

    if (avail >= max_payload || idle_15ms) {
        int take = (avail > max_payload) ? max_payload : avail;
        int n = uart_hal_rx_read(s_pending_buf, take);

        /* Escape sequence "+++" (with >=15ms trailing idle) enters AT mode */
        if (n == 3 && idle_15ms &&
            s_pending_buf[0] == '+' && s_pending_buf[1] == '+' && s_pending_buf[2] == '+') {
            s_at_mode_when_conn = 1;
            s_at_len = 0;
            uart_hal_puts("\r\n+AT_MODE\r\nOK\r\n");
            return;
        }

        int mask = 0;
        if (s_nus_tx_ccc & CLIENT_CHAR_CFG_NOTI) mask |= BIT(0);
        if (s_ffe1_ccc   & CLIENT_CHAR_CFG_NOTI) mask |= BIT(1);

        if (mask != 0) {
            s_pending_len  = n;
            s_pending_mask = mask;
            pump_pending_ble_tx();
        }
    }
}

/* ---------------- LED State Machine ---------------- */
static void update_leds(void) {
    u32 now = clock_time();

    if (s_ota_active) {
        /* Fast Red/Green alternating blink during OTA */
        if (clock_time_exceed(s_led_hb_tick, 100000)) {
            s_led_hb_tick = now;
            static u8 phase = 0;
            phase ^= 1;
            gpio_write(LED_RED, phase ? 0 : 1);
            gpio_write(LED_GRN, phase ? 1 : 0);
        }
        return;
    }

    if (s_led_red_off_tick && (s32)(now - s_led_red_off_tick) >= 0) {
        gpio_write(LED_RED, 1);
        s_led_red_off_tick = 0;
    }

    if (s_led_grn_off_tick && (s32)(now - s_led_grn_off_tick) >= 0) {
        gpio_write(LED_GRN, s_ble_connected ? 0 : 1);
        s_led_grn_off_tick = 0;
    }

    /* Slow Green heartbeat while advertising */
    if (!s_ble_connected && clock_time_exceed(s_led_hb_tick, 2000000)) {
        s_led_hb_tick = now;
        led_pulse_grn(40000);
    }
}

/* ---------------- Initialization ---------------- */
static void load_factory_mac(void) {
    u8 buf[6];
    flash_read_page(FACTORY_MAC_ADDR, 6, buf);
    int all_ff = 1, all_00 = 1;
    for (int i = 0; i < 6; i++) {
        if (buf[i] != 0xFF) all_ff = 0;
        if (buf[i] != 0x00) all_00 = 0;
    }
    if (!all_ff && !all_00) {
        memcpy(s_mac, buf, 6);
    } else {
        /* Fallback MAC */
        static const u8 fallback[6] = { 0x01, 0x50, 0x82, 0x38, 0xC1, 0xA4 };
        memcpy(s_mac, fallback, 6);
    }
}

void user_init_normal(void) {
    /* Init LEDs */
    gpio_set_func(LED_RED, AS_GPIO);
    gpio_set_output_en(LED_RED, 1);
    gpio_write(LED_RED, 1);

    gpio_set_func(LED_GRN, AS_GPIO);
    gpio_set_output_en(LED_GRN, 1);
    gpio_write(LED_GRN, 1);

    /* Init hardware STATE (PA1 output, LOW=disconnected) & AT_KEY (PA0 input, pull-up) */
    gpio_set_func(PIN_BLE_STATE, AS_GPIO);
    gpio_set_output_en(PIN_BLE_STATE, 1);
    gpio_write(PIN_BLE_STATE, 0);

    gpio_set_func(PIN_AT_KEY, AS_GPIO);
    gpio_set_output_en(PIN_AT_KEY, 0);
    gpio_set_input_en(PIN_AT_KEY, 1);
    gpio_setup_up_down_resistor(PIN_AT_KEY, PM_PIN_PULLUP_10K);

    random_generator_init();
    load_factory_mac();
    cfg_load(s_mac);
    s_attributes[GAP_NAME_DP_H].attrLen = (u32)strlen(g_cfg.name);

    /* Init Hardware UART with persisted baudrate */
    uart_hal_init(g_cfg.baudrate);

    /* Boot blink: Green twice */
    for (int i = 0; i < 2; i++) {
        gpio_write(LED_GRN, 0);
        sleep_us(60000);
        gpio_write(LED_GRN, 1);
        sleep_us(60000);
    }

    /* BLE Controller Init */
    blc_ll_initBasicMCU();
    blc_ll_initStandby_module(s_mac);
    blc_ll_initAdvertising_module(s_mac);
    blc_ll_initConnection_module();
    blc_ll_initSlaveRole_module();
    blc_ll_initDataLengthExtension();

    /* BLE Host Init */
    bls_att_setAttributeTable((u8 *)s_attributes);
    blc_att_setRxMtuSize(MAX_ATT_MTU);
    blc_l2cap_register_handler(blc_l2cap_packet_receive);

    /* OTA Init: 124KB dual-bank @ 0x00000 / 0x20000 (bootAddr set in main() before cpu_wakeup_init) */
    bls_ota_clearNewFwDataArea();
    bls_ota_registerStartCmdCb(&ota_start_cb);
    bls_ota_registerResultIndicateCb(&ota_result_cb);

    /* BLE Event Callbacks */
    bls_app_registerEventCallback(BLT_EV_FLAG_CONNECT, &ble_connect_cb);
    bls_app_registerEventCallback(BLT_EV_FLAG_TERMINATE, &ble_terminate_cb);

    apply_ble_adv_config();
    bls_ll_setAdvEnable(1);
    irq_enable();

    if (g_cfg.log_en) {
        uart_hal_puts("\r\n=== ZK_TESR21S BLE-UART v" FW_VERSION_STR " ===\r\n");
        at_print_info();
    }
}

_attribute_ram_code_ void user_init_deepRetn(void) {
    blc_ll_initBasicMCU();
    rf_set_power_level_index(s_txpwr_tbl[g_cfg.tx_power_level]);
    blc_ll_recoverDeepRetention();
    irq_enable();
}

_attribute_ram_code_ void main_loop(void) {
    blt_sdk_main_loop();
    uart_hal_poll_rx();
    pump_uart_data();
    update_leds();
}
