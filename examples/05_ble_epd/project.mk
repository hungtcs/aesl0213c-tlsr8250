INCLUDE_PATHS += -I$(PROJECT_PATH)/src
OUT_DIR += /src

OBJS += \
$(OUT_PATH)/src/app.o \
$(OUT_PATH)/src/main.o \
$(OUT_PATH)/src/epd.o \
$(OUT_PATH)/src/vbat.o

$(OUT_PATH)/src/%.o: ./src/%.c
	@echo 'Building file: $<'
	@tc32-elf-gcc $(GCC_FLAGS) $(INCLUDE_PATHS) -c -o"$@" "$<"
