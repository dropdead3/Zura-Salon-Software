import { Receipt, ArrowRight } from 'lucide-react';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import type { BillingCalculation } from '@/hooks/useBillingCalculations';
import { formatCurrency, getBillingCycleLabel } from '@/hooks/useBillingCalculations';
import type { BillingCycle } from '@/hooks/useOrganizationBilling';

interface InvoicePreviewProps {
  calculation: BillingCalculation;
  billingCycle: BillingCycle;
  planName: string;
  setupFee: number;
  setupFeePaid: boolean;
  locationCount: number;
  perLocationFee: number;
  userCount?: number;
  perUserFee?: number;
  additionalLocationsPurchased?: number;
  additionalUsersPurchased?: number;
}

export function InvoicePreview({
  calculation,
  billingCycle,
  planName,
  setupFee,
  setupFeePaid,
  locationCount,
  perLocationFee,
  userCount = 0,
  perUserFee = 0,
  additionalLocationsPurchased = 0,
  additionalUsersPurchased = 0,
}: InvoicePreviewProps) {
  const hasLocationAddOns = additionalLocationsPurchased > 0 && perLocationFee > 0;
  const hasUserAddOns = additionalUsersPurchased > 0 && perUserFee > 0;
  const locationAddOnCost = additionalLocationsPurchased * perLocationFee;
  const userAddOnCost = additionalUsersPurchased * perUserFee;

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader className="pb-3">
        <PlatformCardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5 text-violet-400" />
          Invoice Preview
        </PlatformCardTitle>
      </PlatformCardHeader>
      <PlatformCardContent className="space-y-4">
        {/* First Invoice */}
        <div className="space-y-3">
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))] uppercase tracking-wider">First Invoice</p>
          
          {calculation.isInTrial ? (
            <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
              <p className="text-sm text-violet-400">
                No payment due during {calculation.daysUntilTrialEnds}-day trial
              </p>
              <p className="text-xs text-violet-400/70 mt-1">
                First invoice will be generated when trial ends
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Base Plan */}
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--platform-foreground-muted))]">{planName} ({getBillingCycleLabel(billingCycle)})</span>
                <span className="text-[hsl(var(--platform-foreground))]">{formatCurrency(calculation.cycleAmount)}</span>
              </div>

              {/* Location Add-Ons */}
              {hasLocationAddOns && (
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(var(--platform-foreground-muted))]">
                    Location Add-Ons ({additionalLocationsPurchased} × {formatCurrency(perLocationFee)})
                  </span>
                  <span className="text-[hsl(var(--platform-foreground))]">{formatCurrency(locationAddOnCost)}</span>
                </div>
              )}

              {/* User Add-Ons */}
              {hasUserAddOns && (
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(var(--platform-foreground-muted))]">
                    User Seat Add-Ons ({additionalUsersPurchased} × {formatCurrency(perUserFee)})
                  </span>
                  <span className="text-[hsl(var(--platform-foreground))]">{formatCurrency(userAddOnCost)}</span>
                </div>
              )}

              {/* Setup Fee */}
              {setupFee > 0 && !setupFeePaid && (
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(var(--platform-foreground-muted))]">Setup Fee (one-time)</span>
                  <span className="text-[hsl(var(--platform-foreground))]">{formatCurrency(setupFee)}</span>
                </div>
              )}

              {/* Promo Discount */}
              {calculation.isInPromo && calculation.promoSavings > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Promotional Discount</span>
                  <span>-{formatCurrency(calculation.promoSavings)}</span>
                </div>
              )}

              {/* Cycle Savings */}
              {calculation.savingsAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>{getBillingCycleLabel(billingCycle)} Savings ({calculation.savingsPercentage}%)</span>
                  <span>-{formatCurrency(calculation.savingsAmount)}</span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between pt-2 border-t border-[hsl(var(--platform-border)/0.5)]">
                <span className="font-medium text-[hsl(var(--platform-foreground))]">Total Due</span>
                <span className="font-medium text-lg text-[hsl(var(--platform-foreground))]">
                  {formatCurrency(calculation.firstInvoiceAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Ongoing */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Ongoing</p>
          
          <div className="flex items-center gap-3 text-sm">
            <div className="flex-1 p-3 rounded-lg bg-card/50 text-center">
              <p className="text-muted-foreground text-xs mb-1">Per Cycle</p>
              <p className="font-medium text-foreground">{formatCurrency(calculation.cycleAmount)}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 p-3 rounded-lg bg-card/50 text-center">
              <p className="text-muted-foreground text-xs mb-1">Annual Total</p>
              <p className="font-medium text-foreground">{formatCurrency(calculation.annualAmount)}</p>
            </div>
          </div>

          {calculation.isInPromo && (
            <p className="text-xs text-muted-foreground">
              * After promotional period, rate increases to {formatCurrency(calculation.monthlyAmount)}/mo
            </p>
          )}

          {/* Summary of current capacity */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2">
            <p>• {locationCount} location{locationCount !== 1 ? 's' : ''} active</p>
            {userCount > 0 && <p>• {userCount} user seat{userCount !== 1 ? 's' : ''} active</p>}
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
