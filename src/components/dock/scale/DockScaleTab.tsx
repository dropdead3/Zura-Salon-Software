/**
 * DockScaleTab — BLE scale connection management.
 * Uses shared useDockScale context for unified scale state across the Dock.
 */

import { Weight, WifiOff, Bluetooth, BluetoothSearching, BluetoothConnected, RefreshCw, Zap, Radio, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDockScale } from '@/hooks/dock/useDockScale';
import type { ConnectionState } from '@/lib/backroom/weight-event-schema';

const CONNECTION_STATE_UI: Record<ConnectionState, {
  label: string;
  description: string;
  icon: typeof Weight;
  color: string;
  bgColor: string;
  pulse?: boolean;
}> = {
  disconnected: {
    label: 'Disconnected',
    description: 'No scale connected',
    icon: WifiOff,
    color: 'text-[hsl(var(--platform-foreground-muted)/0.5)]',
    bgColor: 'bg-[hsl(var(--platform-bg-card))]',
  },
  scanning: {
    label: 'Scanning',
    description: 'Searching for nearby scales...',
    icon: BluetoothSearching,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    pulse: true,
  },
  pairing: {
    label: 'Pairing',
    description: 'Establishing secure connection...',
    icon: Bluetooth,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    pulse: true,
  },
  connected: {
    label: 'Connected',
    description: 'Scale ready for readings',
    icon: BluetoothConnected,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  unstable_reading: {
    label: 'Unstable',
    description: 'Waiting for weight to stabilize...',
    icon: Radio,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    pulse: true,
  },
  stable_reading: {
    label: 'Stable Reading',
    description: 'Weight locked and ready',
    icon: Zap,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  reconnecting: {
    label: 'Reconnecting',
    description: 'Connection lost, retrying...',
    icon: RefreshCw,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    pulse: true,
  },
  manual_override: {
    label: 'Manual Mode',
    description: 'Weights entered manually by staff',
    icon: Weight,
    color: 'text-[hsl(var(--platform-foreground))]',
    bgColor: 'bg-violet-500/10',
  },
};

const BLE_STEPS: ConnectionState[] = ['disconnected', 'scanning', 'pairing', 'connected'];

export function DockScaleTab() {
  const scale = useDockScale();
  const { mode, connectionState, liveWeight, unit, deviceName, bleError, isConnecting } = scale;

  const stateUI = CONNECTION_STATE_UI[connectionState];
  const StateIcon = stateUI.icon;
  const currentStepIdx = BLE_STEPS.indexOf(connectionState);
  const isLiveReading = connectionState === 'stable_reading' || connectionState === 'unstable_reading';

  return (
    <div className="flex flex-col h-full px-7 py-6">
      {/* Header */}
      <h2 className="font-display text-lg tracking-wide uppercase text-[hsl(var(--platform-foreground))] mb-6">
        Scale Connection
      </h2>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-[hsl(var(--platform-bg-card))] rounded-xl p-1 border border-[hsl(var(--platform-border)/0.2)] mb-6">
        <button
          onClick={() => scale.setMode('manual')}
          className={cn(
            'flex-1 h-10 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
            mode === 'manual' ? 'bg-violet-600/30 text-violet-300' : 'text-[hsl(var(--platform-foreground-muted))]'
          )}
        >
          <Weight className="w-3.5 h-3.5" />
          Manual
        </button>
        <button
          onClick={() => scale.setMode('ble')}
          className={cn(
            'flex-1 h-10 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
            mode === 'ble' ? 'bg-violet-600/30 text-violet-300' : 'text-[hsl(var(--platform-foreground-muted))]'
          )}
        >
          <Bluetooth className="w-3.5 h-3.5" />
          Bluetooth
        </button>
      </div>

      {/* Connection state hero */}
      <div className={cn(
        'rounded-2xl border p-6 text-center mb-6 transition-all duration-300',
        stateUI.bgColor,
        'border-[hsl(var(--platform-border)/0.2)]'
      )}>
        <div className={cn('relative inline-flex mb-4', stateUI.pulse && 'animate-pulse')}>
          <StateIcon className={cn('w-16 h-16', stateUI.color)} />
          {(connectionState === 'connected' || isLiveReading) && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[hsl(var(--platform-bg))]" />
          )}
        </div>
        <h3 className={cn('font-display text-base tracking-wide uppercase mb-1', stateUI.color)}>
          {stateUI.label}
        </h3>
        <p className="text-xs text-[hsl(var(--platform-foreground-muted)/0.6)]">
          {stateUI.description}
        </p>
        {deviceName && (connectionState === 'connected' || isLiveReading) && (
          <p className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.4)] mt-2">
            {deviceName}
          </p>
        )}
      </div>

      {/* BLE progress steps */}
      {mode === 'ble' && (
        <div className="flex items-center gap-1 mb-6">
          {BLE_STEPS.map((step, idx) => {
            const isActive = idx <= currentStepIdx && currentStepIdx >= 0;
            const isCurrent = step === connectionState;
            return (
              <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={cn(
                  'h-1.5 w-full rounded-full transition-all duration-500',
                  isActive ? 'bg-violet-500' : 'bg-[hsl(var(--platform-border)/0.2)]',
                  isCurrent && 'bg-violet-400'
                )} />
                <span className={cn(
                  'text-[9px] uppercase tracking-wide',
                  isActive ? 'text-violet-400' : 'text-[hsl(var(--platform-foreground-muted)/0.3)]'
                )}>
                  {step === 'disconnected' ? 'Off' : step === 'scanning' ? 'Scan' : step === 'pairing' ? 'Pair' : 'Live'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* BLE Error */}
      {bleError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-6 text-center">
          <p className="text-xs text-red-400">{bleError}</p>
        </div>
      )}

      {/* Live reading */}
      {liveWeight > 0 && (connectionState === 'connected' || isLiveReading) && (
        <div className="rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] p-4 mb-6 text-center">
          <p className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.5)] uppercase tracking-wide mb-1">
            {connectionState === 'unstable_reading' ? 'Stabilizing...' : 'Live Weight'}
          </p>
          <p className={cn(
            'font-display text-3xl tracking-tight text-[hsl(var(--platform-foreground))]',
            connectionState === 'unstable_reading' && 'opacity-60'
          )}>
            {liveWeight.toFixed(1)}
            <span className="text-sm text-[hsl(var(--platform-foreground-muted)/0.5)] ml-0.5">{unit}</span>
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-auto space-y-3">
        {mode === 'ble' && connectionState === 'disconnected' && (
          <button
            onClick={scale.connect}
            disabled={isConnecting}
            className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <BluetoothSearching className="w-4 h-4" />
            {isConnecting ? 'Connecting...' : 'Scan for Acaia Pearl'}
          </button>
        )}
        {mode === 'ble' && (connectionState === 'connected' || isLiveReading) && (
          <div className="flex gap-3">
            <button
              onClick={scale.tare}
              className="flex-1 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 font-medium text-sm transition-colors flex items-center justify-center gap-2 hover:bg-violet-600/30"
            >
              <RotateCcw className="w-4 h-4" />
              Tare
            </button>
            <button
              onClick={scale.disconnect}
              className="flex-1 h-12 rounded-xl border border-red-500/30 text-red-400 font-medium text-sm transition-colors flex items-center justify-center gap-2 hover:bg-red-500/10"
            >
              <WifiOff className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        )}
        {mode === 'ble' && (connectionState === 'scanning' || connectionState === 'pairing') && (
          <div className="flex items-center justify-center gap-2 py-3">
            <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[hsl(var(--platform-foreground-muted))]">
              {connectionState === 'scanning' ? 'Searching nearby devices...' : 'Establishing connection...'}
            </span>
          </div>
        )}
        {mode === 'ble' && connectionState === 'reconnecting' && (
          <div className="flex items-center justify-center gap-2 py-3">
            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
            <span className="text-xs text-amber-400">Connection lost — attempting to reconnect...</span>
          </div>
        )}
        {mode === 'manual' && (
          <div className="rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] p-4 text-center">
            <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
              Manual mode active — weights are entered via the numpad during dispensing.
            </p>
            <p className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.4)] mt-2">
              Switch to Bluetooth to connect an Acaia Pearl
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
