#include "tl_common.h"
#include "drivers.h"
#include "stack/ble/ble.h"
#include "stack/ble/service/ble_ll_ota.h"
#include "vendor/common/user_config.h"

extern void user_init_normal(void);
extern void user_init_deepRetn(void);
extern void main_loop(void);

_attribute_ram_code_ void irq_handler(void) {
    irq_blt_sdk_handler();
}

_attribute_ram_code_ int main(void) {
    blc_pm_select_internal_32k_crystal();
    /* Must be called BEFORE cpu_wakeup_init() so cpu_wakeup_no_deepretn_back_init()
     * sets ota_program_offset to 0x20000 (or 0x00000 when booted from 0x20000).
     * 124KB dual-bank (0x00000 <-> 0x20000) never overlaps and protects MAC 0x76000 & cfg 0x7A000. */
    bls_ota_set_fwSize_and_fwBootAddr(124, 0x20000);
    cpu_wakeup_init();

    int deepRetWakeUp = pm_is_MCU_deepRetentionWakeup();

    rf_drv_init(RF_MODE_BLE_1M);
    gpio_init(!deepRetWakeUp);

#if (CLOCK_SYS_CLOCK_HZ == 16000000)
    clock_init(SYS_CLK_16M_Crystal);
#elif (CLOCK_SYS_CLOCK_HZ == 24000000)
    clock_init(SYS_CLK_24M_Crystal);
#endif

    blc_app_loadCustomizedParameters();

    if (deepRetWakeUp) {
        user_init_deepRetn();
    } else {
        user_init_normal();
    }

#if (MODULE_WATCHDOG_ENABLE)
    wd_set_interval_ms(WATCHDOG_INIT_TIMEOUT, CLOCK_SYS_CLOCK_1MS);
    wd_start();
#endif

    while (1) {
#if (MODULE_WATCHDOG_ENABLE)
        wd_clear();
#endif
        main_loop();
    }
}
