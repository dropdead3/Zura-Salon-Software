/**
 * SupplyKPICards — Four hero KPI tiles for Supply Intelligence.
 */

import { Trash2, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Skeleton } from '@/components/ui/skeleton';
import type { SupplyInsightKPIs } from '@/hooks/backroom/useSupplyIntelligence';

interface SupplyKPICardsProps {
  kpis: SupplyInsightKPIs | undefined;
  isLoading: boolean;
  overallHealth?: string;
}

const healthColors: Record<string, string> = {
  healthy: 'text-emerald-600 dark:text-emerald-400',
  attention_needed: 'text-amber-600 dark:text-amber-400',
  critical: 'text-destructive',
};

export function SupplyKPICards({ kpis, isLoading, overallHealth }: SupplyKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={tokens.kpi.tile}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  const tiles = [
    {
      label: 'Annual Waste',
      value: kpis?.annual_waste_cost ?? 0,
      isCurrency: true,
      icon: Trash2,
      tooltip: 'Estimated annual cost of wasted product based on 90-day usage data.',
      accent: 'text-destructive',
    },
    {
      label: 'Reorder Risk',
      value: kpis?.products_at_risk ?? 0,
      suffix: ' products',
      icon: AlertTriangle,
      tooltip: 'Number of products with high or critical stockout risk in the next 7 days.',
      accent: (kpis?.products_at_risk ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
    },
    {
      label: 'Margin Opportunity',
      value: kpis?.margin_opportunity_per_service ?? 0,
      isCurrency: true,
      prefix: '+',
      suffix: '/service',
      icon: TrendingUp,
      tooltip: 'Estimated additional profit per service achievable through supply optimization.',
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Usage Variance',
      value: kpis?.usage_variance_pct ?? 0,
      suffix: '%',
      icon: Users,
      tooltip: 'Average usage variance between staff members — lower is more consistent.',
      accent: (kpis?.usage_variance_pct ?? 0) > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div key={tile.label} className={cn(tokens.kpi.tile, 'relative')}>
            <MetricInfoTooltip
              title={tile.label}
              description={tile.tooltip}
              className={tokens.kpi.infoIcon}
            />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className={tokens.kpi.label}>{tile.label}</span>
            </div>
            <div className={cn(tokens.kpi.value, tile.accent)}>
              {tile.isCurrency ? (
                <BlurredAmount>
                  {tile.prefix ?? ''}${Math.abs(tile.value).toLocaleString()}
                </BlurredAmount>
              ) : (
                <>
                  {tile.prefix ?? ''}{tile.value}{tile.suffix ?? ''}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
