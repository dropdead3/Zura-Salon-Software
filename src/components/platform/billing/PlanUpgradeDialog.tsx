import { useState } from 'react';
import { ArrowRight, Check, X, Calendar, Loader2 } from 'lucide-react';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  PlatformDialogDescription as DialogDescription,
  DialogFooter,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
} from '@/components/platform/ui/PlatformDialog';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import { formatCurrency } from '@/hooks/useBillingCalculations';
import type { SubscriptionPlan } from '@/hooks/useOrganizationBilling';
import { cn } from '@/lib/utils';

interface PlanUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: SubscriptionPlan | null;
  plans: SubscriptionPlan[];
  onConfirm: (planId: string, effectiveDate: 'immediately' | 'next_cycle') => void;
  isLoading?: boolean;
  daysRemainingInCycle?: number;
  currentMonthlyAmount?: number;
}

function calculateProration(
  currentAmount: number,
  newAmount: number,
  daysRemaining: number
): { credit: number; charge: number; net: number } {
  const dailyRateCurrent = currentAmount / 30;
  const dailyRateNew = newAmount / 30;
  
  const credit = dailyRateCurrent * daysRemaining;
  const charge = dailyRateNew * daysRemaining;
  const net = charge - credit;

  return { credit, charge, net };
}

export function PlanUpgradeDialog({
  open,
  onOpenChange,
  currentPlan,
  plans,
  onConfirm,
  isLoading,
  daysRemainingInCycle = 15,
  currentMonthlyAmount = 0,
}: PlanUpgradeDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<'immediately' | 'next_cycle'>('immediately');

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const isUpgrade = selectedPlan && currentPlan && selectedPlan.price_monthly > currentPlan.price_monthly;
  const isDowngrade = selectedPlan && currentPlan && selectedPlan.price_monthly < currentPlan.price_monthly;

  const proration = selectedPlan ? calculateProration(
    currentMonthlyAmount,
    selectedPlan.price_monthly,
    daysRemainingInCycle
  ) : null;

  const handleConfirm = () => {
    if (selectedPlanId) {
      onConfirm(selectedPlanId, effectiveDate);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Change Subscription Plan</DialogTitle>
          <DialogDescription>
            {currentPlan 
              ? `Currently on ${currentPlan.name} at ${formatCurrency(currentMonthlyAmount)}/mo`
              : 'Select a plan to subscribe to'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Plan Selection */}
          <div className="space-y-3">
            <PlatformLabel className="text-sm font-medium">Select New Plan</PlatformLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.filter(p => p.id !== currentPlan?.id).map((plan) => {
                const isPlanUpgrade = currentPlan && plan.price_monthly > currentPlan.price_monthly;
                const isPlanDowngrade = currentPlan && plan.price_monthly < currentPlan.price_monthly;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      selectedPlanId === plan.id
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-white">{plan.name}</h4>
                        <p className="text-lg font-medium text-violet-400">
                          {formatCurrency(plan.price_monthly)}/mo
                        </p>
                      </div>
                      {isPlanUpgrade && (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                          Upgrade
                        </span>
                      )}
                      {isPlanDowngrade && (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">
                          Downgrade
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>{plan.max_locations === -1 ? 'Unlimited' : plan.max_locations} locations</p>
                      <p>{plan.max_users === -1 ? 'Unlimited' : plan.max_users} users</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparison */}
          {selectedPlan && currentPlan && (
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Current</p>
                  <p className="font-medium text-white">{currentPlan.name}</p>
                  <p className="text-sm text-slate-400">{formatCurrency(currentPlan.price_monthly)}/mo</p>
                </div>
                <ArrowRight className="h-5 w-5 text-violet-400" />
                <div className="text-center">
                  <p className="text-xs text-slate-500">New</p>
                  <p className="font-medium text-white">{selectedPlan.name}</p>
                  <p className="text-sm text-violet-400">{formatCurrency(selectedPlan.price_monthly)}/mo</p>
                </div>
              </div>

              {/* Feature comparison */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-500 mb-1">Locations</p>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">
                      {currentPlan.max_locations === -1 ? '∞' : currentPlan.max_locations}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-600" />
                    <span className={cn(
                      selectedPlan.max_locations > currentPlan.max_locations ? "text-emerald-400" : "text-slate-400"
                    )}>
                      {selectedPlan.max_locations === -1 ? '∞' : selectedPlan.max_locations}
                    </span>
                    {selectedPlan.max_locations > currentPlan.max_locations && (
                      <Check className="h-3 w-3 text-emerald-400" />
                    )}
                    {selectedPlan.max_locations < currentPlan.max_locations && (
                      <X className="h-3 w-3 text-red-400" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">User Seats</p>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">
                      {currentPlan.max_users === -1 ? '∞' : currentPlan.max_users}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-600" />
                    <span className={cn(
                      selectedPlan.max_users > currentPlan.max_users ? "text-emerald-400" : "text-slate-400"
                    )}>
                      {selectedPlan.max_users === -1 ? '∞' : selectedPlan.max_users}
                    </span>
                    {selectedPlan.max_users > currentPlan.max_users && (
                      <Check className="h-3 w-3 text-emerald-400" />
                    )}
                    {selectedPlan.max_users < currentPlan.max_users && (
                      <X className="h-3 w-3 text-red-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Effective Date */}
          {selectedPlan && (
            <div className="space-y-3">
              <PlatformLabel className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-violet-400" />
                When to Apply
              </PlatformLabel>
              <RadioGroup
                value={effectiveDate}
                onValueChange={(v) => setEffectiveDate(v as 'immediately' | 'next_cycle')}
                className="grid grid-cols-2 gap-3"
              >
                <div className={cn(
                  "flex items-center space-x-2 p-3 rounded-lg border cursor-pointer",
                  effectiveDate === 'immediately' 
                    ? "border-violet-500 bg-violet-500/10" 
                    : "border-slate-700 bg-slate-800/50"
                )}>
                  <RadioGroupItem value="immediately" id="immediately" />
                  <PlatformLabel htmlFor="immediately" className="cursor-pointer">
                    <span className="block text-sm font-medium text-white">Immediately</span>
                    <span className="block text-xs text-slate-500">Pro-rated adjustment</span>
                  </PlatformLabel>
                </div>
                <div className={cn(
                  "flex items-center space-x-2 p-3 rounded-lg border cursor-pointer",
                  effectiveDate === 'next_cycle' 
                    ? "border-violet-500 bg-violet-500/10" 
                    : "border-slate-700 bg-slate-800/50"
                )}>
                  <RadioGroupItem value="next_cycle" id="next_cycle" />
                  <PlatformLabel htmlFor="next_cycle" className="cursor-pointer">
                    <span className="block text-sm font-medium text-white">Next Cycle</span>
                    <span className="block text-xs text-slate-500">No proration</span>
                  </PlatformLabel>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Proration Preview */}
          {selectedPlan && effectiveDate === 'immediately' && proration && (
            <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
              <h4 className="text-sm font-medium text-white mb-3">Proration Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Days remaining in cycle</span>
                  <span className="text-white">{daysRemainingInCycle} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Credit for current plan</span>
                  <span className="text-emerald-400">-{formatCurrency(proration.credit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Charge for new plan</span>
                  <span className="text-white">+{formatCurrency(proration.charge)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-violet-500/30">
                  <span className="font-medium text-white">Net Amount</span>
                  <span className={cn(
                    "font-medium",
                    proration.net > 0 ? "text-white" : "text-emerald-400"
                  )}>
                    {proration.net > 0 ? formatCurrency(proration.net) : `Credit: ${formatCurrency(Math.abs(proration.net))}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <PlatformButton
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </PlatformButton>
          <PlatformButton
            onClick={handleConfirm}
            disabled={!selectedPlanId || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {isUpgrade ? 'Confirm Upgrade' : isDowngrade ? 'Confirm Downgrade' : 'Confirm Change'}
          </PlatformButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
