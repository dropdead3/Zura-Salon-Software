/**
 * Zura Backroom — Scale Adapter Abstraction
 * 
 * Phase 1: ManualScaleAdapter only.
 * Interface designed for future BLE scale integration via Capacitor.
 */

import type { WeightEvent, ConnectionState } from './weight-event-schema';
import { createManualWeightEvent } from './weight-event-schema';

export interface ScaleAdapter {
  readonly type: 'manual' | 'ble';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
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
 * Factory to create the appropriate scale adapter.
 * Phase 1: Always returns ManualScaleAdapter.
 */
export function createScaleAdapter(_type: 'manual' | 'ble' = 'manual'): ScaleAdapter {
  // Future: if (type === 'ble') return new BLEScaleAdapter();
  return new ManualScaleAdapter();
}
