#include "tl_common.h"
#include "drivers.h"
#include "stack/ble/ble.h"
#include "app_config.h"

/*
 * ZK_TESR21S_V2.1 (AESL0213C-TLSR8250) Apple FindMy / OpenHaystack Tag
 *
 * - Standard 28-byte placeholder 'OFFLINEFINDINGPUBLICKEYHERE!' in .rodata
 *   Marked volatile so GCC -O2 NEVER constant-folds bytes 0..5 before patch_key.py runs!
 * - Uses Random Static Address (TxAdd=1, OWN_ADDRESS_RANDOM) per Apple Offline Finding spec.
 * - 2-second non-connectable advertising interval + 16K Deep Retention sleep (~uA average).
 * - Cold boot: Green LED (PB5) blinks twice; stays off during deep-retention wakeups.
 */

#define LED_RED           GPIO_PB4
#define LED_GRN           GPIO_PB5
#define MY_RF_POWER_INDEX RF_POWER_P3p01dBm

/* BLE RX/TX FIFOs MUST live in retention RAM across Deep Retention sleep */
_attribute_data_retention_ u8 blt_rxfifo_b[64 * 4] = {0};
_attribute_data_retention_ my_fifo_t blt_rxfifo = {
    64, 4, 0, 0, blt_rxfifo_b,
};

_attribute_data_retention_ u8 blt_txfifo_b[40 * 8] = {0};
_attribute_data_retention_ my_fifo_t blt_txfifo = {
    40, 8, 0, 0, blt_txfifo_b,
};

/* 28-byte public key placeholder (patched in-place in .bin by patch_key.py) */
static volatile const u8 public_key[28] = {
    'O','F','F','L','I','N','E','F','I','N','D','I','N','G',
    'P','U','B','L','I','C','K','E','Y','H','E','R','E','!'
};

_attribute_ram_code_ static void user_set_rf_power(u8 e, u8 *p, int n) {
    (void)e; (void)p; (void)n;
    rf_set_power_level_index(MY_RF_POWER_INDEX);
}

void user_init_normal(void) {
    /* Cold-boot indicator: Green LED blinks twice */
    gpio_set_func(LED_GRN, AS_GPIO);
    gpio_set_output_en(LED_GRN, 1);
    for (int i = 0; i < 2; i++) {
        gpio_write(LED_GRN, 0);
        sleep_us(80000);
        gpio_write(LED_GRN, 1);
        sleep_us(80000);
    }

    random_generator_init();

    /* Read patched key at runtime via volatile access */
    u8 key[28];
    for (int i = 0; i < 28; i++) {
        key[i] = public_key[i];
    }

    /* Derive 6-byte BLE Random Static Address (LSB first in Telink SDK) */
    u8 mac_addr[6];
    mac_addr[5] = key[0] | 0xC0;
    mac_addr[4] = key[1];
    mac_addr[3] = key[2];
    mac_addr[2] = key[3];
    mac_addr[1] = key[4];
    mac_addr[0] = key[5];

    /* BLE Controller Initialization */
    blc_ll_initBasicMCU();
    blc_ll_initStandby_module(mac_addr);
    blc_ll_initAdvertising_module(mac_addr);
    blc_ll_setRandomAddr(mac_addr);

    /* 31-byte Apple Offline Finding (FindMy) Advertising Payload */
    u8 tbl_advData[31] = {
        0x1E,       /* Length: 30 bytes */
        0xFF,       /* AD Type: Manufacturer Specific Data */
        0x4C, 0x00, /* Company ID: Apple Inc. (0x004C) */
        0x12, 0x19, /* Offline Finding type (0x12), length (25 bytes) */
        0x00,       /* Status byte */
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0x00,       /* First two bits of key[0] */
        0x00,       /* Hint byte */
    };

    memcpy(&tbl_advData[7], &key[6], 22);
    tbl_advData[29] = key[0] >> 6;

    bls_ll_setAdvData(tbl_advData, sizeof(tbl_advData));

    u8 status = bls_ll_setAdvParam(
        ADV_INTERVAL_2S,
        ADV_INTERVAL_2S,
        ADV_TYPE_NONCONNECTABLE_UNDIRECTED,
        OWN_ADDRESS_RANDOM,
        0,
        NULL,
        BLT_ENABLE_ADV_ALL,
        ADV_FP_NONE
    );

    if (status != BLE_SUCCESS) {
        gpio_set_func(LED_RED, AS_GPIO);
        gpio_set_output_en(LED_RED, 1);
        gpio_write(LED_RED, 0); /* Solid Red = AdvParam error */
        while (1) {}
    }

    rf_set_power_level_index(MY_RF_POWER_INDEX);
    bls_app_registerEventCallback(BLT_EV_FLAG_SUSPEND_EXIT, &user_set_rf_power);
    bls_ll_setAdvEnable(1);

    /* Power Management: 16K Deep Retention between 2s advertising bursts */
    blc_ll_initPowerManagement_module();
    bls_pm_setSuspendMask(SUSPEND_ADV | DEEPSLEEP_RETENTION_ADV);
    blc_pm_setDeepsleepRetentionThreshold(95, 95);
    blc_pm_setDeepsleepRetentionEarlyWakeupTiming(240);
    blc_pm_setDeepsleepRetentionType(DEEPSLEEP_MODE_RET_SRAM_LOW16K);

    irq_enable();
}

_attribute_ram_code_ void user_init_deepRetn(void) {
    blc_ll_initBasicMCU();
    rf_set_power_level_index(MY_RF_POWER_INDEX);
    blc_ll_recoverDeepRetention();
    irq_enable();
}

_attribute_ram_code_ void main_loop(void) {
    blt_sdk_main_loop();
}
