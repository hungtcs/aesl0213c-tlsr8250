#pragma once
#include "tl_common.h"

#define EPD_WIDTH        128
#define EPD_VISIBLE_W    122
#define EPD_HEIGHT       250
#define EPD_PLANE_BYTES  ((EPD_WIDTH / 8) * EPD_HEIGHT) /* 4000 bytes */
#define EPD_TOTAL_BYTES  (EPD_PLANE_BYTES * 2)          /* 8000 bytes */

void epd_init_pins_idle(void);
int  epd_is_busy(void);

/*
 * Uploads 4000B B/W plane (1=black, 0=white) and 4000B Red plane (1=red, 0=none)
 * and kicks off an asynchronous refresh. Returns 0 on start, -1 if already busy.
 */
int  epd_start_refresh(const u8 *bw_plane, const u8 *red_plane);

/*
 * Poll asynchronous refresh progress from main_loop().
 * Returns: 0 = still refreshing (or idle), 1 = refresh finished OK, -1 = timeout.
 */
int  epd_poll(void);

/* Render a full-screen 3-color "LOW BATTERY" warning into bw_plane (4000B) & red_plane (4000B) */
void epd_render_low_battery(u8 *bw_plane, u8 *red_plane, u16 mv);
