# Shared Makefile rules for bare-metal TLSR8250 examples
# Usage in each example's Makefile:
#   TARGET = my_demo
#   include ../common/baremetal.mk

ROOT_DIR   := $(abspath ../..)
COMMON_DIR := ../common
SDK_DIR    := ../sdk
BUILD_DIR  := build

ifneq ($(wildcard $(ROOT_DIR)/toolchain/tc32/bin/tc32-elf-gcc),)
  TC32_PREFIX ?= $(ROOT_DIR)/toolchain/tc32/bin/tc32
else
  TC32_PREFIX ?= tc32
endif

CC      := $(TC32_PREFIX)-elf-gcc
OBJCOPY := $(TC32_PREFIX)-elf-objcopy
SIZE    := $(TC32_PREFIX)-elf-size

CRT0     := $(COMMON_DIR)/cstartup.S
LDSCRIPT := $(COMMON_DIR)/boot_825x.link

CFLAGS  += -O2 -Wall -Wextra -fdata-sections -ffunction-sections \
           -fpack-struct -fshort-enums -finline-small-functions -fshort-wchar -fms-extensions \
           -std=gnu99 -I$(COMMON_DIR) -I$(SDK_DIR)/Include

LDFLAGS += -Wl,--gc-sections -T $(LDSCRIPT) -nostartfiles -nostdlib

SRCS ?= main.c
OBJS := $(addprefix $(BUILD_DIR)/,$(SRCS:.c=.o)) $(BUILD_DIR)/analog.o

BIN := $(BUILD_DIR)/$(TARGET).bin
ABS := $(BUILD_DIR)/$(TARGET).abs

.PHONY: all clean flash

all: $(BIN)

$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

$(BUILD_DIR)/%.o: %.c | $(BUILD_DIR)
	$(CC) -c $(CFLAGS) $< -o $@

$(BUILD_DIR)/analog.o: $(SDK_DIR)/Source/analog.c | $(BUILD_DIR)
	$(CC) -c $(CFLAGS) $< -o $@

$(BIN): $(OBJS) $(CRT0) | $(BUILD_DIR)
	$(CC) $(CFLAGS) $(OBJS) $(CRT0) $(LDFLAGS) -o $(ABS)
	$(OBJCOPY) -O binary $(ABS) $(BIN)
	$(SIZE) $(ABS)
	@ls -lh $(BIN)

flash: $(BIN)
	$(ROOT_DIR)/scripts/flash.sh $(BIN)

clean:
	rm -rf $(BUILD_DIR)
