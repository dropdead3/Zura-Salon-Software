import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

const AFTERPAY_MAX_CENTS = 400000; // $4,000

interface AfterpaySurchargePreviewProps {
  /** Original service amount in cents (pre-surcharge). Will be capped at $4,000 for Afterpay calc. */
  amountCents: number;
  /** Decimal rate (e.g. 0.06 for 6%). */
  surchargeRate: number;
  /** Compact variant (smaller padding, no helper line) for tight spaces like composer preview. */
  compact?: boolean;
  /** When true, also shows the per-installment "$X every 2 weeks" line. Off by default. */
  showInstallments?: boolean;
  className?: string;
}

/**
 * Shared Afterpay surcharge breakdown card.
 *
 * Renders Service amount → Processing fee → Client pays.
 * Used in: SendPaymentLinkComposer preview, PaymentLinkStatusCard, CheckoutSummarySheet footer.
 */
export function AfterpaySurchargePreview({
  amountCents,
  surchargeRate,
  compact = false,
  showInstallments = false,
  className,
}: AfterpaySurchargePreviewProps) {
  const { formatCurrency } = useFormatCurrency();

  const afterpayCents = Math.min(amountCents, AFTERPAY_MAX_CENTS);
  const feeCents = Math.round(afterpayCents * surchargeRate);
  const clientPaysCents = afterpayCents + feeCents;
  const ratePct = parseFloat((surchargeRate * 100).toFixed(2));
  const installmentCents = Math.round(clientPaysCents / 4);

  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-muted/40 space-y-1',
        compact ? 'p-2.5' : 'p-3',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-display tracking-wide uppercase">
        <Info className="h-3 w-3" />
        Afterpay surcharge preview
      </div>
      <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
        <span>Service amount:</span>
        <span className="text-right">{formatCurrency(afterpayCents / 100)}</span>
        <span>Processing fee ({ratePct}%):</span>
        <span className="text-right">+ {formatCurrency(feeCents / 100)}</span>
        <span className="text-foreground">Client pays:</span>
        <span className="text-right text-foreground">{formatCurrency(clientPaysCents / 100)}</span>
        {showInstallments && (
          <>
            <span>4 installments:</span>
            <span className="text-right">{formatCurrency(installmentCents / 100)} every 2 weeks</span>
          </>
        )}
      </div>
      {!compact && (
        <p className="text-[11px] text-muted-foreground/70 italic mt-1">
          ⓘ Client will only see Afterpay as a payment option
        </p>
      )}
    </div>
  );
}
