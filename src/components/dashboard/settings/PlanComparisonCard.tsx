import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { ArrowUpRight, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizationBilling, useSubscriptionPlans, type SubscriptionPlan } from '@/hooks/useOrganizationBilling';
import { formatCurrency } from '@/hooks/useBillingCalculations';

export function PlanComparisonCard() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: billing } = useOrganizationBilling(orgId);
  const { data: plans, isLoading } = useSubscriptionPlans();

  const currentPlanId = billing?.plan_id;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className={tokens.loading.spinner} />
        </CardContent>
      </Card>
    );
  }

  if (!plans || plans.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <ArrowUpRight className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Plan Comparison</CardTitle>
            <CardDescription>Available subscription tiers</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            return (
              <div
                key={plan.id}
                className={cn(
                  'relative p-4 rounded-xl border-2 text-left transition-all',
                  isCurrent
                    ? 'border-primary bg-primary/5'
                    : 'border-border/50 bg-muted/20'
                )}
              >
                {isCurrent && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-primary text-primary-foreground text-[10px] gap-1">
                      <Check className="w-3 h-3" /> Current
                    </Badge>
                  </div>
                )}
                <div className="space-y-2">
                  <h4 className="font-display text-sm tracking-wide uppercase text-foreground">
                    {plan.name}
                  </h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-display tracking-tight text-foreground">
                      {formatCurrency(plan.price_monthly)}
                    </span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                  {plan.price_annually > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(plan.price_annually / 12)}/mo billed annually
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      Up to {plan.max_locations} location{plan.max_locations !== 1 ? 's' : ''} · {plan.max_users} users
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Contact your account manager to change plans or negotiate custom terms.
        </p>
      </CardContent>
    </Card>
  );
}
