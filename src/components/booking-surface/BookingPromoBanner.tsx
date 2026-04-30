import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { usePromotionalPopup } from '@/hooks/usePromotionalPopup';
import { readableForegroundFor } from '@/lib/color-contrast';

interface Props {
  /** The org whose popup config we resolve the promo code against. */
  organizationId: string | undefined;
}

/**
 * Slim accent-colored banner shown at the top of the public booking flow when
 * a visitor arrives with `?promo=CODE`. Closes the loop the promotional popup
 * opens — without this, the visitor clicks "Claim Offer" and lands on a
 * booking page with no acknowledgement that the code was actually applied.
 *
 * Variants:
 *  - Standard: visitor will redeem at checkout.
 *  - Consultation: visitor is here for a consult first; offer honored at the
 *    next visit. Driven by `?consultation=true` arriving alongside `?promo=`.
 *
 * Returns `null` if no `?promo=` param is set, the org has no popup config,
 * the popup is disabled, or the code doesn't match the configured offer.
 * Silence is valid output (Visibility Contract): an unrecognized promo code
 * shouldn't fabricate a confirmation.
 */
export function BookingPromoBanner({ organizationId }: Props) {
  const [searchParams] = useSearchParams();
  const { data: cfg } = usePromotionalPopup(organizationId);

  const promoCode = searchParams.get('promo')?.trim() ?? '';
  const isConsultation = searchParams.get('consultation') === 'true';

  const matched = useMemo(() => {
    if (!promoCode || !cfg || !cfg.enabled) return false;
    const configured = (cfg.offerCode ?? '').trim();
    return configured.length > 0 && configured === promoCode;
  }, [cfg, promoCode]);

  if (!matched || !cfg) return null;

  const accent = cfg.accentColor || 'hsl(var(--primary))';
  const accentFg = readableForegroundFor(cfg.accentColor);

  const message = isConsultation
    ? `Schedule a consultation and we'll honor code ${promoCode} at your next visit.`
    : `Code ${promoCode} will be honored at checkout.`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border bg-card overflow-hidden"
      style={{ borderLeftColor: accent, borderLeftWidth: 4 }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: accent, color: accentFg }}
          aria-hidden="true"
        >
          <Gift className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display uppercase tracking-wider text-[11px] text-foreground">
            Offer applied
          </p>
          <p className="font-sans text-sm text-foreground/90 leading-snug">
            <span className="font-medium">{cfg.headline}</span>
            <span className="text-muted-foreground"> — {message}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
