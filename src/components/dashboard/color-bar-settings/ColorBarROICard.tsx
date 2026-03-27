import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useBackroomSavings } from '@/hooks/backroom/useBackroomSavings';
import { formatCurrency } from '@/lib/format';

interface BackroomROICardProps {
  subscriptionMonthlyCost?: number;
}

export function BackroomROICard({ subscriptionMonthlyCost }: BackroomROICardProps) {
  const { data: savings, isLoading } = useBackroomSavings(30, subscriptionMonthlyCost ?? 0);

  if (isLoading) {
    return (
      <Card className="md:col-span-2">
        <CardContent className="p-6 h-32">
          <DashboardLoader size="sm" className="h-full" />
        </CardContent>
      </Card>
    );
  }

  if (!savings?.hasEnoughData) {
    return (
      <Card className="md:col-span-2">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className={cn(tokens.label.default, 'text-foreground')}>Your ROI</p>
              <p className="text-xs text-muted-foreground font-sans">Calculating…</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-sans">
            We'll calculate your ROI once you have at least 7 days of usage data.
            {savings?.snapshotCount ? ` (${savings.snapshotCount} day${savings.snapshotCount !== 1 ? 's' : ''} so far)` : ''}
          </p>
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    {
      icon: TrendingUp,
      label: 'Monthly Savings',
      value: formatCurrency(savings.totalSavings),
      color: 'text-primary',
      bgColor: 'bg-primary/15',
    },
    {
      icon: DollarSign,
      label: 'Subscription Cost',
      value: formatCurrency(savings.subscriptionCost),
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    {
      icon: BarChart3,
      label: 'Net Benefit',
      value: formatCurrency(savings.netBenefit),
      color: savings.netBenefit >= 0 ? 'text-primary' : 'text-destructive',
      bgColor: savings.netBenefit >= 0 ? 'bg-primary/15' : 'bg-destructive/10',
    },
  ];

  return (
    <Card className="md:col-span-2">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className={cn(tokens.label.default, 'text-foreground')}>Your ROI</p>
            <p className="text-xs text-muted-foreground font-sans">
              Based on {savings.snapshotCount} days of data • {savings.wasteReduction}% waste reduction vs industry baseline
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="space-y-1.5">
              <div className="flex items-center gap-2 min-h-[32px]">
                <div className={cn('w-8 h-8 rounded-md flex items-center justify-center shrink-0', kpi.bgColor)}>
                  <kpi.icon className={cn('w-4 h-4', kpi.color)} />
                </div>
                <span className={cn(tokens.kpi.label, 'text-[10px]')}>{kpi.label}</span>
              </div>
              <p className={cn('text-xl font-display tracking-wide', kpi.color)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Savings vs cost visual bar */}
        {savings.subscriptionCost > 0 && (
          <div className="pt-2 space-y-1.5">
            <div className="flex justify-between text-xs font-sans text-muted-foreground">
              <span>Savings vs Cost</span>
              <span>{Math.round((savings.totalSavings / savings.subscriptionCost) * 100)}% return</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: `${Math.min(100, (savings.totalSavings / Math.max(savings.totalSavings, savings.subscriptionCost)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
