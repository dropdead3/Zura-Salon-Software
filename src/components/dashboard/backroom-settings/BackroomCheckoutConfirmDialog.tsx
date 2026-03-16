import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Loader2, ArrowRight, MapPin, Scale, Droplets, CreditCard, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useOrgPaymentInfo } from '@/hooks/useOrgPaymentInfo';
import {
  BACKROOM_BASE_PRICE, BACKROOM_PER_SERVICE_FEE,
  SCALE_LICENSE_MONTHLY, SCALE_HARDWARE_PRICE,
} from '@/hooks/backroom/useLocationStylistCounts';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  organizationId: string | undefined;
  locationCount: number;
  scaleCount: number;
  estimatedMonthlyServices: number;
  estimatedMonthlySavings: number;
  netBenefit: number;
}

export function BackroomCheckoutConfirmDialog({
  open, onOpenChange, onConfirm, loading,
  organizationId, locationCount, scaleCount, estimatedMonthlyServices,
  estimatedMonthlySavings, netBenefit,
}: Props) {
  const { formatCurrency } = useFormatCurrency();
  const { data: paymentInfo } = useOrgPaymentInfo(organizationId);

  const baseCost = locationCount * BACKROOM_BASE_PRICE;
  const scaleLicenseCost = scaleCount * SCALE_LICENSE_MONTHLY;
  const estimatedUsage = Math.round(estimatedMonthlyServices * BACKROOM_PER_SERVICE_FEE);
  const monthlyRecurring = baseCost + scaleLicenseCost;
  const hardwareOneTime = scaleCount * SCALE_HARDWARE_PRICE;
  const estimatedMonthlyGrandTotal = monthlyRecurring + estimatedUsage;

  const card = paymentInfo?.payment_method;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className={tokens.card.title}>Confirm Subscription</DialogTitle>
          <DialogDescription>
            Review your Backroom charges before proceeding to checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
          {/* Monthly recurring */}
          <div className="space-y-2">
            <p className={cn(tokens.label.default, 'text-xs text-muted-foreground')}>Monthly Recurring</p>
            <div className="rounded-lg border border-border/60 divide-y divide-border/40">
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-sans">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {locationCount} location{locationCount !== 1 ? 's' : ''} × {formatCurrency(BACKROOM_BASE_PRICE)}/mo
                </span>
                <span className="text-sm font-sans font-medium">{formatCurrency(baseCost)}</span>
              </div>
              {scaleCount > 0 && (
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-sans">
                    <Scale className="w-3.5 h-3.5 text-primary" />
                    {scaleCount} scale{scaleCount !== 1 ? 's' : ''} × {formatCurrency(SCALE_LICENSE_MONTHLY)}/mo
                  </span>
                  <span className="text-sm font-sans font-medium">{formatCurrency(scaleLicenseCost)}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2.5 bg-muted/30">
                <span className="text-sm font-sans font-medium">Fixed monthly total</span>
                <span className="text-sm font-sans font-medium">{formatCurrency(monthlyRecurring)}/mo</span>
              </div>
            </div>
          </div>

          {/* Usage-based */}
          <div className="space-y-2">
            <p className={cn(tokens.label.default, 'text-xs text-muted-foreground')}>Usage-Based (Metered)</p>
            <div className="rounded-lg border border-border/60 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-sans">
                  <Droplets className="w-3.5 h-3.5 text-primary" />
                  {formatCurrency(BACKROOM_PER_SERVICE_FEE)} per color service
                </span>
                <span className="text-sm font-sans text-muted-foreground">~{formatCurrency(estimatedUsage)}/mo</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-sans mt-1">
                Billed monthly based on actual usage. Estimate based on current booking volume.
              </p>
            </div>
          </div>

          {/* One-time */}
          {hardwareOneTime > 0 && (
            <div className="space-y-2">
              <p className={cn(tokens.label.default, 'text-xs text-muted-foreground')}>One-Time</p>
              <div className="rounded-lg border border-border/60 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-sans">
                    <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                    {scaleCount} scale{scaleCount !== 1 ? 's' : ''} × {formatCurrency(SCALE_HARDWARE_PRICE)}
                  </span>
                  <span className="text-sm font-sans font-medium">{formatCurrency(hardwareOneTime)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Grand Total Summary ── */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            {hardwareOneTime > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-sans text-muted-foreground">Due today</span>
                <span className="text-sm font-sans font-medium">{formatCurrency(hardwareOneTime)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-sans font-medium">Est. monthly total</span>
              <span className="font-display text-lg tracking-wide">{formatCurrency(estimatedMonthlyGrandTotal)}/mo</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-sans">
              Estimated total across {locationCount} location{locationCount !== 1 ? 's' : ''}. Usage fees may vary based on actual service volume.
            </p>
          </div>

          {/* ── Estimated Savings / ROI ── */}
          {estimatedMonthlySavings > 0 && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-sans text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  Est. monthly savings
                </span>
                <span className="text-sm font-sans font-medium text-emerald-500">
                  +{formatCurrency(estimatedMonthlySavings)}/mo
                </span>
              </div>
              {netBenefit > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-sans text-muted-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    Net benefit after costs
                  </span>
                  <span className="text-sm font-sans font-medium text-emerald-500">
                    +{formatCurrency(netBenefit)}/mo
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Card on file */}
          {card && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-sans text-muted-foreground">
                {card.brand} ending in {card.last4}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting…
                </>
              ) : (
                <>
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
