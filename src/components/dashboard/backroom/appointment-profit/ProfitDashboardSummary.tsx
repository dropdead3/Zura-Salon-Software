/**
 * ProfitDashboardSummary — 4-tile KPI summary for appointment profitability.
 */

import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { getMarginHealth } from '@/lib/backroom/appointment-profit-engine';
import type { AppointmentProfitSummary } from '@/hooks/backroom/useAppointmentProfit';

interface ProfitDashboardSummaryProps {
  summary: AppointmentProfitSummary;
  className?: string;
}

export function ProfitDashboardSummary({ summary, className }: ProfitDashboardSummaryProps) {
  const { formatCurrency } = useFormatCurrency();
  const avgHealth = getMarginHealth(summary.avgMarginPct);

  const healthColor: Record<string, string> = {
    healthy: 'text-green-600',
    moderate: 'text-amber-600',
    low: 'text-orange-600',
    negative: 'text-destructive',
  };

  const tiles = [
    {
      label: 'Total Appointments',
      value: summary.totalAppointments.toString(),
      icon: BarChart3,
      accent: undefined,
    },
    {
      label: 'Avg Margin',
      value: `${summary.avgMarginPct}%`,
      icon: Percent,
      accent: healthColor[avgHealth],
    },
    {
      label: 'Highest Margin',
      value: summary.highestMarginService?.serviceName ?? '—',
      sub: summary.highestMarginService
        ? `${summary.highestMarginService.avgMarginPct}%`
        : undefined,
      icon: TrendingUp,
      accent: 'text-green-600',
    },
    {
      label: 'Lowest Margin',
      value: summary.lowestMarginService?.serviceName ?? '—',
      sub: summary.lowestMarginService
        ? `${summary.lowestMarginService.avgMarginPct}%`
        : undefined,
      icon: TrendingDown,
      accent: 'text-orange-600',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {tiles.map((tile) => (
        <Card key={tile.label} className={cn(tokens.kpi.tile, 'relative')}>
          <span className={tokens.kpi.label}>{tile.label}</span>
          <span className={cn(tokens.kpi.value, tile.accent)}>{tile.value}</span>
          {tile.sub && (
            <span className={cn(tokens.kpi.change, tile.accent)}>{tile.sub}</span>
          )}
        </Card>
      ))}
    </div>
  );
}
