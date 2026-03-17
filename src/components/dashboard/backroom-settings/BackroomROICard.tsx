import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { PlatformCard, PlatformCardContent } from '@/components/platform/ui/PlatformCard';
import { TrendingUp, DollarSign, BarChart3, Loader2 } from 'lucide-react';
import { useBackroomROI } from '@/hooks/backroom/useBackroomROI';
import { formatCurrency } from '@/lib/format';

interface BackroomROICardProps {
  subscriptionMonthlyCost?: number;
}

export function BackroomROICard({ subscriptionMonthlyCost }: BackroomROICardProps) {
  const { data: roi, isLoading } = useBackroomROI(subscriptionMonthlyCost);

  if (isLoading) {
    return (
      <PlatformCard variant="default" className="md:col-span-2">
        <PlatformCardContent className="p-6 flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--platform-foreground-muted))]" />
        </PlatformCardContent>
      </PlatformCard>
    );
  }

  if (!roi?.hasEnoughData) {
    return (
      <PlatformCard variant="default" className="md:col-span-2">
        <PlatformCardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
            </div>
            <div>
              <p className={cn(tokens.label.default, 'text-[hsl(var(--platform-foreground))]')}>Your ROI</p>
              <p className="text-xs text-[hsl(var(--platform-foreground-muted))] font-sans">Calculating…</p>
            </div>
          </div>
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))] font-sans">
            We'll calculate your ROI once you have at least 7 days of usage data.
            {roi?.snapshotCount ? ` (${roi.snapshotCount} day${roi.snapshotCount !== 1 ? 's' : ''} so far)` : ''}
          </p>
        </PlatformCardContent>
      </PlatformCard>
    );
  }

  const kpis = [
    {
      icon: TrendingUp,
      label: 'Monthly Savings',
      value: formatCurrency(roi.monthlySavings),
      color: 'text-[hsl(var(--platform-primary))]',
      bgColor: 'bg-[hsl(var(--platform-primary)/0.15)]',
    },
    {
      icon: DollarSign,
      label: 'Subscription Cost',
      value: formatCurrency(roi.subscriptionCost),
      color: 'text-[hsl(var(--platform-foreground-muted))]',
      bgColor: 'bg-[hsl(var(--platform-bg-hover))]',
    },
    {
      icon: BarChart3,
      label: 'Net Benefit',
      value: formatCurrency(roi.netBenefit),
      color: roi.netBenefit >= 0 ? 'text-[hsl(var(--platform-primary))]' : 'text-destructive',
      bgColor: roi.netBenefit >= 0 ? 'bg-[hsl(var(--platform-primary)/0.15)]' : 'bg-destructive/10',
    },
  ];

  return (
    <PlatformCard variant="default" className="md:col-span-2">
      <PlatformCardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-primary)/0.15)] flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
          </div>
          <div>
            <p className={cn(tokens.label.default, 'text-[hsl(var(--platform-foreground))]')}>Your ROI</p>
            <p className="text-xs text-[hsl(var(--platform-foreground-muted))] font-sans">
              Based on {roi.snapshotCount} days of data • {roi.wasteReduction}% waste reduction vs industry baseline
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className={cn('w-7 h-7 rounded-md flex items-center justify-center', kpi.bgColor)}>
                  <kpi.icon className={cn('w-3.5 h-3.5', kpi.color)} />
                </div>
                <span className={cn(tokens.kpi.label, 'text-[10px]')}>{kpi.label}</span>
              </div>
              <p className={cn('text-xl font-display tracking-wide', kpi.color)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Savings vs cost visual bar */}
        {roi.subscriptionCost > 0 && (
          <div className="pt-2 space-y-1.5">
            <div className="flex justify-between text-xs font-sans text-[hsl(var(--platform-foreground-muted))]">
              <span>Savings vs Cost</span>
              <span>{Math.round((roi.monthlySavings / roi.subscriptionCost) * 100)}% return</span>
            </div>
            <div className="h-2.5 rounded-full bg-[hsl(var(--platform-bg-hover))] overflow-hidden flex">
              <div
                className="h-full rounded-full bg-[hsl(var(--platform-primary))] transition-all duration-500"
                style={{
                  width: `${Math.min(100, (roi.monthlySavings / Math.max(roi.monthlySavings, roi.subscriptionCost)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </PlatformCardContent>
    </PlatformCard>
  );
}
