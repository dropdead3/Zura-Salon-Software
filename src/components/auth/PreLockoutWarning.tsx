import { ShieldAlert } from 'lucide-react';

interface PreLockoutWarningProps {
  /** Server-reported attempts left before the device locks. Null = silent. */
  attemptsRemaining: number | null;
  /** Visual variant — `dark` for the branded login surface, `platform` for Dock. */
  variant?: 'dark' | 'platform';
}

/**
 * Late-stage pre-lockout warning.
 *
 * Doctrine: alert-fatigue rules forbid cascading warnings, but a single
 * high-confidence signal at the threshold prevents a support call. This
 * surfaces ONLY when `attemptsRemaining <= 2` and is silent otherwise.
 *
 * Visual language matches `LockoutCountdown` (amber + ShieldAlert) so the
 * user perceives a continuum: warning → countdown → unlock.
 */
export function PreLockoutWarning({ attemptsRemaining, variant = 'dark' }: PreLockoutWarningProps) {
  if (attemptsRemaining === null || attemptsRemaining > 2 || attemptsRemaining < 0) {
    return null;
  }

  const label =
    attemptsRemaining === 0
      ? 'This was the last attempt — one more will lock the device for 5 minutes'
      : attemptsRemaining === 1
        ? '1 attempt left before this device is locked for 5 minutes'
        : `${attemptsRemaining} attempts left before this device is locked for 5 minutes`;

  // Dark variant matches OrgBrandedLogin (slate-950 page); platform variant
  // matches the Dock's platform tokens.
  const containerClass =
    variant === 'platform'
      ? 'flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left'
      : 'flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left';

  return (
    <div role="status" aria-live="polite" className={containerClass}>
      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <p className="text-xs text-white/80 font-sans">{label}</p>
    </div>
  );
}
