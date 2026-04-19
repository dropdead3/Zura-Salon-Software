import { Globe, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingSurfacePreviewProps {
  internalName: string;
  internalPrice: number | null;
  internalDuration: number;
  onlineName?: string | null;
  onlineDurationOverride?: number | null;
  onlineDiscountPct?: number | null;
  includeFromPrefix?: boolean;
  bookableOnline?: boolean;
}

/**
 * Live preview of how a service renders on the public booking surface
 * (`/book/:orgSlug`). Honors all online overrides so operators can see
 * the customer-facing result before saving.
 */
export function BookingSurfacePreview({
  internalName,
  internalPrice,
  internalDuration,
  onlineName,
  onlineDurationOverride,
  onlineDiscountPct,
  includeFromPrefix,
  bookableOnline,
}: BookingSurfacePreviewProps) {
  const displayName = onlineName?.trim() || internalName || 'Service name';
  const displayDuration = onlineDurationOverride ?? internalDuration;

  const hasDiscount = onlineDiscountPct != null && onlineDiscountPct > 0;
  const discountedPrice = hasDiscount && internalPrice != null
    ? internalPrice * (1 - Number(onlineDiscountPct) / 100)
    : null;

  const formatPrice = (val: number | null) => {
    if (val == null) return '—';
    return `$${val.toFixed(2).replace(/\.00$/, '')}`;
  };

  const priceLabel = (() => {
    if (internalPrice == null) return 'Price varies';
    const prefix = includeFromPrefix ? 'from ' : '';
    if (discountedPrice != null) {
      return (
        <span className="inline-flex items-baseline gap-2">
          <span className="text-muted-foreground line-through text-sm">
            {prefix}{formatPrice(internalPrice)}
          </span>
          <span className="text-foreground font-medium">
            {prefix}{formatPrice(discountedPrice)}
          </span>
        </span>
      );
    }
    return <span>{prefix}{formatPrice(internalPrice)}</span>;
  })();

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-primary" />
        <span className="font-display text-xs tracking-wide text-muted-foreground">
          Booking Surface Preview
        </span>
        {!bookableOnline && (
          <span className="ml-auto text-xs text-muted-foreground italic">
            Hidden — not bookable online
          </span>
        )}
      </div>

      <div
        className={cn(
          'rounded-lg border bg-card p-4 transition-opacity',
          !bookableOnline && 'opacity-50',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-base font-sans text-foreground truncate">
              {displayName}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {displayDuration} min
            </p>
          </div>
          <div className="text-right">
            <div className="text-base">{priceLabel}</div>
            {hasDiscount && (
              <div className="inline-flex items-center gap-1 mt-1 text-xs text-primary">
                <Sparkles className="w-3 h-3" />
                {Number(onlineDiscountPct).toFixed(0)}% online
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Internal: {internalName || '—'} · {internalDuration} min · {formatPrice(internalPrice)}
      </p>
    </div>
  );
}
