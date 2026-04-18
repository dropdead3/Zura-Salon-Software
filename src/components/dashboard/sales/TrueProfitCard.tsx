/**
 * TrueProfitCard — Owner-facing P&L summary card.
 * Shows Revenue → Chemical Cost → Labor Cost → Waste → Net Profit.
 */

import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useAppointmentProfitSummary } from '@/hooks/color-bar/useAppointmentProfit';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';

interface TrueProfitCardProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  className?: string;
}

function getMarginHealthColor(pct: number) {
  if (pct >= 60) return 'text-green-600 dark:text-green-400';
  if (pct >= 40) return 'text-amber-600 dark:text-amber-400';
  if (pct >= 20) return 'text-orange-600 dark:text-orange-400';
  return 'text-destructive';
}

function getMarginHealthBg(pct: number) {
  if (pct >= 60) return 'bg-green-500/10';
  if (pct >= 40) return 'bg-amber-500/10';
  if (pct >= 20) return 'bg-orange-500/10';
  return 'bg-destructive/10';
}

export function TrueProfitCard({ dateFrom, dateTo, locationId, className }: TrueProfitCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const { data: summary, isLoading } = useAppointmentProfitSummary(dateFrom, dateTo, locationId);

  const totalRevenue = summary?.totalRevenue ?? 0;
  const totalMargin = summary?.totalMargin ?? 0;
  const avgMarginPct = summary?.avgMarginPct ?? 0;

  // Estimate cost breakdown from per-appointment data
  const totalChemicalCost = totalRevenue - totalMargin; // simplified approximation
  const trendData = summary?.trendByDay?.map(d => d.avgMarginPct) ?? [];

  const costLines = [
    { label: 'Revenue', value: totalRevenue, isRevenue: true },
    { label: 'Total Costs', value: totalChemicalCost, isCost: true },
    { label: 'Net Profit', value: totalMargin, isProfit: true },
  ];

  return (
    <Card className={cn(tokens.card.wrapper, className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <DollarSign className={tokens.card.icon} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>True Profit</CardTitle>
                <MetricInfoTooltip
                  title="True Profit"
                  description="Net profit after deducting chemical costs, labor estimates, and waste from service revenue. Based on completed appointment data with color bar tracking."
                />
              </div>
              <CardDescription className={tokens.body.muted}>
                Revenue minus all tracked costs
              </CardDescription>
            </div>
          </div>
          {!isLoading && summary && (
            <div className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium',
              getMarginHealthBg(avgMarginPct),
              getMarginHealthColor(avgMarginPct),
            )}>
              {avgMarginPct}% margin
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
          </div>
        ) : !summary || summary.totalAppointments === 0 ? (
          <div className={tokens.empty.container}>
            <DollarSign className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No profit data</h3>
            <p className={tokens.empty.description}>
              Complete appointments with color bar tracking to see profitability
            </p>
          </div>
        ) : (
          <>
            {/* P&L Lines */}
            <div className="space-y-2">
              {costLines.map(line => (
                <div
                  key={line.label}
                  className={cn(
                    'flex items-center justify-between py-2 px-3 rounded-lg',
                    line.isProfit && getMarginHealthBg(avgMarginPct),
                    line.isProfit && 'border border-border/50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {line.isRevenue && <ArrowUp className="w-3.5 h-3.5 text-green-600" />}
                    {line.isCost && <ArrowDown className="w-3.5 h-3.5 text-destructive" />}
                    {line.isProfit && <Minus className="w-3.5 h-3.5" />}
                    <span className={cn(
                      tokens.body.default,
                      line.isProfit && 'font-medium',
                    )}>
                      {line.label}
                    </span>
                  </div>
                  <span className={cn(
                    'font-display text-sm font-medium tracking-wide',
                    line.isProfit && getMarginHealthColor(avgMarginPct),
                    line.isCost && 'text-destructive',
                  )}>
                    <AnimatedBlurredAmount value={line.value} currency="USD" decimals={2} animationKey={`cc-true-profit-${line.label.toLowerCase().replace(/\s+/g, '-')}`} />
                  </span>
                </div>
              ))}
            </div>

            {/* Trend + Stats */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-3">
                <span className={tokens.body.muted}>
                  {summary.totalAppointments} appointments
                </span>
                {trendData.length >= 2 && (
                  <TrendSparkline data={trendData} width={80} height={24} />
                )}
              </div>
              {summary.highestMarginService && (
                <span className={cn(tokens.body.muted, 'text-xs')}>
                  Top: {summary.highestMarginService.serviceName} ({summary.highestMarginService.avgMarginPct}%)
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
