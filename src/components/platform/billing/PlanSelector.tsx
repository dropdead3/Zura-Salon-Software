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

export function PlanSelector({ plans, selectedPlanId, onSelect, disabled }: PlanSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan) => {
        const isSelected = selectedPlanId === plan.id;
        
        return (
          <button
            key={plan.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(plan.id)}
            className={cn(
              'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
              'hover:border-[hsl(var(--platform-primary)/0.5)] hover:bg-[hsl(var(--platform-bg-card)/0.5)]',
              'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--platform-primary)/0.3)]',
              isSelected
                ? 'border-[hsl(var(--platform-primary))] bg-[hsl(var(--platform-primary)/0.1)]'
                : 'border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.3)]',
              disabled && 'opacity-50 cursor-not-allowed'
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
                  {formatCurrency(plan.price_monthly)}
                </span>
                <span className="text-sm text-[hsl(var(--platform-foreground-muted))]">/mo</span>
              </div>

              {plan.price_annually > 0 && (
                <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
                  {formatCurrency(plan.price_annually / 12)}/mo billed annually
                </p>
              )}

              <p className="text-xs text-[hsl(var(--platform-foreground-muted))] line-clamp-2">{plan.description}</p>

              <div className="pt-2 border-t border-[hsl(var(--platform-border)/0.5)]">
                <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
                  Up to {plan.max_locations} location{plan.max_locations !== 1 ? 's' : ''} • {plan.max_users} users
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}