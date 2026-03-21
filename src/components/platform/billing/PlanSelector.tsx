import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubscriptionPlan } from '@/hooks/useOrganizationBilling';
import { formatCurrency } from '@/hooks/useBillingCalculations';

interface PlanSelectorProps {
  plans: SubscriptionPlan[];
  selectedPlanId: string | null;
  onSelect: (planId: string) => void;
  disabled?: boolean;
}

function getPlanPriceDisplay(plan: SubscriptionPlan) {
  if (plan.tier === 'enterprise') {
    return { price: 'Custom', sub: 'Contact Sales' };
  }
  if (plan.tier === 'operator') {
    return { price: formatCurrency(plan.price_monthly), sub: '/mo flat' };
  }
  // Growth / Infrastructure: per-location pricing
  return { price: formatCurrency(plan.price_monthly), sub: '/location/mo' };
}

function getIncludedUsersDisplay(plan: SubscriptionPlan) {
  if (plan.tier === 'enterprise') return 'Custom';
  if (plan.tier === 'operator') return '1 user included';
  return '10 users/location';
}

export function PlanSelector({ plans, selectedPlanId, onSelect, disabled }: PlanSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan) => {
        const isSelected = selectedPlanId === plan.id;
        const display = getPlanPriceDisplay(plan);
        
        return (
          <button
            key={plan.id}
            type="button"
            disabled={disabled || plan.tier === 'enterprise'}
            onClick={() => onSelect(plan.id)}
            className={cn(
              'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
              'hover:border-[hsl(var(--platform-primary)/0.5)] hover:bg-[hsl(var(--platform-bg-card)/0.5)]',
              'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--platform-primary)/0.3)]',
              isSelected
                ? 'border-[hsl(var(--platform-primary))] bg-[hsl(var(--platform-primary)/0.1)]'
                : 'border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.3)]',
              (disabled || plan.tier === 'enterprise') && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSelected && (
              <div className="absolute top-2 right-2">
                <div className="w-5 h-5 rounded-full bg-[hsl(var(--platform-primary))] flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="font-medium text-[hsl(var(--platform-foreground))]">{plan.name}</h4>
              
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-medium text-[hsl(var(--platform-foreground))]">
                  {display.price}
                </span>
                <span className="text-sm text-[hsl(var(--platform-foreground-muted))]">{display.sub}</span>
              </div>

              <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
                {getIncludedUsersDisplay(plan)}
              </p>

              <p className="text-xs text-[hsl(var(--platform-foreground-muted))] line-clamp-2">{plan.description}</p>

              <div className="pt-2 border-t border-[hsl(var(--platform-border)/0.5)]">
                <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
                  {plan.max_locations === -1 ? 'Unlimited locations' : `Up to ${plan.max_locations} location${plan.max_locations !== 1 ? 's' : ''}`}
                  {' • '}
                  {plan.max_users === -1 ? 'Unlimited users' : `${plan.max_users} max users`}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
