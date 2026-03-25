/**
 * useDockScale — Shared scale context for the entire Dock tree.
 * Provides live weight readings, connection state, and tare functionality.
 * In demo mode without BLE, simulates weight ramping for visual demos.
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ScaleAdapter } from '@/lib/backroom/scale-adapter';
import { createScaleAdapter, BLEScaleAdapter } from '@/lib/backroom/scale-adapter';
import type { ConnectionState, WeightEvent } from '@/lib/backroom/weight-event-schema';

export interface DockScaleContextValue {
  adapter: ScaleAdapter;
  liveWeight: number;
  unit: string;
  isConnected: boolean;
  isStable: boolean;
  connectionState: ConnectionState;
  deviceName: string | null;
  mode: 'manual' | 'ble';
  setMode: (m: 'manual' | 'ble') => void;
  tare: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  bleError: string | null;
  isConnecting: boolean;
  // Demo simulation controls
  startDemoSimulation: (targetWeight: number) => void;
  stopDemoSimulation: () => void;
  isDemoSimulating: boolean;
}

export const DockScaleContext = createContext<DockScaleContextValue | null>(null);

export function useDockScale(): DockScaleContextValue {
  const ctx = useContext(DockScaleContext);
  if (!ctx) {
    throw new Error('useDockScale must be used within a DockScaleProvider');
  }
  return ctx;
}

/**
 * Internal hook that manages scale adapter state. Used by DockScaleProvider.
 */
export function useDockScaleState(isDemoMode: boolean) {
  const [mode, setModeState] = useState<'manual' | 'ble'>(isDemoMode ? 'ble' : 'manual');
  const [connectionState, setConnectionState] = useState<ConnectionState>(isDemoMode ? 'connected' : 'manual_override');
  const [liveWeight, setLiveWeight] = useState(0);
  const [unit, setUnit] = useState('g');
  const [isStable, setIsStable] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(isDemoMode ? 'Acaia Pearl (Demo)' : null);
  const [bleError, setBleError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDemoSimulating, setIsDemoSimulating] = useState(false);
  const adapterRef = useRef<ScaleAdapter>(createScaleAdapter('manual'));
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoWeightRef = useRef(0);

  const isConnected = connectionState === 'connected' || connectionState === 'stable_reading' || connectionState === 'unstable_reading';

  // Attach reading listener
  useEffect(() => {
    const handler = (event: WeightEvent) => {
      setConnectionState(event.connection_state);
      if (event.confidence_score > 0) {
        setLiveWeight(event.raw_weight);
        setUnit(event.unit);
        setIsStable(event.stable_flag);
      }
    };
    adapterRef.current.onReading(handler);
    return () => {
      adapterRef.current.offReading(handler);
    };
  }, [mode]); // re-attach when mode changes (adapter swaps)

  const setMode = useCallback((newMode: 'manual' | 'ble') => {
    adapterRef.current.disconnect();
    setLiveWeight(0);
    setDeviceName(null);
    setBleError(null);

    if (newMode === 'ble') {
      adapterRef.current = createScaleAdapter('ble');
      setConnectionState('disconnected');
    } else {
      adapterRef.current = createScaleAdapter('manual');
      setConnectionState('manual_override');
    }
    setModeState(newMode);

    // Re-attach listener
    const handler = (event: WeightEvent) => {
      setConnectionState(event.connection_state);
      if (event.confidence_score > 0) {
        setLiveWeight(event.raw_weight);
        setUnit(event.unit);
        setIsStable(event.stable_flag);
      }
    };
    adapterRef.current.onReading(handler);
  }, []);

  const connect = useCallback(async () => {
    if (mode !== 'ble' || isConnecting) return;
    setIsConnecting(true);
    setBleError(null);
    try {
      await adapterRef.current.connect();
      const adapter = adapterRef.current as BLEScaleAdapter;
      setDeviceName(adapter.getDeviceName());
    } catch (err: any) {
      if (err?.message === 'BLE_NOT_AVAILABLE') {
        setBleError('Bluetooth requires the native Zura Dock app. BLE is not available in the browser.');
      } else {
        setBleError("Could not connect to scale. Make sure it's powered on and nearby.");
      }
      setConnectionState('disconnected');
    } finally {
      setIsConnecting(false);
    }
  }, [mode, isConnecting]);

  const disconnect = useCallback(async () => {
    await adapterRef.current.disconnect();
    setConnectionState('disconnected');
    setLiveWeight(0);
    setDeviceName(null);
  }, []);

  const tare = useCallback(async () => {
    if (isDemoMode) {
      setLiveWeight(0);
      demoWeightRef.current = 0;
      return;
    }
    await adapterRef.current.tare();
  }, [isDemoMode]);

  // Demo simulation: ramp weight from 0 to target over ~5s
  const startDemoSimulation = useCallback((targetWeight: number) => {
    if (!isDemoMode) return;
    stopDemoSimulation();
    demoWeightRef.current = 0;
    setLiveWeight(0);
    setIsDemoSimulating(true);
    setConnectionState('unstable_reading');

    const stepMs = 100;
    const totalSteps = 50; // 5 seconds
    const increment = targetWeight / totalSteps;

    demoIntervalRef.current = setInterval(() => {
      demoWeightRef.current += increment + (Math.random() - 0.3) * (increment * 0.3);
      const clamped = Math.min(demoWeightRef.current, targetWeight * 1.02);
      const rounded = parseFloat(clamped.toFixed(1));
      setLiveWeight(rounded);

      if (demoWeightRef.current >= targetWeight * 0.98) {
        setIsStable(true);
        setConnectionState('stable_reading');
        if (demoWeightRef.current >= targetWeight) {
          if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
          demoIntervalRef.current = null;
          setIsDemoSimulating(false);
        }
      }
    }, stepMs);
  }, [isDemoMode]);

  const stopDemoSimulation = useCallback(() => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
    setIsDemoSimulating(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDemoSimulation();
      adapterRef.current.disconnect();
    };
  }, [stopDemoSimulation]);

  return {
    adapter: adapterRef.current,
    liveWeight,
    unit,
    isConnected: isDemoMode ? true : isConnected,
    isStable,
    connectionState: isDemoMode ? (isDemoSimulating ? 'unstable_reading' : 'connected') : connectionState,
    deviceName,
    mode: isDemoMode ? 'ble' : mode,
    setMode,
    tare,
    connect,
    disconnect,
    bleError,
    isConnecting,
    startDemoSimulation,
    stopDemoSimulation,
    isDemoSimulating,
  };
}
