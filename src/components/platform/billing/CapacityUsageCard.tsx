import { MapPin, Users, AlertTriangle, TrendingUp, Infinity } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { Progress } from '@/components/ui/progress';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import type { OrganizationCapacity, CapacityMetrics } from '@/hooks/useOrganizationCapacity';
import { getUtilizationColor, getUtilizationBgColor } from '@/hooks/useOrganizationCapacity';
import { formatCurrency } from '@/hooks/useBillingCalculations';
import { cn } from '@/lib/utils';

interface CapacityUsageCardProps {
  capacity: OrganizationCapacity;
  onAddCapacity?: () => void;
  onUpgradePlan?: () => void;
}

function CapacityBar({ 
  metrics, 
  label, 
  icon: Icon 
}: { 
  metrics: CapacityMetrics; 
  label: string; 
  icon: React.ElementType;
}) {
  const utilizationPercent = Math.min(metrics.utilization * 100, 100);
  const colorClass = getUtilizationColor(metrics.utilization);
  const bgColorClass = getUtilizationBgColor(metrics.utilization);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", colorClass)} />
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {metrics.isUnlimited ? (
            <div className="flex items-center gap-1 text-sm text-slate-400">
              <span>{metrics.used}</span>
              <span>/</span>
              <Infinity className="h-4 w-4" />
            </div>
          ) : (
            <span className={cn("text-sm font-medium", colorClass)}>
              {metrics.used} / {metrics.total}
            </span>
          )}
        </div>
      </div>

      {!metrics.isUnlimited && (
        <div className="relative">
          <Progress 
            value={utilizationPercent} 
            className="h-2 bg-slate-700/50"
          />
          <div 
            className={cn("absolute inset-0 h-2 rounded-full transition-all", bgColorClass)}
            style={{ width: `${utilizationPercent}%`, opacity: 0.8 }}
          />
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Base: {metrics.isUnlimited ? 'Unlimited' : metrics.base}
          {metrics.purchased > 0 && ` + ${metrics.purchased} add-on`}
        </span>
        {!metrics.isUnlimited && metrics.remaining >= 0 && (
          <span>{metrics.remaining} remaining</span>
        )}
      </div>
    </div>
  );
}

export function CapacityUsageCard({
  capacity,
  onAddCapacity,
  onUpgradePlan,
}: CapacityUsageCardProps) {
  const showWarning = capacity.isOverLimit || capacity.nearLimit;

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <PlatformCardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-400" />
            Capacity Usage
          </PlatformCardTitle>
          {showWarning && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-400">
              <AlertTriangle className="h-3 w-3" />
              {capacity.isOverLimit ? 'Over limit' : 'Near limit'}
            </div>
          )}
        </div>
      </PlatformCardHeader>
      <PlatformCardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <CapacityBar 
            metrics={capacity.locations} 
            label="Locations" 
            icon={MapPin} 
          />
          <CapacityBar 
            metrics={capacity.users} 
            label="User Seats" 
            icon={Users} 
          />
        </div>

        {/* Add-on costs summary */}
        {capacity.totalAddOnCost > 0 && (
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Add-on Costs</span>
              <span className="text-white font-medium">
                {formatCurrency(capacity.totalAddOnCost)}/mo
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {capacity.locationCostPerMonth > 0 && (
                <span>Locations: {formatCurrency(capacity.locationCostPerMonth)}</span>
              )}
              {capacity.locationCostPerMonth > 0 && capacity.userCostPerMonth > 0 && ' • '}
              {capacity.userCostPerMonth > 0 && (
                <span>Users: {formatCurrency(capacity.userCostPerMonth)}</span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {onAddCapacity && (
            <PlatformButton 
              variant="outline" 
              size={tokens.button.card} 
              onClick={onAddCapacity}
              className="flex-1"
            >
              + Add Capacity
            </PlatformButton>
          )}
          {onUpgradePlan && capacity.nearLimit && (
            <PlatformButton 
              size={tokens.button.card} 
              onClick={onUpgradePlan}
              className="flex-1"
            >
              Upgrade Plan
            </PlatformButton>
          )}
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
