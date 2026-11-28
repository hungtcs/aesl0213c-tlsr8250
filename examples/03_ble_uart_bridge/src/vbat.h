#pragma once

#include "tl_common.h"

/* Measure chip supply voltage (VDD/VBAT) in millivolts using internal 14-bit SAR ADC */
u16 vbat_read_mv(void);
