export const SWS_BAUD_RATES = [115200, 230400, 460800, 921600] as const;
export const SWS_ACTIVATE_TIMES = [
  { value: 0, label: "0 ms" },
  { value: 100, label: "100 ms" },
  { value: 1000, label: "1 sec" },
  { value: 2000, label: "2 sec" },
  { value: 3000, label: "3 sec" },
  { value: 4000, label: "4 sec" },
  { value: 8000, label: "8 sec" },
  { value: 16000, label: "16 sec" },
] as const;

export function formatHexUpper(num: number, length: number): string {
  return (num >>> 0).toString(16).toUpperCase().padStart(length, "0");
}

export function isValidTelinkBin(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 16) return false;
  const magic = new DataView(buf, 8, 4).getUint32(0, true);
  return magic === 0x544c4e4b;
}

/**
 * Encode a Telink SWS write transaction into UART TX bytes (10 UART bytes per SWS byte).
 * Exact byte-for-byte match with pvvx sws_flasher.html `sws_wr_addr`.
 */
export function swsWrAddr(addr: number, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const d = new Uint8Array(10);
  const h = new Uint8Array([0x5a, (addr >> 16) & 0xff, (addr >> 8) & 0xff, addr & 0xff, 0x00]);
  const pkt = new Uint8Array((data.byteLength + 6) * 10);
  d[0] = 0x80; // start bit byte cmd swire = 1
  d[9] = 0xfe; // stop bit swire = 0

  for (let n = 0; n < h.length; n++) {
    const el = h[n];
    let m = 0x80;
    let idx = 1;
    do {
      d[idx] = (el & m) !== 0 ? 0x80 : 0xfe;
      idx += 1;
      m >>= 1;
    } while (m !== 0);
    pkt.set(d, n * 10);
    d[0] = 0xfe; // start bit next byte swire = 0
  }

  for (let n = 0; n < data.length; n++) {
    const el = data[n];
    let m = 0x80;
    let idx = 1;
    do {
      d[idx] = (el & m) !== 0 ? 0x80 : 0xfe;
      idx += 1;
      m >>= 1;
    } while (m !== 0);
    pkt.set(d, (n + 5) * 10);
  }

  // swire stop cmd = 0xff
  d.fill(0x80, 0, 9);
  pkt.set(d, (data.byteLength + 5) * 10);
  return pkt;
}

export function buildFlashByteCmdPkts(cmd: number): Uint8Array<ArrayBuffer>[] {
  return [
    swsWrAddr(0x0d, new Uint8Array([0x00])), // cns low
    swsWrAddr(0x0c, new Uint8Array([cmd & 0xff, 0x01])), // Flash cmd + cns high
  ];
}

export function buildWriteFifoPkts(addr: number, data: Uint8Array): Uint8Array<ArrayBuffer>[] {
  return [
    swsWrAddr(0x00b3, new Uint8Array([0x80])), // fifo mode
    swsWrAddr(addr, data),
    swsWrAddr(0x00b3, new Uint8Array([0x00])), // normal mode
  ];
}

export function buildSectorErasePkts(addr: number): Uint8Array<ArrayBuffer>[] {
  return [
    ...buildFlashByteCmdPkts(0x06), // Write Enable
    swsWrAddr(0x0d, new Uint8Array([0x00])), // cns low
    swsWrAddr(0x0c, new Uint8Array([0x20])), // sector erase
    swsWrAddr(0x0c, new Uint8Array([(addr >> 16) & 0xff])),
    swsWrAddr(0x0c, new Uint8Array([(addr >> 8) & 0xff])),
    swsWrAddr(0x0c, new Uint8Array([addr & 0xff, 0x01])), // addr lo + cns high
  ];
}

export function buildWriteFlashBlkPkts(addr: number, data: Uint8Array): Uint8Array<ArrayBuffer>[] {
  const blk = new Uint8Array(4 + data.byteLength);
  blk[0] = 0x02;
  blk[1] = (addr >> 16) & 0xff;
  blk[2] = (addr >> 8) & 0xff;
  blk[3] = addr & 0xff;
  blk.set(data, 4);
  return [
    ...buildFlashByteCmdPkts(0x06), // Write Enable
    swsWrAddr(0x0d, new Uint8Array([0x00])), // cns low
    ...buildWriteFifoPkts(0x0c, blk),
    swsWrAddr(0x0d, new Uint8Array([0x01])), // cns high
  ];
}

export function buildCpuStopPkt(): Uint8Array<ArrayBuffer> {
  return swsWrAddr(0x0602, new Uint8Array([0x05]));
}

export function buildSwsSpeedPkt(speed = 55): Uint8Array<ArrayBuffer> {
  return swsWrAddr(0x00b2, new Uint8Array([speed & 0xff]));
}

export function buildSoftResetPkt(): Uint8Array<ArrayBuffer> {
  return swsWrAddr(0x06f, new Uint8Array([0x20]));
}
