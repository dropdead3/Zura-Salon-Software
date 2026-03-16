/**
 * ScaleConnectionStatus — Shows current scale connection state.
 * Phase 1: Always shows "Manual Mode".
 */

import { Badge } from '@/components/ui/badge';
import { Weight, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionState } from '@/lib/backroom/weight-event-schema';

interface ScaleConnectionStatusProps {
  state: ConnectionState;
  className?: string;
}

const STATE_CONFIG: Record<ConnectionState, { label: string; icon: typeof Scale; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  disconnected: { label: 'Disconnected', icon: WifiOff, variant: 'destructive' },
  scanning: { label: 'Scanning...', icon: Wifi, variant: 'secondary' },
  pairing: { label: 'Pairing...', icon: Wifi, variant: 'secondary' },
  connected: { label: 'Connected', icon: Wifi, variant: 'default' },
  unstable_reading: { label: 'Unstable', icon: Scale, variant: 'secondary' },
  stable_reading: { label: 'Stable', icon: Scale, variant: 'default' },
  reconnecting: { label: 'Reconnecting...', icon: Wifi, variant: 'secondary' },
  manual_override: { label: 'Manual Mode', icon: Scale, variant: 'outline' },
};

export function ScaleConnectionStatus({ state, className }: ScaleConnectionStatusProps) {
  const config = STATE_CONFIG[state];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1 text-[10px] ${className ?? ''}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
