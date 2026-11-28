#pragma once

/*
 * Board pinout for Alibaba Cloud / ZKONG AESL0213C-TLSR8250 (PCB: ZK_TESR21S_V2.1)
 * All pins verified from factory firmware disassembly + hardware testing.
 */

/* On-board LEDs (active LOW) */
#define BOARD_LED_RED    GPIO_PB4
#define BOARD_LED_GRN    GPIO_PB5

/* Hardware UART test pads (115200 8N1) */
#define BOARD_UART_TX    GPIO_PC2
#define BOARD_UART_RX    GPIO_PC3

/* 2.13" B/W/R E-Paper Display (HINK-E0213A170, UC8151-like) */
#define BOARD_EPD_PWR    GPIO_PB1  /* active HIGH: 1 = ON, 0 = OFF */
#define BOARD_EPD_CS     GPIO_PD2
#define BOARD_EPD_DC     GPIO_PD3
#define BOARD_EPD_RST    GPIO_PA1
#define BOARD_EPD_CLK    GPIO_PD7
#define BOARD_EPD_MOSI   GPIO_PB7
#define BOARD_EPD_BUSY   GPIO_PA0  /* active LOW: 0 = busy, 1 = idle */

/* Do NOT repurpose PA7 (SWS single-wire programming interface) */
#define BOARD_SWS_PIN    GPIO_PA7
