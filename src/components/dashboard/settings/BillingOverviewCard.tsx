import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { tokens } from '@/lib/design-tokens';
import { CreditCard, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizationBilling, useSubscriptionPlans } from '@/hooks/useOrganizationBilling';
import { useBillingCalculations, formatCurrency, getBillingCycleLabel, getContractLengthLabel } from '@/hooks/useBillingCalculations';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useBackroomLocationEntitlements } from '@/hooks/backroom/useBackroomLocationEntitlements';
import { BACKROOM_BASE_PRICE, SCALE_LICENSE_MONTHLY } from '@/hooks/backroom/useLocationStylistCounts';

export function BillingOverviewCard() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: billing, isLoading: billingLoading } = useOrganizationBilling(orgId);
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const trialStatus = useTrialStatus();
  const { entitlements } = useBackroomLocationEntitlements(orgId);

  const currentPlan = useMemo(() => {
    if (!billing?.plan_id || !plans) return null;
    return plans.find(p => p.id === billing.plan_id) || null;
  }, [billing?.plan_id, plans]);

  const calculations = useBillingCalculations(billing, currentPlan);

  // Calculate backroom costs: $20/location + $10/scale
  const backroomTotal = useMemo(() => {
    const active = entitlements.filter(e => e.status === 'active');
    const baseCost = active.length * BACKROOM_BASE_PRICE;
    const scaleCost = active.reduce((sum, e) => sum + (e.scale_count || 0), 0) * SCALE_LICENSE_MONTHLY;
    return baseCost + scaleCost;
  }, [entitlements]);

  const isLoading = billingLoading || plansLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className={tokens.loading.spinner} />
        </CardContent>
      </Card>
    );
  }

  const totalMonthly = calculations.effectiveMonthlyAmount + backroomTotal;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Subscription Overview</CardTitle>
            <CardDescription>Your current plan and billing details</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan & Status */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-xl tracking-wide uppercase text-foreground">
              {currentPlan?.name || 'No Plan'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {billing ? getBillingCycleLabel(billing.billing_cycle) : 'Monthly'} billing
              {billing?.contract_length_months ? ` · ${getContractLengthLabel(billing.contract_length_months)} contract` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {trialStatus.isInTrial && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-500/10">
                Trial · {trialStatus.daysRemaining}d left
              </Badge>
            )}
            {calculations.isInPromo && (
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 bg-emerald-500/10">
                Promo Active
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground">Cost Breakdown</h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base plan</span>
              <span className="text-foreground">{formatCurrency(calculations.monthlyAmount)}/mo</span>
            </div>

            {calculations.isInPromo && (
              <div className="flex justify-between text-emerald-600">
                <span>Promo discount</span>
                <span>−{formatCurrency(calculations.promoSavings)}/mo</span>
              </div>
            )}

            {billing && (billing.additional_locations_purchased || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Additional locations ({billing.additional_locations_purchased})
                </span>
                <span className="text-foreground">
                  {formatCurrency((billing.additional_locations_purchased || 0) * (billing.per_location_fee || 0))}/mo
                </span>
              </div>
            )}

            {backroomTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Backroom add-ons</span>
                <span className="text-foreground">{formatCurrency(backroomTotal)}/mo</span>
              </div>
            )}

            {calculations.savingsAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>{getBillingCycleLabel(billing!.billing_cycle)} discount ({calculations.savingsPercentage}%)</span>
                <span>−{formatCurrency(calculations.savingsAmount / (billing?.billing_cycle === 'annual' ? 12 : billing?.billing_cycle === 'semi_annual' ? 6 : billing?.billing_cycle === 'quarterly' ? 3 : 1))}/mo</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-between font-display text-base tracking-wide">
            <span>Monthly Total</span>
            <span className="text-foreground">{formatCurrency(totalMonthly)}</span>
          </div>
        </div>

        {/* Contract Dates */}
        {billing?.contract_start_date && (
          <>
            <Separator />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                Contract: {new Date(billing.contract_start_date).toLocaleDateString()}
                {billing.contract_end_date && ` — ${new Date(billing.contract_end_date).toLocaleDateString()}`}
              </span>
              {billing.auto_renewal && (
                <Badge variant="outline" className="ml-auto text-xs">Auto-renew</Badge>
              )}
            </div>
          </>
        )}

        {/* Next billing */}
        {billing?.billing_starts_at && !calculations.isInTrial && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span>Next invoice: {formatCurrency(calculations.cycleAmount)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
