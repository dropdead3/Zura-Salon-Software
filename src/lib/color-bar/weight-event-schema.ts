/**
 * Zura Backroom — Normalized Weight Event Schema
 * 
 * Common schema for weight readings regardless of source (manual, BLE scale, etc.)
 */

export type ConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'pairing'
  | 'connected'
  | 'unstable_reading'
  | 'stable_reading'
  | 'reconnecting'
  | 'manual_override';

export type CaptureMethod = 'scale' | 'manual';

export interface WeightEvent {
  timestamp: string;
  device_id: string | null;
  station_id: string | null;
  appointment_id: string | null;
  bowl_id: string | null;
  user_id: string | null;
  raw_weight: number;
  normalized_weight: number;
  unit: string;
  stable_flag: boolean;
  confidence_score: number; // 0-1, 1.0 for manual entry
  connection_state: ConnectionState;
}

/**
 * Create a manual weight event (confidence = 1.0, stable = true).
 */
export function createManualWeightEvent(
  weight: number,
  unit: string = 'g',
  context: {
    station_id?: string | null;
    appointment_id?: string | null;
    bowl_id?: string | null;
    user_id?: string | null;
  } = {}
): WeightEvent {
  return {
    timestamp: new Date().toISOString(),
    device_id: null,
    station_id: context.station_id ?? null,
    appointment_id: context.appointment_id ?? null,
    bowl_id: context.bowl_id ?? null,
    user_id: context.user_id ?? null,
    raw_weight: weight,
    normalized_weight: weight,
    unit,
    stable_flag: true,
    confidence_score: 1.0,
    connection_state: 'manual_override',
  };
}
