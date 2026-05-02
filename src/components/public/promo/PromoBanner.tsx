import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEyebrowIcon } from '@/lib/eyebrow-icons';
import type { PromotionalPopupSettings } from '@/hooks/usePromotionalPopup';
import { PromoCountdownBar } from './PromoCountdownBar';

/**
 * Top banner / drawer variant. Pure presentational — every dynamic bit
 * (animation key, phase, accent, hover handlers, click handlers, countdown
 * data) arrives via props from the orchestrator.
 *
 * Desktop keeps the slim single-row banner. Mobile reshapes into a taller
 * top drawer where eyebrow / headline / body / CTAs stack vertically and
 * wrap fully — no truncation, no X colliding with the headline.
 */
export function PromoBanner({
  cfg,
  accent,
  accentFg,
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
  accentFg: string | undefined;
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
  const EyebrowIconCmp = cfg.eyebrow ? getEyebrowIcon(cfg.eyebrowIcon) : null;
  const exitClasses = 'animate-out fade-out slide-out-to-top-2 duration-300';
  return (
    <div
      key={animationNonce}
      data-testid="promo-popup-root"
      data-animation-key={animationNonce}
      data-popup-phase={popupPhase}
      role="dialog"
      aria-labelledby="promo-popup-title"
      className={cn(
        'fixed top-0 inset-x-0 z-50 bg-card border-b border-border shadow-md overflow-hidden',
        isClosing ? exitClasses : 'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-12',
      )}
      style={{
        borderBottomColor: accent,
        borderBottomWidth: 2,
        ...(!isClosing ? {
          animationDuration: '900ms',
          animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          animationFillMode: 'both',
        } : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onAnimationEnd={onAnimationEnd}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-3 pb-6 sm:pb-3">
        {/* Mobile-only close row keeps the X out of the headline's lane. */}
        <div className="flex sm:hidden justify-end -mt-1 -mr-1 mb-1">
          <button
            onClick={onSoftClose}
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-foreground/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            {cfg.eyebrow && (
              <p
                className="font-display uppercase tracking-[0.18em] text-[10px] sm:text-[11px] mb-1 sm:mb-0.5 inline-flex items-center gap-1.5"
                style={{ color: accent }}
              >
                {EyebrowIconCmp && (
                  <EyebrowIconCmp className="h-3 w-3 shrink-0" aria-hidden="true" />
                )}
                <span className="sm:truncate">{cfg.eyebrow}</span>
              </p>
            )}
            <p
              id="promo-popup-title"
              className="font-display uppercase tracking-wide text-base sm:text-base text-foreground leading-snug sm:truncate"
            >
              {cfg.headline}
            </p>
            {cfg.body && (
              <p className="font-sans text-sm sm:text-sm text-muted-foreground leading-relaxed mt-1 sm:mt-0 sm:truncate">
                {cfg.body}
              </p>
            )}
          </div>

          {/* CTA cluster: stretches to full width on mobile, inline on desktop. */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={onAccept}
              className="font-display uppercase tracking-wider text-xs px-4 py-2.5 sm:py-2 rounded-full text-primary-foreground flex-1 sm:flex-none"
              style={{ backgroundColor: accent, color: accentFg }}
            >
              {cfg.ctaAcceptLabel}
            </button>
            <button
              onClick={onDecline}
              className="font-sans text-xs text-muted-foreground hover:text-foreground px-3 py-2 shrink-0"
              aria-label={cfg.ctaDeclineLabel}
            >
              {cfg.ctaDeclineLabel}
            </button>
            {/* Desktop close — mobile uses the dedicated row above. */}
            <button
              onClick={onSoftClose}
              aria-label="Dismiss"
              className="hidden sm:inline-flex text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
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
