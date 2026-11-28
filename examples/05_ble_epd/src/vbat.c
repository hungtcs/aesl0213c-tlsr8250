#include "vbat.h"
#include "drivers.h"

u16 vbat_read_mv(void) {
    adc_init();
    adc_vbat_init(GPIO_PB6); /* PB6 is unused on ZK_TESR21S_V2.1 */
    adc_power_on_sar_adc(1);
    u16 mv = adc_sample_and_get_result();
    adc_power_on_sar_adc(0);
    return mv;
}
