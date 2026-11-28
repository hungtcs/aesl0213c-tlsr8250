#pragma once

#if defined(__cplusplus)
extern "C" {
#endif

/* Low-power Deep Retention enabled for multi-month coin-cell battery life */
#define BLE_APP_PM_ENABLE               1
#define PM_DEEPSLEEP_RETENTION_ENABLE   1
#define BLE_REMOTE_SECURITY_ENABLE      0

/* System clock: 24MHz external crystal */
#define CLOCK_SYS_CLOCK_HZ              24000000

enum {
    CLOCK_SYS_CLOCK_1S  = CLOCK_SYS_CLOCK_HZ,
    CLOCK_SYS_CLOCK_1MS = (CLOCK_SYS_CLOCK_1S / 1000),
    CLOCK_SYS_CLOCK_1US = (CLOCK_SYS_CLOCK_1S / 1000000),
};

#define MODULE_WATCHDOG_ENABLE          0
#define WATCHDOG_INIT_TIMEOUT           500

/* Keep SWS digital pullup */
#define PA7_DATA_OUT                    1

#include "vendor/common/default_config.h"

#if defined(__cplusplus)
}
#endif
