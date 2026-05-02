import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type PromotionalPopupSettings, type FabPosition, resolveImageRender } from '@/hooks/usePromotionalPopup';
import { PromoBody } from './PromoBody';
import { PromoCountdownBar } from './PromoCountdownBar';

/**
 * Bottom-corner card variant — densest surface. Operators can hide the image
 * here via `hidden-on-corner` so it doesn't crush headline + body. `side`
 * collapses to `top` (no room for a left rail at 360px).
 *
 * Pure presentational. Mirrors the FAB's corner via `fabPosition` so the
 * card and the FAB share the same anchor.
 */
export function PromoCornerCard({
  cfg,
  accent,
  fabPosition,
  animationNonce,
  popupPhase,
  isClosing,
  isHovered,
  setIsHovered,
  onAccept,
  onDecline,
  onSoftClose,
  onAnimationEnd,
  countdown,
}: {
  cfg: PromotionalPopupSettings;
  accent: string;
  fabPosition: FabPosition;
  animationNonce: number;
  popupPhase: string;
  isClosing: boolean;
  isHovered: boolean;
  setIsHovered: (v: boolean) => void;
  onAccept: () => void;
  onDecline: () => void;
  onSoftClose: () => void;
  onAnimationEnd: (e: React.AnimationEvent<HTMLElement>) => void;
  countdown: { secondsLeft: number; totalSeconds: number } | null;
}) {
  const exitClasses = fabPosition === 'bottom-left'
    ? 'animate-out fade-out slide-out-to-bottom-4 slide-out-to-left-4 duration-300'
    : 'animate-out fade-out slide-out-to-bottom-4 slide-out-to-right-4 duration-300';
  const imageMode: 'top' | 'none' =
    !cfg.imageUrl || cfg.imageTreatment === 'hidden-on-corner' ? 'none' : 'top';
  return (
    <div
      key={animationNonce}
      data-testid="promo-popup-root"
      data-animation-key={animationNonce}
      data-popup-phase={popupPhase}
      role="dialog"
      aria-modal="false"
      aria-labelledby="promo-popup-title"
      className={cn(
        'fixed bottom-6 right-6 z-50 w-[min(92vw,360px)] rounded-2xl bg-card border border-border shadow-2xl p-5 overflow-hidden',
        isClosing ? exitClasses : 'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-16',
      )}
      style={!isClosing ? {
        animationDuration: '900ms',
        animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        animationFillMode: 'both',
      } : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onAnimationEnd={onAnimationEnd}
    >
      {/* Close (X) — soft-dismisses the popup. Sits absolute so it doesn't
          shift PromoBody's eyebrow/headline alignment. */}
      <button
        type="button"
        onClick={onSoftClose}
        aria-label="Close promotional offer"
        className="absolute top-3 right-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <PromoBody
        cfg={cfg}
        accent={accent}
        imageMode={imageMode}
        onAccept={onAccept}
        onDecline={onDecline}
        onClose={onSoftClose}
        compact
      />
      {countdown && (
        <PromoCountdownBar
          secondsLeft={countdown.secondsLeft}
          totalSeconds={countdown.totalSeconds}
          accent={accent}
          paused={isHovered}
        />
      )}
    </div>
  );
}
