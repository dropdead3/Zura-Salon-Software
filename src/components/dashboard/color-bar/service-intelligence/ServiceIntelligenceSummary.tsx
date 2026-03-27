import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, AlertTriangle, TrendingUp } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import type { ServiceProfile, OptimizationInsight } from '@/lib/backroom/service-intelligence-engine';

interface ServiceIntelligenceSummaryProps {
  profiles: ServiceProfile[];
  insights: OptimizationInsight[];
  isLoading?: boolean;
}

export function ServiceIntelligenceSummary({
  profiles,
  insights,
  isLoading,
}: ServiceIntelligenceSummaryProps) {
  const { formatCurrency } = useFormatCurrency();
  const { formatPercent } = useFormatNumber();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className={tokens.loading.skeleton} />
        </CardContent>
      </Card>
    );
  }

  const avgMargin = profiles.length > 0
    ? profiles.reduce((s, p) => s + p.margin_pct, 0) / profiles.length
    : 0;

  const criticalCount = insights.filter((i) => i.severity === 'critical').length;
  const totalSavings = insights.reduce((s, i) => s + (i.estimated_annual_savings ?? 0), 0);

  const topInsight = insights[0]; // already sorted by severity

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Brain className={tokens.card.icon} />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Service Intelligence</CardTitle>
            <CardDescription>Adaptive operational analysis</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className={tokens.kpi.tile}>
            <span className={tokens.kpi.label}>Services</span>
            <span className={tokens.kpi.value}>{profiles.length}</span>
          </div>
          <div className={tokens.kpi.tile}>
            <span className={tokens.kpi.label}>Avg Margin</span>
            <span className={tokens.kpi.value}>{formatPercent(avgMargin, false)}</span>
          </div>
          <div className={tokens.kpi.tile}>
            <span className={tokens.kpi.label}>Optimizations</span>
            <div className="flex items-center gap-1.5">
              <span className={tokens.kpi.value}>{insights.length}</span>
              {criticalCount > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                  {criticalCount} critical
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Top Insight */}
        {topInsight && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className={tokens.body.emphasis}>{topInsight.service_name}</span>
            </div>
            <p className={tokens.body.muted}>{topInsight.headline}</p>
            {topInsight.estimated_annual_savings != null && topInsight.estimated_annual_savings > 0 && (
              <p className="font-sans text-sm font-medium text-emerald-600">
                Save {formatCurrency(topInsight.estimated_annual_savings)}/yr
              </p>
            )}
          </div>
        )}

        {/* Total Savings */}
        {totalSavings > 0 && (
          <div className="flex items-center gap-2 text-emerald-600">
            <TrendingUp className="h-4 w-4" />
            <span className="font-sans text-sm font-medium">
              Total potential savings: {formatCurrency(totalSavings)}/yr
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
