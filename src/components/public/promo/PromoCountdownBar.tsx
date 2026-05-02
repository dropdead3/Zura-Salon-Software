import { cn } from '@/lib/utils';

/**
 * Thin progress hairline + numeric label that depletes over the auto-minimize
 * window. Telegraphs the collapse-to-FAB behavior so the offer never appears
 * to "vanish" without warning.
 *
 * - `paused` freezes the fill animation and softens the label so visitors
 *   reading the offer (cursor over popup) can tell the timer is on hold.
 * - Under 3s remaining, the bar pulses subtly + the label switches to the
 *   warning token so the imminent collapse is felt, not just seen.
 * - The numeric label sits inside the bar's right edge so it follows the
 *   card's rounded corners cleanly instead of floating above them.
 *
 * Pure component — no hooks, no state. Owned by every variant root.
 */
export function PromoCountdownBar({
  secondsLeft,
  totalSeconds,
  accent,
  paused = false,
}: {
  secondsLeft: number;
  totalSeconds: number;
  accent: string;
  paused?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));
  const urgent = !paused && secondsLeft <= 3 && secondsLeft > 0;
  return (
    <div
      className="absolute bottom-0 inset-x-0 pointer-events-none"
      aria-hidden="true"
    >
      <div className="relative h-5 w-full overflow-hidden rounded-bl-2xl rounded-br-2xl">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-foreground/5">
          <div
            className={cn(
              'h-full transition-[width] ease-linear',
              paused ? 'duration-200 opacity-50' : 'duration-1000',
              urgent && 'motion-safe:animate-pulse',
            )}
            style={{ width: `${pct}%`, backgroundColor: accent }}
          />
        </div>
        <span
          className={cn(
            'absolute right-3 bottom-1.5 font-display uppercase tracking-wider text-[9px] tabular-nums transition-colors',
            paused
              ? 'text-muted-foreground/40'
              : urgent
                ? 'text-warning motion-safe:animate-pulse'
                : 'text-muted-foreground/70',
          )}
        >
          {paused ? 'paused' : `${secondsLeft}s`}
        </span>
      </div>
    </div>
  );
}
