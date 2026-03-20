import { Card, CardContent } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeartPulse, ChevronRight, CalendarX, AlertTriangle, UserX, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClientHealthSegments } from '@/hooks/useClientHealthSegments';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { calculateCLV } from '@/lib/clv-calculator';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

export function ClientHealthSummaryCard() {
  const { dashPath } = useOrgDashboardPath();
  const { data: segments, isLoading } = useClientHealthSegments();
  const { formatCurrencyWhole } = useFormatCurrency();

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-40 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { key: 'needs-rebooking' as const, label: 'Need Rebooking', icon: CalendarX, color: 'text-warning-foreground' },
    { key: 'at-risk' as const, label: 'At-Risk', icon: AlertTriangle, color: 'text-destructive' },
    { key: 'win-back' as const, label: 'Win-Back', icon: UserX, color: 'text-destructive' },
    { key: 'high-value-quiet' as const, label: 'High-Value Quiet', icon: TrendingDown, color: 'text-muted-foreground' },
  ];

  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div data-pinnable-anchor className="p-2.5 rounded-xl bg-rose-500/10">
              <HeartPulse className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">Client Health Pulse</h3>
                <MetricInfoTooltip description="Surfaces clients needing attention based on visit recency. At-risk clients haven't visited in 60+ days. Counts are based on active client records with appointment history." />
              </div>
              <p className="text-xs text-muted-foreground">Clients needing attention</p>
            </div>
          </div>
          <Button variant="ghost" size={tokens.button.card} asChild className="gap-1 text-xs">
            <Link to={dashPath('/admin/client-health')}>
              View Hub <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {metrics.map(m => {
            const segmentClients = segments?.[m.key] || [];
            const count = segmentClients.length;
            
            // Compute revenue at risk for at-risk and high-value-quiet segments
            const showDollarImpact = m.key === 'at-risk' || m.key === 'high-value-quiet';
            let revenueAtRisk = 0;
            if (showDollarImpact && count > 0) {
              revenueAtRisk = segmentClients.reduce((sum, c) => {
                const clv = calculateCLV(c.total_spend, c.visit_count, c.first_visit, c.last_visit);
                return sum + (clv.isReliable ? clv.annualValue : 0);
              }, 0);
            }
            
            return (
              <Link
                key={m.key}
                to={`${dashPath('/admin/client-health?segment=${m.key}')}`}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <m.icon className={`h-4 w-4 ${m.color}`} />
                <div className="min-w-0">
                  <p className="text-lg font-medium leading-none">{count}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{m.label}</p>
                  {showDollarImpact && revenueAtRisk > 0 && (
                    <p className="text-[10px] text-destructive truncate">
                      {formatCurrencyWhole(Math.round(revenueAtRisk))}/yr at risk
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
