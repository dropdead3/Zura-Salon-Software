import type React from 'react';
import { Gift, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FabPosition } from '@/hooks/usePromotionalPopup';

/**
 * Re-entry FAB rendered after the popup is dismissed (soft / declined).
 * Pure presentational — receives accent, position, headline, optional pulse
 * flag, and the two click handlers.
 *
 * Position is fixed at `bottom-6` full-time. The FAB intentionally does NOT
 * shift based on hero alignment — see `mem://style/global-overlay-stability`
 * and the FAB anchor regression test.
 */
export function PromoFab({
  headline,
  position,
  accent,
  accentFg,
  pulsing,
  onOpen,
  onDismiss,
}: {
  headline: string;
  position: FabPosition;
  accent: string;
  accentFg: string | undefined;
  pulsing: boolean;
  onOpen: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={cn(
        'fixed bottom-6 z-50 flex items-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300',
        position === 'bottom-left' ? 'left-6 flex-row-reverse' : 'right-6',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Reopen offer: ${headline}`}
        className={cn(
          'group flex items-center gap-2 rounded-full pl-3 pr-4 sm:pr-5 h-12 shadow-2xl text-primary-foreground hover:scale-[1.03] transition-transform',
          // Session-scoped one-time pulse hint (~3 cycles, then auto-stops).
          pulsing && 'motion-safe:animate-[promoFabPulse_800ms_ease-in-out_3]',
        )}
        style={{ backgroundColor: accent, color: accentFg }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
          <Gift className="h-4 w-4" />
        </span>
        <span className="hidden sm:inline font-display uppercase tracking-wider text-xs">
          See Offer
        </span>
        <ChevronRight className="hidden sm:inline h-4 w-4 opacity-80 group-hover:translate-x-0.5 transition-transform" />
      </button>
      <button
        type="button"
        aria-label="Dismiss offer reminder"
        onClick={onDismiss}
        className={cn(
          'hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/20 text-muted-foreground hover:text-foreground transition-colors',
          position === 'bottom-left' ? 'mr-2' : 'ml-2',
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
