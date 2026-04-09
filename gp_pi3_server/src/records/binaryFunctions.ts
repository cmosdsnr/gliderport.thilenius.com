export type SensorPackedRecord = {
  epoch: number;
  speed: number;
  angle: number;
  w_count: number;
  r_temp_count: number;
  r_temp_read: number;
  r_temp_ref: number;
  s_count: number;
  s_humidity: number;
  s_temp_dht: number;
  s_temp_bmp: number;
  s_pressure: number;
};

/**
 * Pack one record into a 12-byte Buffer.
 * - First 4 bytes: a 32-bit unsigned integer (timestamp).
 *
 * - speed : 9 bits (0-511)
 * - angle : 9 bits (0-511)
 * - w_count : 10 bit (0-1024)
 * - r_temp_count : 12 bits (0-4096)
 * - r_temp_read : 12 bits (0-4096)
 * - r_temp_ref : 13 bits (0-8192)
 * - s_count : 7 bits (0-127)
 * - s_humidity : 7 bits (0-127)
 * - s_temp_dht : 10 bits (0-1024)
 * - s_temp_bmp : 10 bits (0-1024)
 * - s_pressure : 13 bits (0-8192)
 * Total = 14 bytes (112 bits).
 *
 */
export function packSensorRecord(record: SensorPackedRecord): Buffer {
  const buf = Buffer.alloc(18); // 4 (timestamp) + 14 (data)

  // Write epoch as 32-bit unsigned int
  buf.writeUInt32LE(record.epoch, 0);

  let packed = BigInt(0);

  packed = (packed << 9n) | BigInt(record.speed & 0x1ff); // 9 bits
  packed = (packed << 9n) | BigInt(record.angle & 0x1ff); // 9 bits
  packed = (packed << 10n) | BigInt(record.w_count & 0x3ff); // 10 bits
  packed = (packed << 12n) | BigInt(record.r_temp_count & 0xfff); // 12 bits
  packed = (packed << 12n) | BigInt(record.r_temp_read & 0xfff); // 12 bits
  packed = (packed << 13n) | BigInt(record.r_temp_ref & 0x1fff); // 13 bits
  packed = (packed << 7n) | BigInt(record.s_count & 0x7f); // 7 bits
  packed = (packed << 7n) | BigInt(record.s_humidity & 0x7f); // 7 bits
  packed = (packed << 10n) | BigInt(record.s_temp_dht & 0x3ff); // 10 bits
  packed = (packed << 10n) | BigInt(record.s_temp_bmp & 0x3ff); // 10 bits
  packed = (packed << 13n) | BigInt(record.s_pressure & 0x1fff); // 13 bits

  // Write 14 bytes of packed bits starting at offset 4
  for (let i = 0; i < 14; i++) {
    buf[17 - i] = Number((packed >> BigInt(i * 8)) & 0xffn);
  }

  return buf;
}

/**
 * Unpack a sensor record from an 18-byte buffer (reverse of packSensorRecord).
 *
 * @param buf - 18-byte Buffer
 * @returns SensorPackedRecord object
 */
export function unpackSensorRecord(buf: Buffer): SensorPackedRecord {
  if (buf.length !== 18) {
    throw new Error("Buffer must be exactly 18 bytes");
  }

  const epoch = buf.readUInt32LE(0); // First 4 bytes: timestamp

  // Read 14 packed bytes into a BigInt
  let packed = BigInt(0);
  for (let i = 0; i < 14; i++) {
    packed = (packed << 8n) | BigInt(buf[4 + i]);
  }

  // Helper to extract bits
  const extract = (bits: number): number => {
    const mask = (1n << BigInt(bits)) - 1n;
    const value = Number(packed & mask);
    packed >>= BigInt(bits);
    return value;
  };

  // Extract in reverse order of packing
  const s_pressure = extract(13);
  const s_temp_bmp = extract(10);
  const s_temp_dht = extract(10);
  const s_humidity = extract(7);
  const s_count = extract(7);
  const r_temp_ref = extract(13);
  const r_temp_read = extract(12);
  const r_temp_count = extract(12);
  const w_count = extract(10);
  const angle = extract(9);
  const speed = extract(9);

  return {
    epoch,
    speed,
    angle,
    w_count,
    r_temp_count,
    r_temp_read,
    r_temp_ref,
    s_count,
    s_humidity,
    s_temp_dht,
    s_temp_bmp,
    s_pressure,
  };
}
