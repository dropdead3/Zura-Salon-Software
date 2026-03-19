/**
 * DockScaleTab — BLE scale connection management.
 * Placeholder for Phase 7 implementation.
 */

import { useState } from 'react';
import { Weight, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DockScaleTab() {
  const [mode] = useState<'manual' | 'ble'>('manual');

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="relative mb-6">
        <Weight className="w-16 h-16 text-violet-400/60" />
        <div className={cn(
          'absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[hsl(var(--platform-bg))]',
          mode === 'ble' ? 'bg-emerald-500' : 'bg-amber-500'
        )} />
      </div>
      <h2 className="font-display text-lg tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
        Scale Connection
      </h2>
      <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)]">
        {mode === 'manual' ? (
          <>
            <WifiOff className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-amber-400">Manual Mode</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-emerald-400">Connected</span>
          </>
        )}
      </div>
      <p className="mt-4 text-xs text-[hsl(var(--platform-foreground-muted))]">
        BLE scale pairing will be available in a future update
      </p>
    </div>
  );
}
