#include "common.h"
#include "analog.h"
#include "clock.h"

/*
 * ZK_TESR21S_V2.1 (AESL0213C-TLSR8250) Hardware UART Demo
 * Verified board test pads:
 *   TXD = PC2 (TLSR8250 hardware UART_TX / 7816_TRX)
 *   RXD = PC3 (TLSR8250 hardware UART_RX)
 *   LED_RED = PB4 (active LOW)
 *   LED_GRN = PB5 (active LOW)
 *
 * Baudrate: 115200 8N1 (24MHz crystal, div=12, bwpc=15 -> 115384.6 bps, 0.16% err)
 */

#define LED_RED GPIO_PB4
#define LED_GRN GPIO_PB5

#define TICK_PER_US 16U

static u8 uart_tx_idx = 0;
static u8 uart_rx_idx = 0;

static void wait_ticks(u32 ticks) {
    u32 start = reg_system_tick;
    while ((u32)(reg_system_tick - start) < ticks) {}
}

static void delay_ms(u32 ms) {
    while (ms--) {
        wait_ticks(1000U * TICK_PER_US);
    }
}

static void pin_as_output(GPIO_PinTypeDef pin, int init_val) {
    u8 bit = pin & 0xff;
    BM_SET(reg_gpio_func(pin), bit);
    gpio_write(pin, init_val);
    gpio_set_output_en(pin, 1);
}

static void sys_clock_init_24m(void) {
    analog_write(0x82, 0x64);
    analog_write(0x52, 0x80);
    analog_write(0x0b, 0x38);
    analog_write(0x8c, 0x02);
    analog_write(0x02, 0xa2);

    /* Calibrate 24MHz RC */
    analog_write(0xc8, 0x80);
    analog_write(0x30, analog_read(0x30) | BIT(7));
    analog_write(0xc7, 0x0e);
    analog_write(0xc7, 0x0f);
    while ((analog_read(0xcf) & 0x80) == 0) {}
    analog_write(0x33, analog_read(0xcb));
    analog_write(0x30, analog_read(0x30) & (~BIT(7)));
    analog_write(0xc7, 0x0e);

    /* Enable peripheral & system timer clocks, keep SWIRE enabled */
    reg_rst_clk = FLD_CLK_SPI_EN | FLD_CLK_UART_EN | FLD_CLK_SWIRE_EN;
    reg_clk_en  = FLD_CLK_ZB_EN | FLD_CLK_SYS_TIMER_EN | FLD_CLK_DMA_EN | FLD_CLK_MCIC_EN | BIT(13);

    /* 24MHz crystal -> FHS -> SCLK */
    reg_fhs_sel = FLD_FHS_SELECT;
    reg_clk_sel = MASK_VAL(FLD_SCLK_DIV, 1) | MASK_VAL(FLD_SCLK_SEL, 1);

    /* Start 16 MHz system tick */
    reg_system_tick_ctrl = FLD_SYSTEM_TICK_START;
}

static void hw_uart_init_115200(void) {
    /* Reset UART module */
    REG_ADDR8(0x60) |= BIT(5);
    REG_ADDR8(0x60) &= ~BIT(5);

    /* 115200 bps @ 24MHz: div = 12, bwpc = 15 */
    REG_ADDR16(0x94) = 12 | BIT(15);      /* reg_uart_clk_div + FLD_UART_CLK_DIV_EN */
    REG_ADDR8(0x96)  = 15;                /* reg_uart_ctrl0: bwpc=15, NDMA mode */
    REG_ADDR8(0x97)  = 0x00;              /* reg_uart_ctrl1: no parity, 1 stop bit */
    REG_ADDR8(0x9a)  = (15 + 1) * 12;     /* reg_uart_rx_timeout0 */
    REG_ADDR8(0x9b)  = 0x00;              /* reg_uart_rx_timeout1 */
    REG_ADDR8(0x9d)  = 0x00;
    REG_ADDR8(0x9f)  = 0x03;              /* clear rx/tx status */

    /* Pull-up 10K on PC2 (bits 5:4) & PC3 (bits 7:6) in analog reg 0x12 */
    analog_write(0x12, (analog_read(0x12) & 0x0f) | 0xf0);

    /* Mux PC2 -> 7816_TRX/UART_TX (0x5ac[5:4]=1), PC3 -> UART_RX (0x5ac[7:6]=1) */
    REG_ADDR8(0x5ac) = (REG_ADDR8(0x5ac) & ~(BIT(5) | BIT(4) | BIT(7) | BIT(6)))
                     | BIT(4) | BIT(6);
    BM_CLR(reg_gpio_func(GPIO_PC2), BIT(2) | BIT(3));

    /* Enable input on both TX (PC2) and RX (PC3) per Telink datasheet */
    analog_write(areg_gpio_pc_ie, analog_read(areg_gpio_pc_ie) | BIT(2) | BIT(3));

    uart_tx_idx = 0;
    uart_rx_idx = 0;
}

static void uart_putc(u8 ch) {
    while ((REG_ADDR8(0x9c) >> 4) > 7) {}
    REG_ADDR8(0x90 + uart_tx_idx) = ch;
    uart_tx_idx = (uart_tx_idx + 1) & 0x03;
}

static void uart_puts(const char *s) {
    while (*s) {
        uart_putc((u8)*s++);
    }
}

static void uart_put_hex8(u8 v) {
    const char hex[] = "0123456789ABCDEF";
    uart_putc((u8)hex[(v >> 4) & 0x0f]);
    uart_putc((u8)hex[v & 0x0f]);
}

static int uart_rx_available(void) {
    return (REG_ADDR8(0x9c) & 0x0f) > 0;
}

static u8 uart_getc(void) {
    u8 ch = REG_ADDR8(0x90 + uart_rx_idx);
    uart_rx_idx = (uart_rx_idx + 1) & 0x03;
    return ch;
}

static void print_help(void) {
    uart_puts("\r\n=== TLSR8250 Hardware UART Demo (115200 8N1) ===\r\n");
    uart_puts("TX=PC2, RX=PC3 | Commands:\r\n");
    uart_puts("  r : Toggle RED LED (PB4)\r\n");
    uart_puts("  g : Toggle GREEN LED (PB5)\r\n");
    uart_puts("  b : Blink RED/GREEN 3x\r\n");
    uart_puts("  h : Show this menu\r\n");
    uart_puts("  (any other key will be echoed)\r\n> ");
}

_attribute_ram_code_ int main(void) {
    reg_irq_en = 0;
    REG_ADDR32(0x60) = 0xff000000;
    REG_ADDR16(0x64) = 0xffff;
    REG_ADDR8(0x622) = 0; /* Disable watchdog */

    sys_clock_init_24m();

    pin_as_output(LED_RED, 1);
    pin_as_output(LED_GRN, 1);
    int red_on = 0;
    int grn_on = 0;

    hw_uart_init_115200();

    /* Boot flash: Green twice */
    for (int i = 0; i < 2; i++) {
        gpio_write(LED_GRN, 0);
        delay_ms(60);
        gpio_write(LED_GRN, 1);
        delay_ms(60);
    }

    print_help();

    while (1) {
        /* Clear RX error flag if any */
        if (REG_ADDR8(0x9d) & BIT(6)) {
            REG_ADDR8(0x9f) = BIT(6);
        }

        if (uart_rx_available()) {
            u8 c = uart_getc();
            if (c == 'r' || c == 'R') {
                red_on = !red_on;
                gpio_write(LED_RED, red_on ? 0 : 1);
                uart_puts(red_on ? "RED LED -> ON\r\n> " : "RED LED -> OFF\r\n> ");
            } else if (c == 'g' || c == 'G') {
                grn_on = !grn_on;
                gpio_write(LED_GRN, grn_on ? 0 : 1);
                uart_puts(grn_on ? "GREEN LED -> ON\r\n> " : "GREEN LED -> OFF\r\n> ");
            } else if (c == 'b' || c == 'B') {
                uart_puts("Blinking...\r\n");
                for (int i = 0; i < 3; i++) {
                    gpio_write(LED_RED, 0); gpio_write(LED_GRN, 1); delay_ms(120);
                    gpio_write(LED_RED, 1); gpio_write(LED_GRN, 0); delay_ms(120);
                }
                gpio_write(LED_RED, red_on ? 0 : 1);
                gpio_write(LED_GRN, grn_on ? 0 : 1);
                uart_puts("Done!\r\n> ");
            } else if (c == 'h' || c == 'H' || c == '?') {
                print_help();
            } else if (c == '\r' || c == '\n') {
                uart_puts("\r\n> ");
            } else {
                uart_puts("[ECHO] '");
                if (c >= 0x20 && c <= 0x7e) {
                    uart_putc(c);
                } else {
                    uart_putc('.');
                }
                uart_puts("' (0x");
                uart_put_hex8(c);
                uart_puts(")\r\n> ");
            }
        }
    }
}
