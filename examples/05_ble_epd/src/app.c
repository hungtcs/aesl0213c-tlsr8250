#include "tl_common.h"
#include "drivers.h"
#include "stack/ble/ble.h"
#include "stack/ble/service/ble_ll_ota.h"
#include "app_config.h"
#include "epd.h"
#include "vbat.h"

/*
 * ZK_TESR21S_V2.1 (AESL0213C-TLSR8250) InkCard BLE 5.0 E-Paper Firmware
 *
 * - iOS (Bluefy / SHX) + Android + Desktop Chrome/Edge compatible!
 * - Chunk size: 128B payload (131B ATT write < iOS 182B MTU ceiling).
 * - Service 0xFE01 / Characteristic 0xFE02 (READ | WRITE | WRITE_WITHOUT_RSP | NOTIFY):
 *     0x01 START  : [0x01, mode(0=raw), total_len(u16 LE), crc32(u32 LE)]
 *                   -> Notify [0x81, status(0=OK,1=BUSY,2=BAD), chunk(128), vbat_lo, vbat_hi, low_bat]
 *     0x02 DATA   : [0x02, seq(u16 LE), payload(1..128B)]
 *                   -> Notify [0x82, status(0=OK,1=ERR), seq_lo, seq_hi]
 *     0x03 COMMIT : [0x03]
 *                   -> Notify [0x83, status(0=REFRESHING,1=CRC_ERR,2=BAD_STATE)]
 *                   -> (when EPD finishes ~15s later) Notify [0x84, status(0=OK,1=TIMEOUT), vbat_lo, vbat_hi, low_bat]
 *     0x04 INFO   : [0x04]
 *                   -> Notify [0x85, fw_maj(1), fw_min(0), state(0=IDLE,1=RX,2=REFRESH), vbat_lo, vbat_hi, low_bat, 122, 0, 250, 0]
 * - Built-in Telink BLE OTA Service (0x1912 / 0x2B12).
 * - Idle 16K Deep Retention sleep (1s advertising interval) + EPD power cutoff.
 * - Low-battery detection (< 2550 mV for CR2450): Red LED blink + low_bat flag in protocol.
 */

#define FW_VER_MAJOR      1
#define FW_VER_MINOR      6
#define FACTORY_MAC_ADDR  0x76000
#define CHUNK_SIZE        160
#define LOW_BAT_MV        2550
#define CRIT_BAT_MV       2450
#define RECOVER_BAT_MV    2600
#define VBAT_POLL_TICKS   3600 /* ~1 hour at 1s ADV deep-retention wakeups */
#define MY_RF_POWER_INDEX RF_POWER_P3p01dBm

#define LED_RED           GPIO_PB4
#define LED_GRN           GPIO_PB5

/* BLE RX/TX FIFOs in 16K retention RAM (RX 200B fits 131B DATA + 185B iOS MTU) */
_attribute_data_retention_ u8 blt_rxfifo_b[200 * 4] = {0};
_attribute_data_retention_ my_fifo_t blt_rxfifo = {
    200, 4, 0, 0, blt_rxfifo_b,
};

_attribute_data_retention_ u8 blt_txfifo_b[64 * 8] = {0};
_attribute_data_retention_ my_fifo_t blt_txfifo = {
    64, 8, 0, 0, blt_txfifo_b,
};

/* Retained identity & battery state across Deep Retention */
_attribute_data_retention_ static u8  s_mac[6];
_attribute_data_retention_ static u8  s_dev_name[16] = "InkCard_0000";
_attribute_data_retention_ static u16 s_vbat_mv = 3000;
_attribute_data_retention_ static u16 s_epd_ccc = 0;
_attribute_data_retention_ static u8  s_lowbat_screen_shown = 0;
_attribute_data_retention_ static u16 s_vbat_poll_cnt = 0;

/* Runtime state (cleared/idle across deep sleep) */
static volatile int s_ble_connected   = 0;
static volatile int s_ota_active      = 0;
static volatile int s_rx_active       = 0;
static volatile int s_pending_refresh = 0;

static u8  s_rx_mode      = 0;
static u16 s_expected_len = 0;
static u32 s_expected_crc = 0;

/* Normal SRAM buffers (not retention RAM): RX staging + 8000B decoded EPD framebuffer */
static u8 s_rx_buf[EPD_TOTAL_BYTES];
static u8 s_img_buf[EPD_TOTAL_BYTES];

/* Characteristic backing buffers */
static u8 s_epd_char_val[20] = {0};
static u8 s_ota_val[20]      = {0};

/* ---------------- GATT Attribute Table ---------------- */
static const u16 primaryServiceUUID = GATT_UUID_PRIMARY_SERVICE;
static const u16 characterUUID      = GATT_UUID_CHARACTER;
static const u16 clientCharCfgUUID  = GATT_UUID_CLIENT_CHAR_CFG;
static const u16 userDescUUID       = GATT_UUID_CHAR_USER_DESC;

static const u16 gapServiceUUID     = SERVICE_UUID_GENERIC_ACCESS;
static const u16 devNameUUID        = GATT_UUID_DEVICE_NAME;
static const u16 appearanceUUID     = GATT_UUID_APPEARANCE;
static const u16 my_appearance      = 0x0000;

static const u16 epdServiceUUID     = 0xFE01;
static const u16 epdCharUUID        = 0xFE02;

static const u8 otaServiceUUID[16]  = TELINK_OTA_UUID_SERVICE;
static const u8 otaCharUUID[16]     = TELINK_SPP_DATA_OTA;
static const u8 otaDescStr[]        = "OTA";

static const u8 propRWNotify        = CHAR_PROP_READ | CHAR_PROP_WRITE | CHAR_PROP_WRITE_WITHOUT_RSP | CHAR_PROP_NOTIFY;
static const u8 propOTA             = CHAR_PROP_READ | CHAR_PROP_WRITE_WITHOUT_RSP;

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
    /* InkCard EPD: 6..9 */
    EPD_PS_H,
    EPD_CHAR_CD_H,
    EPD_CHAR_DP_H,
    EPD_CHAR_CCC_H,
    /* Telink OTA: 10..13 */
    OTA_PS_H,
    OTA_CD_H,
    OTA_DP_H,
    OTA_DESC_H,
    ATT_END_H,
};

/* ---------------- Helpers ---------------- */
static u32 calc_crc32(const u8 *data, u32 len) {
    u32 crc = 0xFFFFFFFFu;
    for (u32 i = 0; i < len; i++) {
        crc ^= data[i];
        for (int b = 0; b < 8; b++) {
            crc = (crc & 1u) ? ((crc >> 1) ^ 0xEDB88320u) : (crc >> 1);
        }
    }
    return crc ^ 0xFFFFFFFFu;
}

/*
 * Decode InkCard RLE stream into dst (expected exactly dst_len bytes):
 *   0x00..0x7F: literal copy of (h + 1) bytes (1..128)
 *   0x80..0xFF: repeat next byte ((h - 128) + 2) times (2..129)
 * Returns decoded byte count on success, or -1 on malformed/overflow input.
 */
static int rle_decode(const u8 *src, int src_len, u8 *dst, int dst_len) {
    int si = 0, di = 0;
    while (si < src_len) {
        u8 h = src[si++];
        if (h < 0x80) {
            int count = (int)h + 1;
            if (si + count > src_len || di + count > dst_len) return -1;
            memcpy(dst + di, src + si, (unsigned int)count);
            si += count;
            di += count;
        } else {
            int count = (int)(h - 0x80) + 2;
            if (si >= src_len || di + count > dst_len) return -1;
            u8 val = src[si++];
            memset(dst + di, val, (unsigned int)count);
            di += count;
        }
    }
    return di;
}

static u8 is_low_battery(u16 mv) {
    return (mv > 0 && mv < LOW_BAT_MV) ? 1 : 0;
}

static void led_set(GPIO_PinTypeDef led, int on) {
    gpio_set_func(led, AS_GPIO);
    gpio_set_output_en(led, 1);
    gpio_write(led, on ? 0 : 1);
}

static void leds_off(void) {
    led_set(LED_RED, 0);
    led_set(LED_GRN, 0);
}

static void led_blink(GPIO_PinTypeDef led, int count, u32 on_us, u32 off_us) {
    gpio_set_func(led, AS_GPIO);
    gpio_set_output_en(led, 1);
    for (int i = 0; i < count; i++) {
        gpio_write(led, 0);
        sleep_us(on_us);
        gpio_write(led, 1);
        sleep_us(off_us);
#if (MODULE_WATCHDOG_ENABLE)
        wd_clear();
#endif
    }
}

static void send_notify(const u8 *buf, int len) {
    if (!s_ble_connected) return;
    bls_att_pushNotifyData(EPD_CHAR_DP_H, (u8 *)buf, len);
}

static void update_pm_mask(void) {
    if (s_ble_connected || s_ota_active || s_pending_refresh || epd_is_busy()) {
        bls_pm_setSuspendMask(SUSPEND_DISABLE);
    } else {
        bls_pm_setSuspendMask(SUSPEND_ADV | DEEPSLEEP_RETENTION_ADV);
    }
}

/* ---------------- GATT Callbacks ---------------- */
static int epd_ccc_write(void *p) {
    rf_packet_att_write_t *pw = (rf_packet_att_write_t *)p;
    if (pw->l2capLen >= 5) {
        u8 *v = &pw->value;
        s_epd_ccc = (u16)(v[0] | (v[1] << 8));
    }
    return 0;
}

static int epd_char_write(void *p) {
    rf_packet_att_write_t *pw = (rf_packet_att_write_t *)p;
    int len = (int)pw->l2capLen - 3;
    if (len < 1) return 0;
    const u8 *d = &pw->value;
    u8 op = d[0];

    if (op == 0x01) {
        /* START: [0x01, mode, total_len(u16 LE), crc32(u32 LE)] */
        s_vbat_mv = vbat_read_mv();
        u8 resp[6] = {
            0x81, 0, CHUNK_SIZE,
            (u8)(s_vbat_mv & 0xFF), (u8)(s_vbat_mv >> 8),
            is_low_battery(s_vbat_mv)
        };
        if (epd_is_busy() || s_pending_refresh) {
            resp[1] = 1; /* BUSY */
            send_notify(resp, sizeof(resp));
            return 0;
        }
        if (len < 8 || (d[1] != 0 && d[1] != 1)) {
            resp[1] = 2; /* BAD_PARAM */
            send_notify(resp, sizeof(resp));
            return 0;
        }
        u8 mode = d[1];
        u16 total_len = (u16)(d[2] | (d[3] << 8));
        u32 crc = (u32)d[4] | ((u32)d[5] << 8) | ((u32)d[6] << 16) | ((u32)d[7] << 24);
        if ((mode == 0 && total_len != EPD_TOTAL_BYTES) ||
            (mode == 1 && (total_len == 0 || total_len > EPD_TOTAL_BYTES))) {
            resp[1] = 2; /* BAD_LEN */
            send_notify(resp, sizeof(resp));
            return 0;
        }
        s_rx_mode = mode;
        s_expected_len = total_len;
        s_expected_crc = crc;
        s_rx_active = 1;
        memset(s_rx_buf, 0, total_len);
        send_notify(resp, sizeof(resp));
    } else if (op == 0x02) {
        /* DATA: [0x02, seq(u16 LE), payload(1..160B)] */
        if (len < 4) return 0;
        u16 seq = (u16)(d[1] | (d[2] << 8));
        int payload_len = len - 3;
        u32 offset = (u32)seq * CHUNK_SIZE;
        u8 resp[4] = { 0x82, 0, (u8)(seq & 0xFF), (u8)(seq >> 8) };
        if (!s_rx_active || payload_len <= 0 || payload_len > CHUNK_SIZE || offset + (u32)payload_len > s_expected_len) {
            resp[1] = 1; /* ERR */
            send_notify(resp, sizeof(resp));
            return 0;
        }
        memcpy(s_rx_buf + offset, d + 3, (unsigned int)payload_len);
        send_notify(resp, sizeof(resp));
    } else if (op == 0x03) {
        /* COMMIT: [0x03] */
        u8 resp[2] = { 0x83, 0 };
        if (!s_rx_active) {
            resp[1] = 2; /* BAD_STATE */
            send_notify(resp, sizeof(resp));
            return 0;
        }
        u32 actual = calc_crc32(s_rx_buf, s_expected_len);
        if (actual != s_expected_crc) {
            s_rx_active = 0;
            resp[1] = 1; /* CRC_ERR */
            send_notify(resp, sizeof(resp));
            return 0;
        }
        if (s_rx_mode == 1) {
            int decoded = rle_decode(s_rx_buf, s_expected_len, s_img_buf, EPD_TOTAL_BYTES);
            if (decoded != EPD_TOTAL_BYTES) {
                s_rx_active = 0;
                resp[1] = 3; /* RLE_ERR */
                send_notify(resp, sizeof(resp));
                return 0;
            }
        } else {
            memcpy(s_img_buf, s_rx_buf, EPD_TOTAL_BYTES);
        }
        s_rx_active = 0;
        s_pending_refresh = 1;
        send_notify(resp, sizeof(resp));
    } else if (op == 0x04) {
        /* INFO: [0x04] */
        s_vbat_mv = vbat_read_mv();
        u8 state = (epd_is_busy() || s_pending_refresh) ? 2 : (s_rx_active ? 1 : 0);
        u8 resp[11] = {
            0x85,
            FW_VER_MAJOR, FW_VER_MINOR,
            state,
            (u8)(s_vbat_mv & 0xFF), (u8)(s_vbat_mv >> 8),
            is_low_battery(s_vbat_mv),
            U16_LO(EPD_VISIBLE_W), U16_HI(EPD_VISIBLE_W),
            U16_LO(EPD_HEIGHT), U16_HI(EPD_HEIGHT),
        };
        send_notify(resp, sizeof(resp));
    } else if (op == 0x05) {
        /* TEST_LOWBAT: [0x05] -> render and refresh built-in low-battery screen */
        u8 resp[2] = { 0x83, 0 };
        if (epd_is_busy() || s_pending_refresh) {
            resp[1] = 2; /* BUSY / BAD_STATE */
            send_notify(resp, sizeof(resp));
            return 0;
        }
        s_vbat_mv = vbat_read_mv();
        epd_render_low_battery(s_img_buf, s_img_buf + EPD_PLANE_BYTES, s_vbat_mv);
        s_pending_refresh = 1;
        update_pm_mask();
        send_notify(resp, sizeof(resp));
    }
    return 0;
}

static int my_ota_write(void *p) {
    s_ota_active = 1;
    update_pm_mask();
    return otaWrite(p);
}

static void on_ota_start(void) {
    s_ota_active = 1;
    update_pm_mask();
}

static void on_ota_result(int result) {
    (void)result;
    s_ota_active = 0;
    leds_off();
    update_pm_mask();
}

static attribute_t my_Attributes[] = {
    { ATT_END_H - 1, 0, 0, 0, 0, 0, 0, 0 }, /* total count */

    /* GAP Service (1..5) */
    { 5, ATT_PERMISSIONS_READ, 2, 2, (u8 *)&primaryServiceUUID, (u8 *)&gapServiceUUID, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, sizeof(gapNameCharVal), (u8 *)&characterUUID, (u8 *)gapNameCharVal, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, 12, (u8 *)&devNameUUID, s_dev_name, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, sizeof(gapAppearanceCharVal), (u8 *)&characterUUID, (u8 *)gapAppearanceCharVal, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, sizeof(my_appearance), (u8 *)&appearanceUUID, (u8 *)&my_appearance, 0, 0 },

    /* InkCard EPD Service 0xFE01 (6..9) */
    { 4, ATT_PERMISSIONS_READ, 2, 2, (u8 *)&primaryServiceUUID, (u8 *)&epdServiceUUID, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, 1, (u8 *)&characterUUID, (u8 *)&propRWNotify, 0, 0 },
    { 0, ATT_PERMISSIONS_RDWR, 2, sizeof(s_epd_char_val), (u8 *)&epdCharUUID, s_epd_char_val, epd_char_write, 0 },
    { 0, ATT_PERMISSIONS_RDWR, 2, sizeof(s_epd_ccc), (u8 *)&clientCharCfgUUID, (u8 *)&s_epd_ccc, epd_ccc_write, 0 },

    /* Telink Standard OTA Service (10..13) */
    { 4, ATT_PERMISSIONS_READ, 2, 16, (u8 *)&primaryServiceUUID, (u8 *)otaServiceUUID, 0, 0 },
    { 0, ATT_PERMISSIONS_READ, 2, 1, (u8 *)&characterUUID, (u8 *)&propOTA, 0, 0 },
    { 0, ATT_PERMISSIONS_RDWR, 16, sizeof(s_ota_val), (u8 *)otaCharUUID, s_ota_val, my_ota_write, otaRead },
    { 0, ATT_PERMISSIONS_READ, 2, sizeof(otaDescStr) - 1, (u8 *)&userDescUUID, (u8 *)otaDescStr, 0, 0 },
};

/* ---------------- BLE Stack Event Callbacks ---------------- */
static void on_ble_connect(u8 e, u8 *p, int n) {
    (void)e; (void)p; (void)n;
    s_ble_connected = 1;
    s_rx_active = 0;
    s_epd_ccc = 0;
    update_pm_mask();
    blc_att_requestMtuSizeExchange(BLS_CONN_HANDLE, 185);
    bls_l2cap_requestConnParamUpdate(12, 24, 0, 400);
}

static void on_ble_terminate(u8 e, u8 *p, int n) {
    (void)e; (void)p; (void)n;
    s_ble_connected = 0;
    s_rx_active = 0;
    if (s_ota_active) {
        s_ota_active = 0;
        leds_off();
    }
    s_epd_ccc = 0;
    update_pm_mask();
}

_attribute_ram_code_ static void user_set_rf_power(u8 e, u8 *p, int n) {
    (void)e; (void)p; (void)n;
    rf_set_power_level_index(MY_RF_POWER_INDEX);
}

static char hex_nibble(u8 v) {
    v &= 0x0F;
    return (char)(v < 10 ? ('0' + v) : ('A' + v - 10));
}

static void init_identity(void) {
    flash_read_page(FACTORY_MAC_ADDR, 6, s_mac);
    int all_ff = 1, all_00 = 1;
    for (int i = 0; i < 6; i++) {
        if (s_mac[i] != 0xFF) all_ff = 0;
        if (s_mac[i] != 0x00) all_00 = 0;
    }
    if (all_ff || all_00) {
        s_mac[0] = 0x50; s_mac[1] = 0x82; s_mac[2] = 0x21;
        s_mac[3] = 0x13; s_mac[4] = 0x02; s_mac[5] = 0xC4;
    }
    /* Name: InkCard_XXXX (last 2 bytes of MAC) */
    memcpy(s_dev_name, "InkCard_", 8);
    s_dev_name[8]  = (u8)hex_nibble(s_mac[1] >> 4);
    s_dev_name[9]  = (u8)hex_nibble(s_mac[1]);
    s_dev_name[10] = (u8)hex_nibble(s_mac[0] >> 4);
    s_dev_name[11] = (u8)hex_nibble(s_mac[0]);
    s_dev_name[12] = 0;
}

static void setup_advertising(void) {
    u8 adv[31];
    int i = 0;
    /* Flags */
    adv[i++] = 0x02; adv[i++] = 0x01; adv[i++] = 0x06;
    /* Complete Local Name (12 bytes: InkCard_XXXX) */
    adv[i++] = 13; adv[i++] = 0x09;
    memcpy(&adv[i], s_dev_name, 12);
    i += 12;
    /* Complete 16-bit Service UUID: 0xFE01 */
    adv[i++] = 0x03; adv[i++] = 0x03; adv[i++] = 0x01; adv[i++] = 0xFE;
    bls_ll_setAdvData(adv, (u8)i);

    /* Scan Response: Battery voltage mV in Manufacturer Data (0xCAFE) */
    u8 rsp[7] = {
        0x06, 0xFF,
        0xFE, 0xCA,
        (u8)(s_vbat_mv & 0xFF), (u8)(s_vbat_mv >> 8),
        is_low_battery(s_vbat_mv)
    };
    bls_ll_setScanRspData(rsp, sizeof(rsp));
}

static void check_critical_battery_once(void) {
    if (s_vbat_mv >= RECOVER_BAT_MV) {
        s_lowbat_screen_shown = 0;
        return;
    }
    if (!s_lowbat_screen_shown && s_vbat_mv > 0 && s_vbat_mv < CRIT_BAT_MV && !epd_is_busy() && !s_pending_refresh) {
        s_lowbat_screen_shown = 1;
        epd_render_low_battery(s_img_buf, s_img_buf + EPD_PLANE_BYTES, s_vbat_mv);
        s_pending_refresh = 1;
        update_pm_mask();
    }
}

void user_init_normal(void) {
    epd_init_pins_idle();

    /* Ensure LEDs default OFF (active-LOW) */
    gpio_set_func(LED_RED, AS_GPIO);
    gpio_set_output_en(LED_RED, 1);
    gpio_write(LED_RED, 1);
    gpio_set_func(LED_GRN, AS_GPIO);
    gpio_set_output_en(LED_GRN, 1);
    gpio_write(LED_GRN, 1);

    /* Sample battery on cold boot: Red x3 = low battery, Green x2 = normal */
    s_lowbat_screen_shown = 0;
    s_vbat_poll_cnt = 0;
    s_vbat_mv = vbat_read_mv();
    if (is_low_battery(s_vbat_mv)) {
        led_blink(LED_RED, 3, 90000, 90000);
    } else {
        led_blink(LED_GRN, 2, 70000, 70000);
    }

    random_generator_init();
    init_identity();

    /* BLE Controller Init */
    blc_ll_initBasicMCU();
    blc_ll_initStandby_module(s_mac);
    blc_ll_initAdvertising_module(s_mac);
    blc_ll_initConnection_module();
    blc_ll_initSlaveRole_module();
    blc_ll_initDataLengthExtension();

    /* GATT & L2CAP */
    bls_att_setAttributeTable((u8 *)my_Attributes);
    blc_att_setRxMtuSize(185);
    blc_l2cap_register_handler(blc_l2cap_packet_receive);

    /* Telink OTA: dual-bank 124KB @ 0x00000 / 0x20000 (bootAddr set in main() before cpu_wakeup_init) */
    bls_ota_clearNewFwDataArea();
    bls_ota_registerStartCmdCb(on_ota_start);
    bls_ota_registerResultIndicateCb(on_ota_result);

    /* Advertising (1s interval for low power + fast discovery) */
    setup_advertising();
    bls_ll_setAdvParam(
        ADV_INTERVAL_1S,
        ADV_INTERVAL_1S,
        ADV_TYPE_CONNECTABLE_UNDIRECTED,
        OWN_ADDRESS_PUBLIC,
        0,
        NULL,
        BLT_ENABLE_ADV_ALL,
        ADV_FP_NONE
    );

    rf_set_power_level_index(MY_RF_POWER_INDEX);
    bls_app_registerEventCallback(BLT_EV_FLAG_CONNECT, &on_ble_connect);
    bls_app_registerEventCallback(BLT_EV_FLAG_TERMINATE, &on_ble_terminate);
    bls_app_registerEventCallback(BLT_EV_FLAG_SUSPEND_EXIT, &user_set_rf_power);
    bls_ll_setAdvEnable(1);

    /* Power Management: 16K Deep Retention during idle advertising */
    blc_ll_initPowerManagement_module();
    blc_pm_setDeepsleepRetentionThreshold(95, 95);
    blc_pm_setDeepsleepRetentionEarlyWakeupTiming(240);
    blc_pm_setDeepsleepRetentionType(DEEPSLEEP_MODE_RET_SRAM_LOW16K);
    check_critical_battery_once();
    update_pm_mask();

    irq_enable();
}

_attribute_ram_code_ void user_init_deepRetn(void) {
    blc_ll_initBasicMCU();
    rf_set_power_level_index(MY_RF_POWER_INDEX);
    blc_ll_recoverDeepRetention();
    if (++s_vbat_poll_cnt >= VBAT_POLL_TICKS) {
        s_vbat_poll_cnt = 0;
        s_vbat_mv = vbat_read_mv();
        check_critical_battery_once();
    }
    irq_enable();
}

void main_loop(void) {
    blt_sdk_main_loop();

    if (s_ota_active) {
        static u32 ota_led_tick = 0;
        static u8 ota_led_phase = 0;
        if (clock_time_exceed(ota_led_tick, 100000)) {
            ota_led_tick = clock_time();
            ota_led_phase ^= 1;
            led_set(LED_RED, ota_led_phase ? 1 : 0);
            led_set(LED_GRN, ota_led_phase ? 0 : 1);
        }
    }

    if (s_pending_refresh) {
        s_pending_refresh = 0;
        update_pm_mask();

        /* Green LED ON while EPD is actively refreshing */
        led_set(LED_GRN, 1);
        epd_start_refresh(s_img_buf, s_img_buf + EPD_PLANE_BYTES);
    }

    int res = epd_poll();
    if (res != 0) {
        led_set(LED_GRN, 0);
        s_vbat_mv = vbat_read_mv();
        u8 done_pkt[5] = {
            0x84,
            (u8)(res > 0 ? 0 : 1),
            (u8)(s_vbat_mv & 0xFF),
            (u8)(s_vbat_mv >> 8),
            is_low_battery(s_vbat_mv),
        };
        send_notify(done_pkt, sizeof(done_pkt));
        setup_advertising(); /* Update scan response battery voltage */
        check_critical_battery_once();
        update_pm_mask();
    }
}
