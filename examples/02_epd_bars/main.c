#include "common.h"
#include "analog.h"
#include "clock.h"

/*
 * ZK_TESR21S_V2.1 (Alibaba Cloud AESL0213C-TLSR8250) Minimal Bare-Metal EPD Test
 * Testing UC8151 / IL0373 (active-LOW BUSY: 0 = busy, 1 = idle)
 * Pins 100% verified from backup_orig.bin:
 *   EPD_PWR  = PB1 (active HIGH: 1 = ON, 0 = OFF)
 *   EPD_CS   = PD2
 *   EPD_DC   = PD3
 *   EPD_RST  = PA1
 *   EPD_CLK  = PD7
 *   EPD_MOSI = PB7
 *   EPD_BUSY = PA0 (UC8151: 0 = busy, 1 = idle)
 *   LED_RED  = PB4 (active LOW)
 *   LED_GRN  = PB5 (active LOW)
 */

#define EPD_PWR   GPIO_PB1
#define EPD_CS    GPIO_PD2
#define EPD_DC    GPIO_PD3
#define EPD_RST   GPIO_PA1
#define EPD_CLK   GPIO_PD7
#define EPD_MOSI  GPIO_PB7
#define EPD_BUSY  GPIO_PA0

#define LED_RED   GPIO_PB4
#define LED_GRN   GPIO_PB5

static void delay_us(u32 us) {
    volatile u32 n = us * 3;
    while (n--) {
        __asm__ volatile("tnop");
    }
}

static void delay_ms(u32 ms) {
    while (ms--) {
        delay_us(1000);
    }
}

static void pin_as_output(GPIO_PinTypeDef pin, int init_val) {
    u8 bit = pin & 0xff;
    BM_SET(reg_gpio_func(pin), bit);
    gpio_write(pin, init_val);
    gpio_set_output_en(pin, 1);
}

static void pin_as_input(GPIO_PinTypeDef pin) {
    u8 bit = pin & 0xff;
    BM_SET(reg_gpio_func(pin), bit);
    gpio_set_output_en(pin, 0);
    if ((pin >> 8) == 0) {
        BM_SET(reg_gpio_ie(pin), bit);
    } else if ((pin >> 8) == 1) {
        analog_write(areg_gpio_pb_ie, analog_read(areg_gpio_pb_ie) | bit);
    } else if ((pin >> 8) == 2) {
        analog_write(areg_gpio_pc_ie, analog_read(areg_gpio_pc_ie) | bit);
    } else {
        BM_SET(reg_gpio_ie(pin), bit);
    }
}

static void spi_write_byte(u8 b) {
    for (int i = 0; i < 8; i++) {
        gpio_write(EPD_CLK, 0);
        gpio_write(EPD_MOSI, (b & 0x80) ? 1 : 0);
        delay_us(5);
        gpio_write(EPD_CLK, 1);
        delay_us(5);
        b <<= 1;
    }
    gpio_write(EPD_CLK, 0);
}

static void epd_cmd(u8 cmd) {
    gpio_write(EPD_DC, 0);
    gpio_write(EPD_CS, 0);
    delay_us(5);
    spi_write_byte(cmd);
    delay_us(5);
    gpio_write(EPD_CS, 1);
}

static void epd_data(u8 d) {
    gpio_write(EPD_DC, 1);
    gpio_write(EPD_CS, 0);
    delay_us(5);
    spi_write_byte(d);
    delay_us(5);
    gpio_write(EPD_CS, 1);
}

/* UC8151 BUSY is active-LOW: 0 = busy, 1 = idle */
static int epd_wait_busy_uc(u32 timeout_ms) {
    u32 elapsed = 0;
    while (!gpio_read(EPD_BUSY)) {
        delay_ms(10);
        elapsed += 10;
        if (elapsed >= timeout_ms) {
            return 0;
        }
    }
    return 1;
}

static void led_blink(GPIO_PinTypeDef led, int count, u32 on_ms, u32 off_ms) {
    for (int i = 0; i < count; i++) {
        gpio_write(led, 0);
        delay_ms(on_ms);
        gpio_write(led, 1);
        delay_ms(off_ms);
    }
}

_attribute_ram_code_ int main(void) {
    reg_irq_en = 0;
    REG_ADDR32(0x60) = 0xff000000;
    REG_ADDR16(0x64) = 0xffff;
    REG_ADDR8(0x622) = 0; /* Disable watchdog */

    pin_as_output(LED_RED, 1);
    pin_as_output(LED_GRN, 1);

    /* Boot indicator: Red then Green */
    led_blink(LED_RED, 1, 150, 100);
    led_blink(LED_GRN, 1, 150, 100);

    /* Init EPD pins */
    pin_as_output(EPD_PWR,  0);
    pin_as_output(EPD_CS,   1);
    pin_as_output(EPD_DC,   1);
    pin_as_output(EPD_RST,  1);
    pin_as_output(EPD_CLK,  0);
    pin_as_output(EPD_MOSI, 0);
    pin_as_input(EPD_BUSY);

    /* Power ON EPD (PB1 = HIGH) */
    gpio_write(EPD_PWR, 1);
    delay_ms(50);

    /* Hardware Reset (exact backup_orig.bin 0xbb4c sequence) */
    gpio_write(EPD_RST, 0);
    delay_ms(20);
    gpio_write(EPD_RST, 1);
    delay_ms(20);

    /* Exact HINK-E0213A170 (epd_type 0x6c) init from backup_orig.bin 0xbba8 */
    epd_cmd(0x4D); epd_data(0x55);
    epd_cmd(0xA9); epd_data(0x25);
    epd_cmd(0xF3); epd_data(0x0A);

    /* DTM1 (0x10): B/W RAM (16 bytes x 250 rows = 4000 bytes) */
    epd_cmd(0x10);
    for (int y = 0; y < 250; y++) {
        u8 bw = (y < 83) ? 0x00 : 0xFF;
        for (int x = 0; x < 16; x++) {
            epd_data(bw);
        }
    }

    /* DTM2 (0x13): RED RAM (1 = RED, 0 = NO RED -> Top BLACK, Mid WHITE, Bottom RED) */
    epd_cmd(0x13);
    for (int y = 0; y < 250; y++) {
        u8 red = (y >= 166) ? 0xFF : 0x00;
        for (int x = 0; x < 16; x++) {
            epd_data(red);
        }
    }

    /* Green LED ON during refresh (exact backup_orig.bin 0xbb18 sequence) */
    gpio_write(LED_GRN, 0);

    epd_cmd(0x04); /* Power ON */
    epd_wait_busy_uc(5000);
    delay_ms(10);

    epd_cmd(0x12); /* Display Refresh */
    delay_ms(10);
    int ok = epd_wait_busy_uc(25000);

    /* Power OFF & Deep Sleep */
    epd_cmd(0x02);
    epd_wait_busy_uc(2000);
    epd_cmd(0x07);
    epd_data(0xA5);
    delay_ms(50);
    gpio_write(EPD_PWR, 0);
    gpio_write(LED_GRN, 1);

    /* Result:
     *   ok == 1 -> Green slow blink
     *   ok == 0 -> Red fast blink
     */
    while (1) {
        if (ok) {
            led_blink(LED_GRN, 1, 500, 1000);
        } else {
            led_blink(LED_RED, 1, 150, 150);
        }
    }
}
