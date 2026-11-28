#pragma once

#include "tl_common.h"

#define UART_RX_RING_SIZE  1024 /* Power of 2 */

void uart_hal_init(u32 baudrate);
void uart_hal_poll_rx(void);

int  uart_hal_rx_count(void);
int  uart_hal_rx_pop(u8 *out);
int  uart_hal_rx_read(u8 *dst, int max_len);
void uart_hal_rx_clear(void);
u32  uart_hal_last_rx_tick(void);

void uart_hal_putc(u8 ch);
void uart_hal_write(const u8 *data, int len);
void uart_hal_puts(const char *s);
void uart_hal_put_u32(u32 v);
void uart_hal_put_hex8(u8 v);
void uart_hal_flush_tx(void);
