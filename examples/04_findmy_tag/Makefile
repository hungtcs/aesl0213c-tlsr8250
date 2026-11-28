TEL_CHIP := -DCHIP_TYPE=CHIP_TYPE_8258
TEL_PATH ?= ../ble_sdk
LIBS := -llt_8258

ROOT_DIR := $(abspath ../..)
export PATH := $(ROOT_DIR)/toolchain/tc32/bin:$(PATH)

PROJECT_NAME := findmy_tag
PROJECT_PATH := .
OUT_PATH := $(PROJECT_PATH)/build

ifneq ($(TEL_PATH)/make/makefile, $(wildcard $(TEL_PATH)/make/makefile))
$(error "Please set TEL_PATH to a valid Telink B85m BLE SDK path (current: $(TEL_PATH))")
endif

-include $(TEL_PATH)/make/makefile

.PHONY: flash-sws
flash-sws: $(BIN_FILE)
	$(ROOT_DIR)/scripts/flash.sh $(BIN_FILE)
