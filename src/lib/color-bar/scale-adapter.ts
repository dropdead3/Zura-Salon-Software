/**
 * Zura Color Bar — Scale Adapter Abstraction
 *
 * ManualScaleAdapter: user types weight directly.
 * BLEScaleAdapter: connects to Acaia Pearl via Capacitor BLE plugin.
 */

import type { WeightEvent, ConnectionState } from './weight-event-schema';
import { createManualWeightEvent } from './weight-event-schema';
import {
  ACAIA_SERVICE_UUID,
  ACAIA_CHAR_UUID,
  ACAIA_NAME_PREFIXES,
  encodeIdent,
  encodeTare,
  encodeStartWeightNotifications,
  decodeNotification,
} from './acaia-protocol';

export interface ScaleAdapter {
  readonly type: 'manual' | 'ble';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  tare(): Promise<void>;
  onReading(callback: (event: WeightEvent) => void): void;
  offReading(callback: (event: WeightEvent) => void): void;
  getConnectionState(): ConnectionState;
}

/**
 * Manual fallback adapter — user types weight directly.
 * Always in "manual_override" state. Emits events on submitReading().
 */
export class ManualScaleAdapter implements ScaleAdapter {
  readonly type = 'manual' as const;
  private listeners: Set<(event: WeightEvent) => void> = new Set();

  async connect(): Promise<void> {
    // No-op for manual entry
  }

  async disconnect(): Promise<void> {
    this.listeners.clear();
  }

  async tare(): Promise<void> {
    // No-op for manual entry
  }

  onReading(callback: (event: WeightEvent) => void): void {
    this.listeners.add(callback);
  }

  offReading(callback: (event: WeightEvent) => void): void {
    this.listeners.delete(callback);
  }

  getConnectionState(): ConnectionState {
    return 'manual_override';
  }

  /**
   * Submit a manually entered weight reading.
   */
  submitReading(
    weight: number,
    unit: string = 'g',
    context: {
      station_id?: string | null;
      appointment_id?: string | null;
      bowl_id?: string | null;
      user_id?: string | null;
    } = {}
  ): void {
    const event = createManualWeightEvent(weight, unit, context);
    this.listeners.forEach((cb) => cb(event));
  }
}

/**
 * BLE Scale Adapter — connects to Acaia Pearl via @capacitor-community/bluetooth-le.
 * Falls back gracefully in browser environments where Capacitor is unavailable.
 */
export class BLEScaleAdapter implements ScaleAdapter {
  readonly type = 'ble' as const;
  private listeners: Set<(event: WeightEvent) => void> = new Set();
  private state: ConnectionState = 'disconnected';
  private deviceId: string | null = null;
  private deviceName: string | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private BleClient: any = null; // Dynamically imported

  private async loadBleClient() {
    if (this.BleClient) return this.BleClient;
    try {
      const mod = await import('@capacitor-community/bluetooth-le');
      this.BleClient = mod.BleClient;
      return this.BleClient;
    } catch {
      throw new Error('BLE_NOT_AVAILABLE');
    }
  }

  async connect(): Promise<void> {
    const BleClient = await this.loadBleClient();

    this.state = 'scanning';
    this.notifyStateChange();

    try {
      await BleClient.initialize({ androidNeverForLocation: true });

      // Request device with Acaia name prefix filter
      const device = await BleClient.requestDevice({
        namePrefix: ACAIA_NAME_PREFIXES[0], // 'ACAIA'
        optionalServices: [ACAIA_SERVICE_UUID],
      });

      this.deviceId = device.deviceId;
      this.deviceName = device.name ?? 'Acaia Pearl';

      this.state = 'pairing';
      this.notifyStateChange();

      // Connect to the device
      await BleClient.connect(this.deviceId, () => this.onDisconnect());

      // Subscribe to weight notifications
      await BleClient.startNotifications(
        this.deviceId,
        ACAIA_SERVICE_UUID,
        ACAIA_CHAR_UUID,
        (value: DataView) => this.onNotification(value)
      );

      // Tell the scale to start streaming weight events
      await BleClient.write(
        this.deviceId,
        ACAIA_SERVICE_UUID,
        ACAIA_CHAR_UUID,
        encodeStartWeightNotifications()
      );

      // Start heartbeat to keep connection alive
      this.heartbeatInterval = setInterval(async () => {
        try {
          if (this.deviceId) {
            await BleClient.write(
              this.deviceId,
              ACAIA_SERVICE_UUID,
              ACAIA_CHAR_UUID,
              encodeIdent()
            );
          }
        } catch {
          // Heartbeat failure — connection may be lost
        }
      }, 3000);

      this.state = 'connected';
      this.notifyStateChange();
    } catch (err: any) {
      if (err?.message === 'BLE_NOT_AVAILABLE') throw err;
      this.state = 'disconnected';
      this.notifyStateChange();
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    try {
      if (this.BleClient && this.deviceId) {
        await this.BleClient.stopNotifications(
          this.deviceId,
          ACAIA_SERVICE_UUID,
          ACAIA_CHAR_UUID
        ).catch(() => {});
        await this.BleClient.disconnect(this.deviceId).catch(() => {});
      }
    } catch {
      // Ignore cleanup errors
    }

    this.deviceId = null;
    this.state = 'disconnected';
    this.listeners.clear();
  }

  async tare(): Promise<void> {
    if (!this.BleClient || !this.deviceId) return;
    await this.BleClient.write(
      this.deviceId,
      ACAIA_SERVICE_UUID,
      ACAIA_CHAR_UUID,
      encodeTare()
    );
  }

  onReading(callback: (event: WeightEvent) => void): void {
    this.listeners.add(callback);
  }

  offReading(callback: (event: WeightEvent) => void): void {
    this.listeners.delete(callback);
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  getDeviceName(): string | null {
    return this.deviceName;
  }

  /** Internal: handle notification from scale */
  private onNotification(data: DataView): void {
    const reading = decodeNotification(data);
    if (!reading) return;

    this.state = reading.stable ? 'stable_reading' : 'unstable_reading';

    const event: WeightEvent = {
      timestamp: new Date().toISOString(),
      device_id: this.deviceId,
      station_id: null,
      appointment_id: null,
      bowl_id: null,
      user_id: null,
      raw_weight: reading.weight,
      normalized_weight: reading.weight,
      unit: reading.unit,
      stable_flag: reading.stable,
      confidence_score: reading.stable ? 0.95 : 0.6,
      connection_state: this.state,
    };

    this.listeners.forEach((cb) => cb(event));
  }

  /** Internal: handle unexpected disconnect */
  private onDisconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.state = 'reconnecting';
    this.notifyStateChange();
  }

  /** Emit a zero-weight event to signal state change to listeners */
  private notifyStateChange(): void {
    // Emit a synthetic event so UI can react to state changes
    const event: WeightEvent = {
      timestamp: new Date().toISOString(),
      device_id: this.deviceId,
      station_id: null,
      appointment_id: null,
      bowl_id: null,
      user_id: null,
      raw_weight: 0,
      normalized_weight: 0,
      unit: 'g',
      stable_flag: false,
      confidence_score: 0,
      connection_state: this.state,
    };
    this.listeners.forEach((cb) => cb(event));
  }
}

/**
 * Factory to create the appropriate scale adapter.
 */
export function createScaleAdapter(type: 'manual' | 'ble' = 'manual'): ScaleAdapter {
  if (type === 'ble') return new BLEScaleAdapter();
  return new ManualScaleAdapter();
}
