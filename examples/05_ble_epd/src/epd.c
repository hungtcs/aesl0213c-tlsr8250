#include "epd.h"
#include "drivers.h"
#include "app_config.h"

/*
 * ZK_TESR21S_V2.1 (AESL0213C-TLSR8250) HINK-E0213A170 (UC8151 / epd_type 0x6c)
 * Verified pinout:
 *   EPD_PWR  = PB1 (active HIGH: 1 = ON, 0 = OFF)
 *   EPD_CS   = PD2
 *   EPD_DC   = PD3
 *   EPD_RST  = PA1
 *   EPD_CLK  = PD7
 *   EPD_MOSI = PB7
 *   EPD_BUSY = PA0 (active-LOW: 0 = busy, 1 = idle)
 */

#define EPD_PWR   GPIO_PB1
#define EPD_CS    GPIO_PD2
#define EPD_DC    GPIO_PD3
#define EPD_RST   GPIO_PA1
#define EPD_CLK   GPIO_PD7
#define EPD_MOSI  GPIO_PB7
#define EPD_BUSY  GPIO_PA0

#define EPD_REFRESH_TIMEOUT_MS 25000

static volatile int s_refreshing = 0;
static u32 s_refresh_start_tick = 0;

static void epd_pin_out(GPIO_PinTypeDef pin, int val) {
    gpio_set_func(pin, AS_GPIO);
    gpio_set_output_en(pin, 1);
    gpio_set_input_en(pin, 0);
    gpio_write(pin, val);
}

static void epd_pin_in(GPIO_PinTypeDef pin) {
    gpio_set_func(pin, AS_GPIO);
    gpio_set_output_en(pin, 0);
    gpio_set_input_en(pin, 1);
}

void epd_init_pins_idle(void) {
    /* Cut power and pull all SPI lines LOW to prevent phantom current leakage */
    epd_pin_out(EPD_PWR,  0);
    epd_pin_out(EPD_CS,   0);
    epd_pin_out(EPD_DC,   0);
    epd_pin_out(EPD_RST,  0);
    epd_pin_out(EPD_CLK,  0);
    epd_pin_out(EPD_MOSI, 0);
    epd_pin_out(EPD_BUSY, 0);
}

static void spi_write_byte(u8 b) {
    for (int i = 0; i < 8; i++) {
        gpio_write(EPD_CLK, 0);
        gpio_write(EPD_MOSI, (b & 0x80) ? 1 : 0);
        gpio_write(EPD_CLK, 1);
        b <<= 1;
    }
    gpio_write(EPD_CLK, 0);
}

static void epd_cmd(u8 cmd) {
    gpio_write(EPD_DC, 0);
    gpio_write(EPD_CS, 0);
    spi_write_byte(cmd);
    gpio_write(EPD_CS, 1);
}

static void epd_data(u8 d) {
    gpio_write(EPD_DC, 1);
    gpio_write(EPD_CS, 0);
    spi_write_byte(d);
    gpio_write(EPD_CS, 1);
}

static void epd_wait_busy_sync(u32 timeout_ms) {
    u32 start = clock_time();
    u32 limit = timeout_ms * CLOCK_SYS_CLOCK_1MS;
    while (!gpio_read(EPD_BUSY)) {
#if (MODULE_WATCHDOG_ENABLE)
        wd_clear();
#endif
        if ((u32)(clock_time() - start) >= limit) {
            break;
        }
        sleep_us(2000);
    }
}

int epd_is_busy(void) {
    return s_refreshing;
}

/*
 * HINK-E0213A170 (UC8151 epd_type 0x6c) scans X right-to-left by default.
 * Mirror each 122px visible row (0..121) so logical x=0 lands on the physical left edge.
 */
static void epd_stream_plane(const u8 *plane, int invert_bits) {
    u8 row_out[EPD_WIDTH / 8];
    gpio_write(EPD_DC, 1);
    gpio_write(EPD_CS, 0);
    for (int y = 0; y < EPD_HEIGHT; y++) {
        const u8 *src = plane + y * (EPD_WIDTH / 8);
        memset(row_out, 0, sizeof(row_out));
        for (int x = 0; x < EPD_VISIBLE_W; x++) {
            int sx = EPD_VISIBLE_W - 1 - x;
            if (src[sx >> 3] & (0x80u >> (sx & 7))) {
                row_out[x >> 3] |= (u8)(0x80u >> (x & 7));
            }
        }
        for (int b = 0; b < (EPD_WIDTH / 8); b++) {
            spi_write_byte(invert_bits ? (u8)(~row_out[b]) : row_out[b]);
        }
        if ((y & 0x0F) == 0) {
#if (MODULE_WATCHDOG_ENABLE)
            wd_clear();
#endif
        }
    }
    gpio_write(EPD_CS, 1);
}

int epd_start_refresh(const u8 *bw_plane, const u8 *red_plane) {
    if (s_refreshing) return -1;

    /* Configure active pins */
    epd_pin_out(EPD_PWR,  0);
    epd_pin_out(EPD_CS,   1);
    epd_pin_out(EPD_DC,   1);
    epd_pin_out(EPD_RST,  1);
    epd_pin_out(EPD_CLK,  0);
    epd_pin_out(EPD_MOSI, 0);
    epd_pin_in(EPD_BUSY);

    /* Power ON EPD */
    gpio_write(EPD_PWR, 1);
    sleep_us(50000);
#if (MODULE_WATCHDOG_ENABLE)
    wd_clear();
#endif

    /* Hardware Reset */
    gpio_write(EPD_RST, 0);
    sleep_us(20000);
    gpio_write(EPD_RST, 1);
    sleep_us(20000);

    /* Exact HINK-E0213A170 (epd_type 0x6c) init sequence */
    epd_cmd(0x4D); epd_data(0x55);
    epd_cmd(0xA9); epd_data(0x25);
    epd_cmd(0xF3); epd_data(0x0A);

    /* DTM1 (0x10): B/W RAM (hardware expects 0=black, 1=white -> invert OEPL 1=black) */
    epd_cmd(0x10);
    epd_stream_plane(bw_plane, 1);

    /* DTM2 (0x13): RED RAM (hardware expects 1=red, 0=none) */
    epd_cmd(0x13);
    epd_stream_plane(red_plane, 0);

    /* Power ON booster & kick off async display refresh */
    epd_cmd(0x04);
    epd_wait_busy_sync(5000);
    sleep_us(10000);

    epd_cmd(0x12);
    sleep_us(10000);

    s_refresh_start_tick = clock_time();
    s_refreshing = 1;
    return 0;
}

int epd_poll(void) {
    if (!s_refreshing) return 0;

    int done = gpio_read(EPD_BUSY) ? 1 : 0;
    int timed_out = ((u32)(clock_time() - s_refresh_start_tick) >= (u32)EPD_REFRESH_TIMEOUT_MS * CLOCK_SYS_CLOCK_1MS);

    if (!done && !timed_out) {
        return 0;
    }

    /* Power OFF & Deep Sleep EPD */
    epd_cmd(0x02);
    epd_wait_busy_sync(2000);
    epd_cmd(0x07);
    epd_data(0xA5);
    sleep_us(30000);

    epd_init_pins_idle();
    s_refreshing = 0;
    return done ? 1 : -1;
}

/* ---------------- Built-in Low-Battery Screen Renderer ---------------- */
static void fb_set_px(u8 *bw, u8 *red, int x, int y, int color) {
    /* color: 0=white, 1=black, 2=red; OEPL bit polarity: bw 1=black, red 1=red */
    if (x < 0 || x >= EPD_VISIBLE_W || y < 0 || y >= EPD_HEIGHT) return;
    int byte_i = y * (EPD_WIDTH / 8) + (x >> 3);
    u8 mask = (u8)(0x80u >> (x & 7));
    if (color == 1) {
        bw[byte_i]  |= mask;
        red[byte_i] &= (u8)(~mask);
    } else if (color == 2) {
        bw[byte_i]  &= (u8)(~mask);
        red[byte_i] |= mask;
    } else {
        bw[byte_i]  &= (u8)(~mask);
        red[byte_i] &= (u8)(~mask);
    }
}

static void fb_fill_rect(u8 *bw, u8 *red, int x, int y, int w, int h, int color) {
    for (int yy = y; yy < y + h; yy++) {
        for (int xx = x; xx < x + w; xx++) {
            fb_set_px(bw, red, xx, yy, color);
        }
    }
}

/* Minimal 5x7 uppercase + digit glyph table (row-major, 5 bits MSB-first per row) */
static const u8 *lookup_5x7(char ch) {
    static const u8 G_0[7] = {0x70,0x88,0x98,0xA8,0xC8,0x88,0x70};
    static const u8 G_1[7] = {0x20,0x60,0x20,0x20,0x20,0x20,0x70};
    static const u8 G_2[7] = {0x70,0x88,0x08,0x10,0x20,0x40,0xF8};
    static const u8 G_3[7] = {0xF0,0x08,0x08,0x70,0x08,0x08,0xF0};
    static const u8 G_4[7] = {0x10,0x30,0x50,0x90,0xF8,0x10,0x10};
    static const u8 G_5[7] = {0xF8,0x80,0xF0,0x08,0x08,0x88,0x70};
    static const u8 G_6[7] = {0x30,0x40,0x80,0xF0,0x88,0x88,0x70};
    static const u8 G_7[7] = {0xF8,0x08,0x10,0x20,0x40,0x40,0x40};
    static const u8 G_8[7] = {0x70,0x88,0x88,0x70,0x88,0x88,0x70};
    static const u8 G_9[7] = {0x70,0x88,0x88,0x78,0x08,0x10,0x60};
    static const u8 G_A[7] = {0x70,0x88,0x88,0xF8,0x88,0x88,0x88};
    static const u8 G_B[7] = {0xF0,0x88,0x88,0xF0,0x88,0x88,0xF0};
    static const u8 G_C[7] = {0x70,0x88,0x80,0x80,0x80,0x88,0x70};
    static const u8 G_E[7] = {0xF8,0x80,0x80,0xF0,0x80,0x80,0xF8};
    static const u8 G_L[7] = {0x80,0x80,0x80,0x80,0x80,0x80,0xF8};
    static const u8 G_O[7] = {0x70,0x88,0x88,0x88,0x88,0x88,0x70};
    static const u8 G_P[7] = {0xF0,0x88,0x88,0xF0,0x80,0x80,0x80};
    static const u8 G_R[7] = {0xF0,0x88,0x88,0xF0,0xA0,0x90,0x88};
    static const u8 G_T[7] = {0xF8,0x20,0x20,0x20,0x20,0x20,0x20};
    static const u8 G_V[7] = {0x88,0x88,0x88,0x88,0x88,0x50,0x20};
    static const u8 G_W[7] = {0x88,0x88,0x88,0xA8,0xA8,0xD8,0x88};
    static const u8 G_Y[7] = {0x88,0x88,0x50,0x20,0x20,0x20,0x20};
    static const u8 G_DOT[7] = {0x00,0x00,0x00,0x00,0x00,0x60,0x60};
    static const u8 G_SP[7]  = {0x00,0x00,0x00,0x00,0x00,0x00,0x00};

    switch (ch) {
        case '0': return G_0; case '1': return G_1; case '2': return G_2;
        case '3': return G_3; case '4': return G_4; case '5': return G_5;
        case '6': return G_6; case '7': return G_7; case '8': return G_8;
        case '9': return G_9; case 'A': return G_A; case 'B': return G_B;
        case 'C': return G_C; case 'E': return G_E; case 'L': return G_L;
        case 'O': return G_O; case 'P': return G_P; case 'R': return G_R;
        case 'T': return G_T; case 'V': return G_V; case 'W': return G_W;
        case 'Y': return G_Y; case '.': return G_DOT;
        default:  return G_SP;
    }
}

static void fb_draw_str_center(u8 *bw, u8 *red, const char *s, int y, int scale, int color) {
    int len = 0;
    while (s[len]) len++;
    int char_w = 6 * scale;
    int total_w = len * char_w - scale;
    int ox = (EPD_VISIBLE_W - total_w) / 2;
    for (int i = 0; i < len; i++) {
        const u8 *g = lookup_5x7(s[i]);
        for (int r = 0; r < 7; r++) {
            for (int c = 0; c < 5; c++) {
                if (g[r] & (0x80u >> c)) {
                    fb_fill_rect(bw, red, ox + i * char_w + c * scale, y + r * scale, scale, scale, color);
                }
            }
        }
    }
}

void epd_render_low_battery(u8 *bw_plane, u8 *red_plane, u16 mv) {
    memset(bw_plane, 0, EPD_PLANE_BYTES);
    memset(red_plane, 0, EPD_PLANE_BYTES);

    /* Outer red border */
    fb_fill_rect(bw_plane, red_plane, 4, 4, EPD_VISIBLE_W - 8, 3, 2);
    fb_fill_rect(bw_plane, red_plane, 4, EPD_HEIGHT - 7, EPD_VISIBLE_W - 8, 3, 2);
    fb_fill_rect(bw_plane, red_plane, 4, 4, 3, EPD_HEIGHT - 8, 2);
    fb_fill_rect(bw_plane, red_plane, EPD_VISIBLE_W - 7, 4, 3, EPD_HEIGHT - 8, 2);

    /* Large vertical battery icon centered at top-middle */
    int bx = 37, by = 34, bw = 48, bh = 74;
    /* Positive terminal cap */
    fb_fill_rect(bw_plane, red_plane, bx + 14, by - 8, 20, 8, 1);
    /* Battery outline (4px thick) */
    fb_fill_rect(bw_plane, red_plane, bx, by, bw, 4, 1);
    fb_fill_rect(bw_plane, red_plane, bx, by + bh - 4, bw, 4, 1);
    fb_fill_rect(bw_plane, red_plane, bx, by, 4, bh, 1);
    fb_fill_rect(bw_plane, red_plane, bx + bw - 4, by, 4, bh, 1);
    /* Red low-level bar at bottom + red exclamation mark inside */
    fb_fill_rect(bw_plane, red_plane, bx + 8, by + bh - 16, bw - 16, 8, 2);
    fb_fill_rect(bw_plane, red_plane, bx + 21, by + 14, 6, 24, 2);
    fb_fill_rect(bw_plane, red_plane, bx + 21, by + 44, 6, 6, 2);

    /* Text: LOW / BATTERY / voltage / CR2450 */
    fb_draw_str_center(bw_plane, red_plane, "LOW", 126, 2, 2);
    fb_draw_str_center(bw_plane, red_plane, "BATTERY", 148, 2, 2);

    /* Format voltage "X.XXV" */
    char vstr[6] = "0.00V";
    u16 v = mv;
    vstr[0] = (char)('0' + (v / 1000) % 10);
    vstr[2] = (char)('0' + (v / 100) % 10);
    vstr[3] = (char)('0' + (v / 10) % 10);
    fb_draw_str_center(bw_plane, red_plane, vstr, 180, 2, 1);

    fb_fill_rect(bw_plane, red_plane, 16, 204, EPD_VISIBLE_W - 32, 2, 1);
    fb_draw_str_center(bw_plane, red_plane, "REPLACE", 214, 1, 1);
    fb_draw_str_center(bw_plane, red_plane, "CR2450", 226, 1, 1);
}
