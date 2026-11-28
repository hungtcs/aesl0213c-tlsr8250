#include "uart_hal.h"
#include "drivers.h"

#define RING_MASK (UART_RX_RING_SIZE - 1)

static u8  s_tx_idx = 0;
static u8  s_rx_idx = 0;
static u8  s_ring[UART_RX_RING_SIZE];
static u16 s_ring_head = 0;
static u16 s_ring_tail = 0;
static u32 s_last_rx_tick = 0;

static void get_baud_params_24m(u32 baud, u16 *div, u8 *bwpc) {
    switch (baud) {
        case 9600:   *div = 249; *bwpc = 9;  break; /* 9600.0 bps */
        case 19200:  *div = 124; *bwpc = 9;  break; /* 19200.0 bps */
        case 38400:  *div = 51;  *bwpc = 11; break; /* 38461.5 bps (+0.16%) */
        case 57600:  *div = 25;  *bwpc = 15; break; /* 57692.3 bps (+0.16%) */
        case 230400: *div = 12;  *bwpc = 7;  break; /* 230769.2 bps (+0.16%) */
        case 115200:
        default:     *div = 12;  *bwpc = 15; break; /* 115384.6 bps (+0.16%) */
    }
}

void uart_hal_init(u32 baudrate) {
    u16 div;
    u8 bwpc;
    get_baud_params_24m(baudrate, &div, &bwpc);

    /* Reset UART module */
    REG_ADDR8(0x60) |= BIT(5);
    REG_ADDR8(0x60) &= ~BIT(5);

    /* Enable UART clock */
    REG_ADDR8(0x63) |= BIT(5);

    /* Configure NDMA FIFO mode */
    REG_ADDR16(0x94) = div | BIT(15);
    REG_ADDR8(0x96)  = bwpc;
    REG_ADDR8(0x97)  = 0x00; /* No parity, 1 stop bit */
    REG_ADDR8(0x9a)  = (u8)((bwpc + 1) * 12);
    REG_ADDR8(0x9b)  = 0x00;
    REG_ADDR8(0x9d)  = 0x00;
    REG_ADDR8(0x9f)  = 0x03;

    /* 10K pull-up on PC2 (TX) & PC3 (RX) */
    analog_write(0x12, (analog_read(0x12) & 0x0f) | 0xf0);

    /* Mux PC2 -> UART_TX (7816_TRX), PC3 -> UART_RX */
    gpio_set_func(GPIO_PC2, AS_UART);
    gpio_set_func(GPIO_PC3, AS_UART);
    gpio_set_input_en(GPIO_PC2, 1);
    gpio_set_input_en(GPIO_PC3, 1);

    s_tx_idx = 0;
    s_rx_idx = 0;
    s_ring_head = 0;
    s_ring_tail = 0;
    s_last_rx_tick = clock_time();
}

_attribute_ram_code_ void uart_hal_poll_rx(void) {
    /* Clear RX error flag if any */
    if (REG_ADDR8(0x9d) & BIT(6)) {
        REG_ADDR8(0x9f) = BIT(6);
    }

    while ((REG_ADDR8(0x9c) & 0x0f) > 0) {
        u8 ch = REG_ADDR8(0x90 + s_rx_idx);
        s_rx_idx = (s_rx_idx + 1) & 0x03;

        u16 next = (u16)((s_ring_head + 1) & RING_MASK);
        if (next != s_ring_tail) {
            s_ring[s_ring_head] = ch;
            s_ring_head = next;
        }
        s_last_rx_tick = clock_time();
    }
}

int uart_hal_rx_count(void) {
    return (int)((s_ring_head - s_ring_tail) & RING_MASK);
}

int uart_hal_rx_pop(u8 *out) {
    if (s_ring_head == s_ring_tail) {
        return 0;
    }
    *out = s_ring[s_ring_tail];
    s_ring_tail = (u16)((s_ring_tail + 1) & RING_MASK);
    return 1;
}

int uart_hal_rx_read(u8 *dst, int max_len) {
    int n = 0;
    while (n < max_len && s_ring_head != s_ring_tail) {
        dst[n++] = s_ring[s_ring_tail];
        s_ring_tail = (u16)((s_ring_tail + 1) & RING_MASK);
    }
    return n;
}

void uart_hal_rx_clear(void) {
    s_ring_head = 0;
    s_ring_tail = 0;
}

u32 uart_hal_last_rx_tick(void) {
    return s_last_rx_tick;
}

void uart_hal_putc(u8 ch) {
    while ((REG_ADDR8(0x9c) >> 4) > 7) {
        uart_hal_poll_rx();
    }
    REG_ADDR8(0x90 + s_tx_idx) = ch;
    s_tx_idx = (s_tx_idx + 1) & 0x03;
}

void uart_hal_write(const u8 *data, int len) {
    for (int i = 0; i < len; i++) {
        uart_hal_putc(data[i]);
    }
}

void uart_hal_puts(const char *s) {
    while (*s) {
        uart_hal_putc((u8)*s++);
    }
}

void uart_hal_put_u32(u32 v) {
    char buf[12];
    int i = 0;
    if (v == 0) {
        uart_hal_putc('0');
        return;
    }
    while (v > 0 && i < 10) {
        buf[i++] = (char)('0' + (v % 10));
        v /= 10;
    }
    while (i > 0) {
        uart_hal_putc((u8)buf[--i]);
    }
}

void uart_hal_put_hex8(u8 v) {
    static const char hex[] = "0123456789ABCDEF";
    uart_hal_putc((u8)hex[(v >> 4) & 0x0f]);
    uart_hal_putc((u8)hex[v & 0x0f]);
}

void uart_hal_flush_tx(void) {
    while ((REG_ADDR8(0x9c) >> 4) > 0) {}
    sleep_us(2000);
}
