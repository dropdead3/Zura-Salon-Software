import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEyebrowIcon } from '@/lib/eyebrow-icons';
import { readableForegroundFor } from '@/lib/color-contrast';
import type { PromotionalPopupSettings } from '@/hooks/usePromotionalPopup';

/**
 * Pure body renderer shared across all three popup variants
 * (modal / banner / corner-card). Props in, JSX out — no hooks, no
 * lifecycle, no router, no DB. This is the parity contract: every
 * variant renders the exact same headline / body / CTA cluster, so
 * preview + live can never visually diverge by accident.
 *
 * See `mem://architecture/preview-live-parity-pattern`.
 */
export function PromoBody({
  cfg,
  accent,
  onAccept,
  onDecline,
  compact = false,
  imageMode = 'top',
  hideEyebrow = false,
}: {
  cfg: PromotionalPopupSettings;
  accent: string;
  onAccept: () => void;
  onDecline: () => void;
  /** Reserved for parity with prior signature; soft-close handled at the variant root. */
  onClose: () => void;
  compact?: boolean;
  /** How (or whether) to render the image inline. `side` is handled by the
   *  parent layout (modal grid) and renders nothing here. */
  imageMode?: 'top' | 'side' | 'none';
  /** Modal variant renders the eyebrow inside the editorial header band, so
   *  the body should suppress its own eyebrow row to avoid duplication. */
  hideEyebrow?: boolean;
}) {
  const renderTopImage = imageMode === 'top' && cfg.imageUrl;
  // Mirror the parent's contrast pick so the CTA stays legible regardless
  // of the operator's accent. Re-derive (cheap) instead of threading a prop.
  const accentFg = readableForegroundFor(cfg.accentColor);
  const valueAnchor = cfg.valueAnchor?.trim();
  return (
    <>
      {renderTopImage && (
        <div
          className={cn(
            'mb-4 overflow-hidden rounded-xl bg-muted',
            compact ? 'h-24' : 'h-32 sm:h-40',
          )}
        >
          <img
            src={cfg.imageUrl}
            alt={cfg.imageAlt ?? ''}
            className="w-full h-full object-cover"
            style={{ objectPosition: `${cfg.imageFocalX ?? 50}% ${cfg.imageFocalY ?? 50}%` }}
          />
        </div>
      )}
      {!hideEyebrow && cfg.eyebrow && (() => {
        const Icon = getEyebrowIcon(cfg.eyebrowIcon);
        return (
          <p
            className={cn(
              'font-display uppercase tracking-[0.2em] mb-2 inline-flex items-center gap-1.5',
              compact ? 'text-[10px]' : 'text-[11px] sm:text-xs',
            )}
            style={{ color: accent }}
          >
            {Icon && <Icon className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-hidden="true" />}
            <span>{cfg.eyebrow}</span>
          </p>
        );
      })()}
      <h2
        id="promo-popup-title"
        className={cn(
          'font-display uppercase tracking-wide text-foreground mb-3',
          compact ? 'text-base' : 'text-xl sm:text-2xl leading-[1.15]',
        )}
      >
        {cfg.headline}
      </h2>
      {valueAnchor && !compact && !hideEyebrow && (
        <div className="mb-4">
          <span
            className="inline-flex items-center font-display uppercase tracking-[0.18em] text-[10px] px-3 h-6 rounded-full"
            style={{ backgroundColor: accent, color: accentFg }}
          >
            {valueAnchor}
          </span>
        </div>
      )}
      {cfg.body && (
        <p
          className={cn(
            'font-sans text-muted-foreground mb-5',
            compact ? 'text-sm' : 'text-sm sm:text-base leading-relaxed',
          )}
        >
          {cfg.body}
        </p>
      )}
      {/*
        Compact (corner-card) stacks the CTAs vertically: full-width Claim
        Offer on top, centered "No thanks" beneath. Cleaner read at 360px
        wide than the side-by-side row, which crowded the decline link
        against the accent button. Full-size modal keeps the inline row.
      */}
      <div className={cn(
        'mb-3',
        compact
          ? 'flex flex-col items-stretch gap-2'
          : 'flex flex-row items-center gap-4',
      )}>
        {!compact && (
          <button
            onClick={onDecline}
            className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors px-1 py-2 underline-offset-4 hover:underline shrink-0 inline-flex items-center gap-1.5"
          >
            {valueAnchor && (
              <>
                <span className="font-display tracking-wide text-foreground/80">{valueAnchor}</span>
                <span aria-hidden="true" className="text-muted-foreground/60">•</span>
              </>
            )}
            <span>{cfg.ctaDeclineLabel}</span>
          </button>
        )}
        <button
          onClick={onAccept}
          className={cn(
            'group inline-flex items-center justify-center gap-2 font-display uppercase tracking-wider px-6 rounded-full transition-all hover:opacity-95 hover:-translate-y-px',
            compact ? 'w-full text-xs h-11' : 'flex-1 text-xs sm:text-sm h-12',
          )}
          style={{
            backgroundColor: accent,
            color: accentFg,
            boxShadow: `0 10px 28px -10px ${accent}, 0 2px 6px -2px rgba(0,0,0,0.12)`,
          }}
        >
          <span>{cfg.ctaAcceptLabel}</span>
          <ChevronRight className="h-4 w-4 opacity-90 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
        {compact && (
          <button
            onClick={onDecline}
            className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 mx-auto underline-offset-4 hover:underline inline-flex items-center justify-center gap-1.5"
          >
            {valueAnchor && (
              <>
                <span className="font-display tracking-wide text-foreground/80">{valueAnchor}</span>
                <span aria-hidden="true" className="text-muted-foreground/60">•</span>
              </>
            )}
            <span>{cfg.ctaDeclineLabel}</span>
          </button>
        )}
      </div>
      {cfg.acceptDestination === 'custom-url' && cfg.customUrlInstructions && (
        <p
          className="font-sans text-xs text-foreground/80 leading-relaxed mb-2 px-3 py-2 rounded-lg border border-border/60 bg-muted/40"
          style={{ borderLeft: `3px solid ${accent}` }}
        >
          {cfg.customUrlInstructions}
        </p>
      )}
      {cfg.disclaimer && (
        <p className="font-sans text-[11px] text-muted-foreground/80 leading-relaxed pt-4 mt-4 border-t border-border/40">
          {cfg.disclaimer}
        </p>
      )}
    </>
  );
}
