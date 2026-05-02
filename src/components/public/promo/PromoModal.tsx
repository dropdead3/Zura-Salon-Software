import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEyebrowIcon } from '@/lib/eyebrow-icons';
import type { PromotionalPopupSettings } from '@/hooks/usePromotionalPopup';
import { PromoBody } from './PromoBody';
import { PromoCountdownBar } from './PromoCountdownBar';

/**
 * Modal variant — the default. Three image modes:
 *   - none: no image to render
 *   - top:  full-width strip above the headline (default `cover` behavior)
 *   - side: left rail (modal widens to max-w-2xl + grid layout)
 *
 * Pure presentational: the editorial header band, glass surface, and CTA
 * cluster all derive from the props passed in by the orchestrator. The
 * backdrop click + Esc handlers live at the orchestrator level.
 */
export function PromoModal({
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
  const imageMode: 'top' | 'side' | 'none' = !cfg.imageUrl
    ? 'none'
    : cfg.imageTreatment === 'side'
      ? 'side'
      : 'top';
  const wide = imageMode === 'side';
  const exitClasses = 'animate-out fade-out-0 zoom-out-95 duration-300';

  // Editorial header band: subtle accent wash behind the eyebrow + close.
  const headerValueAnchor = cfg.valueAnchor?.trim();
  const HeaderBand = (
    <div
      className="relative flex items-center justify-between gap-3 px-6 sm:px-8 py-4 border-b"
      style={{
        backgroundColor: `color-mix(in srgb, ${accent} 6%, transparent)`,
        borderBottomColor: `color-mix(in srgb, ${accent} 20%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {cfg.eyebrow && (() => {
          const Icon = getEyebrowIcon(cfg.eyebrowIcon);
          return (
            <>
              {Icon && (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                  style={{ backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              )}
              <p
                className="font-display uppercase tracking-[0.2em] text-[11px] truncate"
                style={{ color: accent }}
              >
                {cfg.eyebrow}
              </p>
            </>
          );
        })()}
        {headerValueAnchor && (
          <span
            className="hidden sm:inline-flex items-center font-display uppercase tracking-[0.16em] text-[10px] px-2.5 h-5 rounded-full shrink-0"
            style={{ backgroundColor: accent, color: accentFg }}
          >
            {headerValueAnchor}
          </span>
        )}
      </div>
      <button
        onClick={onSoftClose}
        aria-label="Close"
        className="shrink-0 text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-foreground/5 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div
      key={animationNonce}
      data-testid="promo-popup-root"
      data-animation-key={animationNonce}
      data-popup-phase={popupPhase}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/30 dark:bg-foreground/50 backdrop-blur-sm dark:backdrop-blur-md',
        isClosing
          ? exitClasses
          : 'motion-safe:animate-backdrop-blur-in-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500',
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSoftClose();
      }}
      onAnimationEnd={onAnimationEnd}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-popup-title"
        className={cn(
          'relative w-full rounded-2xl border border-border/60 overflow-hidden',
          'bg-gradient-to-b from-card/80 to-card/70 dark:from-card/55 dark:to-card/45',
          'backdrop-blur-xl backdrop-saturate-150 dark:backdrop-blur-2xl dark:backdrop-saturate-[1.8]',
          'motion-safe:animate-backdrop-blur-in-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:ease-out',
          'shadow-[0_24px_48px_-12px_rgba(0,0,0,0.22),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_1px_0_0_hsl(var(--background)/0.4)]',
          // Top-edge refraction highlight — mimics light bending across glass
          'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-foreground/25 dark:before:via-foreground/40 before:to-transparent before:z-10',
          'after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-24 after:bg-gradient-to-b after:from-foreground/[0.06] dark:after:from-foreground/[0.10] after:to-transparent after:z-0',
          wide ? 'max-w-2xl' : 'max-w-md',
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {wide ? (
          <div className="grid grid-cols-[200px_1fr]">
            <div className="bg-muted">
              <img
                src={cfg.imageUrl}
                alt={cfg.imageAlt ?? ''}
                className="w-full h-full object-cover"
                style={{ objectPosition: `${cfg.imageFocalX ?? 50}% ${cfg.imageFocalY ?? 50}%` }}
              />
            </div>
            <div className="flex flex-col">
              {HeaderBand}
              <div className="p-6 sm:p-8">
                <PromoBody
                  cfg={cfg}
                  accent={accent}
                  imageMode="none"
                  onAccept={onAccept}
                  onDecline={onDecline}
                  onClose={onSoftClose}
                  hideEyebrow
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {HeaderBand}
            <div className="p-6 sm:p-8">
              <PromoBody
                cfg={cfg}
                accent={accent}
                imageMode={imageMode}
                onAccept={onAccept}
                onDecline={onDecline}
                onClose={onSoftClose}
                hideEyebrow
              />
            </div>
          </>
        )}
        {countdown && (
          <PromoCountdownBar
            secondsLeft={countdown.secondsLeft}
            totalSeconds={countdown.totalSeconds}
            accent={accent}
            paused={isHovered}
          />
        )}
      </div>
    </div>
  );
}
