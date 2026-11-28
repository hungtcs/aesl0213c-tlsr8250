import argparse
import base64
import binascii
import copy
import hashlib
import inspect
import io
import os
import shlex
import struct
import sys
import time
import zlib
import string


__version__ = "0.1 dev"

PYTHON2 = sys.version_info[0] < 3  # True if on pre-Python 3


# Telink FW_CHECK_AGTHM2 nibble-based CRC32 table (matches liblt_8258.a crc32_half_tbl)
TELINK_CRC32_HALF_TBL = (
    0x00000000, 0x1DB71064, 0x3B6E20C8, 0x26D930AC,
    0x76DC4190, 0x6B6B51F4, 0x4DB26158, 0x5005713C,
    0xEDB88320, 0xF00F9344, 0xD6D6A3E8, 0xCB61B38C,
    0x9B64C2B0, 0x86D3D2D4, 0xA00AE278, 0xBDBDF21C,
)


def telink_fw_crc32(data):
    crc = 0xFFFFFFFF
    for b in data:
        crc = (crc >> 4) ^ TELINK_CRC32_HALF_TBL[(crc ^ (b & 0x0F)) & 0x0F]
        crc = (crc >> 4) ^ TELINK_CRC32_HALF_TBL[(crc ^ (b >> 4)) & 0x0F]
    return crc & 0xFFFFFFFF


def add_crc(args):
    with open(args.filename, "rb") as fp:
        data = bytearray(fp.read())

    # 1. Pad to 16-byte alignment with 0xFF (Telink OTA writes 16-byte blocks)
    rem = len(data) % 16
    if rem != 0:
        data.extend(b"\xff" * (16 - rem))

    # 2. Write total firmware size (padded_len + 4, so (fw_size & 0x0F) == 4) at 0x18..0x1B
    total_size = len(data) + 4
    if len(data) >= 0x1C:
        data[0x18:0x1C] = struct.pack("<I", total_size)

    # 3. Compute Telink FW_CHECK_AGTHM2 CRC32 (init 0xFFFFFFFF, no final XOR) and append LE
    crc32_result = telink_fw_crc32(data)
    data.extend(struct.pack("<I", crc32_result))

    with open(args.filename, "wb") as fp:
        fp.write(data)

    print("Firmware Size: %d (0x%x), Telink FW CRC32: 0x%08x" % (total_size, total_size, crc32_result))

def  combine(args) :
    ub = open(args.uart_boot, "rb")
    sf = open(args.src_firmware, "rb")
    df = open(args.dst_firmware, "w+b")

    df.write(ub.read())
    ub.close()

    df.seek(0x4000,0)
    sf.seek(0x4000,0)

    df.write(sf.read())

    df.seek(0x2c000,0)
    sf.seek(0x00000,0)

    df.write(sf.read(0x4000))
    sf.close()

    df.seek(0, 0)
    file_content = df.read()
    crc32_result = zlib.crc32(file_content) & 0xffffffff

    df.seek(0, 2)
    df.write(struct.pack('>I', crc32_result))

    print("Firmware CRC32: " + hex(crc32_result))

    df.close()  


def main(custom_commandline=None):

    parser = argparse.ArgumentParser(description='tl_fireware_tools.py v%s - Telink BLE Firmware Utility' % __version__)

    subparsers = parser.add_subparsers(dest='operation', help='Run tl_fireware_tools.py -h for additional help')
    
    add_crc = subparsers.add_parser('add_crc', help='Add CRC32 check to the file tail')
    add_crc.add_argument('filename', help='Firmware image')

    combine = subparsers.add_parser('combine', help='Combine Firmware with uart_boot')
    combine.add_argument('uart_boot', help='uart_boot firmware image')
    combine.add_argument('src_firmware', help='source firmware image')
    combine.add_argument('dst_firmware', help='target firmware image')


    args = parser.parse_args(custom_commandline)

    print('tl_fireware_tools.py v%s' % __version__)
    
    if args.operation is None:
        parser.print_help()
        sys.exit(1)

    operation_func = globals()[args.operation]

    operation_func(args)


def _main():
    #try:
    main()
    # except FatalError as e:
    #     print('\nA fatal error occurred: %s' % e)
    #     sys.exit(2)


if __name__ == '__main__':
    _main()