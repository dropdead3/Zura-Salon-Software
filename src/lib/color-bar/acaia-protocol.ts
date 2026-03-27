/**
 * Acaia Pearl BLE Protocol — Packet codec
 *
 * Based on reverse-engineered protocol from pyacaia / LunarGateway / btscale
 * open-source projects. The Acaia Pearl uses a proprietary GATT service with
 * binary packet encoding for weight notifications and commands.
 */

// --- GATT UUIDs ---
export const ACAIA_SERVICE_UUID = '00001820-0000-1000-8000-00805f9b34fb';
export const ACAIA_CHAR_UUID = '00002a80-0000-1000-8000-00805f9b34fb';

/** Name prefixes to filter during BLE scan */
export const ACAIA_NAME_PREFIXES = ['ACAIA', 'PROCHBT', 'PEARL'];

// --- Protocol constants ---
const HEADER1 = 0xef;
const HEADER2 = 0xdd;

// Message types (outgoing commands)
const MSG_SYSTEM = 0x00;
const MSG_TARE = 0x04;
const MSG_INFO = 0x06;
const MSG_STATUS = 0x08;
const MSG_IDENTIFY = 0x0b;
const MSG_EVENT = 0x0c;
const MSG_TIMER = 0x0d;

// Notification event types (incoming)
const EVENT_WEIGHT = 5;
const EVENT_WEIGHT_ALT = 7; // Some firmware versions use 7

// Units
const UNIT_GRAMS = 1;
const UNIT_OUNCES = 2;

export interface AcaiaWeightReading {
  weight: number;
  unit: 'g' | 'oz';
  stable: boolean;
}

// --- Encoding helpers ---

function encodePacket(type: number, payload: number[]): DataView {
  const len = payload.length + 1; // +1 for type byte
  const buf = new ArrayBuffer(5 + payload.length);
  const view = new DataView(buf);
  let idx = 0;
  view.setUint8(idx++, HEADER1);
  view.setUint8(idx++, HEADER2);
  view.setUint8(idx++, type);

  // Checksum bytes: high-nibble/low-nibble of length
  const cksum1 = (len & 0xff);
  const cksum2 = (len >> 8) & 0xff;
  view.setUint8(idx++, cksum1);
  view.setUint8(idx++, cksum2);

  // Payload not included in checksum for simplicity — Acaia accepts this format
  // Actually the format is: HEADER1 HEADER2 CMD payload_bytes CKSUM1 CKSUM2
  // Let me use the correct Acaia v2 encoding:
  // [HEADER1, HEADER2, type, ...payload, CKSUM1, CKSUM2]
  // where CKSUM = XOR of payload bytes only

  // Re-encode with correct format
  const buf2 = new ArrayBuffer(2 + 1 + payload.length + 2);
  const v2 = new DataView(buf2);
  let i2 = 0;
  v2.setUint8(i2++, HEADER1);
  v2.setUint8(i2++, HEADER2);
  v2.setUint8(i2++, type);
  let xorCk = 0;
  for (const b of payload) {
    v2.setUint8(i2++, b);
    xorCk ^= b;
  }
  v2.setUint8(i2++, xorCk & 0xff);
  v2.setUint8(i2++, (xorCk >> 8) & 0xff);
  return v2;
}

/**
 * Heartbeat/identification packet — must be sent every ~3s to keep
 * the Acaia Pearl from disconnecting.
 */
export function encodeIdent(): DataView {
  // Ident payload: [0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d]
  // Simplified: 15 bytes of 0x2d
  const payload = Array(15).fill(0x2d);
  return encodePacket(MSG_IDENTIFY, payload);
}

/**
 * Tare command — zeros the scale.
 */
export function encodeTare(): DataView {
  return encodePacket(MSG_TARE, [0x00]);
}

/**
 * Start weight notifications — tells the Pearl to begin streaming weight events.
 * Payload includes the notification type and weight change sensitivity.
 */
export function encodeStartWeightNotifications(): DataView {
  // Event config: enable weight updates, 0 = fastest interval
  // [0x01, 0x01, 0x00, 0x01, 0x02] — weight + battery events
  const payload = [
    0x01, // # of events to subscribe
    0x01, // weight event
    0x00, // reserved
    0x01, // weight interval (1 = fastest ~50ms updates)
    0x02, // battery change notification
  ];
  return encodePacket(MSG_EVENT, payload);
}

/**
 * Parse an incoming notification from the Acaia Pearl.
 * Returns a weight reading if the packet contains one, or null otherwise.
 */
export function decodeNotification(data: DataView): AcaiaWeightReading | null {
  // Minimum packet: HEADER1 HEADER2 TYPE ... (at least 6 bytes for weight)
  if (data.byteLength < 6) return null;

  const h1 = data.getUint8(0);
  const h2 = data.getUint8(1);

  // Validate header
  if (h1 !== HEADER1 || h2 !== HEADER2) return null;

  const msgType = data.getUint8(2);

  // Weight notification from event callback
  if (msgType === MSG_EVENT || msgType === MSG_STATUS) {
    return parseWeightEvent(data);
  }

  // Direct weight message (some firmware)
  if (msgType === EVENT_WEIGHT || msgType === EVENT_WEIGHT_ALT) {
    return parseWeightDirect(data);
  }

  return null;
}

function parseWeightEvent(data: DataView): AcaiaWeightReading | null {
  // Format after headers: TYPE EVENT_TYPE VALUE_BYTE_1 VALUE_BYTE_2 UNIT STABLE_FLAG ...
  if (data.byteLength < 7) return null;

  const eventType = data.getUint8(3);
  if (eventType !== EVENT_WEIGHT && eventType !== EVENT_WEIGHT_ALT) return null;

  // Weight: 2 bytes little-endian, offset 4-5
  const rawWeight = data.getUint8(4) | (data.getUint8(5) << 8);

  // Sign bit and scaling — Acaia uses a power/divisor byte
  const powerByte = data.byteLength > 7 ? data.getUint8(7) : 1;
  const divisor = Math.pow(10, powerByte);

  // Negative flag at bit 0 of byte 6
  const flags = data.byteLength > 6 ? data.getUint8(6) : 0;
  const negative = (flags & 0x02) !== 0;
  const stable = (flags & 0x01) !== 0;

  // Unit from high nibble of flags
  const unitFlag = (flags >> 4) & 0x0f;
  const unit: 'g' | 'oz' = unitFlag === UNIT_OUNCES ? 'oz' : 'g';

  const weight = (negative ? -1 : 1) * (rawWeight / divisor);

  return { weight, unit, stable };
}

function parseWeightDirect(data: DataView): AcaiaWeightReading | null {
  if (data.byteLength < 6) return null;

  const rawWeight = data.getUint8(3) | (data.getUint8(4) << 8);
  const flags = data.getUint8(5);
  const negative = (flags & 0x02) !== 0;
  const stable = (flags & 0x01) !== 0;

  const weight = (negative ? -1 : 1) * (rawWeight / 10);

  return { weight, unit: 'g', stable };
}
