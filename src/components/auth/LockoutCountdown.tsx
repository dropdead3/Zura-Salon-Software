import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

interface LockoutCountdownProps {
  /** Epoch ms when the lockout ends */
  until: number;
  onExpire?: () => void;
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Inline countdown shown above the PIN pad while the device or org is rate-limited.
 *
 * Honors alert-fatigue doctrine: this is the *primary* signal — no toast competes.
 * Updates every second and self-clears when the window closes.
 */
export function LockoutCountdown({ until, onExpire }: LockoutCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (now >= until) onExpire?.();
  }, [now, until, onExpire]);

  const remainingMs = until - now;
  if (remainingMs <= 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left"
    >
      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <p className="text-sm text-white font-sans">Too many PIN attempts on this device</p>
        <p className="text-xs text-white/60 font-sans">
          Try again in <span className="font-medium text-white tabular-nums">{formatRemaining(remainingMs)}</span>
        </p>
      </div>
    </div>
  );
}
