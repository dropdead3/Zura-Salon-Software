import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, RefreshCcw, Calendar, DollarSign } from 'lucide-react';
import { useRecoveryOutcomes } from '@/hooks/useRecoveryOutcomes';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { formatCurrency } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

/**
 * P3 Reputation Engine — Recovery outcome card.
 * Surfaces whether recovered clients actually rebooked, and the revenue saved.
 * Silent until ≥5 resolved tasks (signal preservation).
 */
export function RecoveryOutcomeCard() {
  const { data, isLoading } = useRecoveryOutcomes(180);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Recovery Outcomes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.hasSignal) {
    // Silent when threshold unmet — visibility contract
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Recovery Outcomes</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Did recovered clients return?
              </p>
            </div>
            <MetricInfoTooltip
              title="Recovery Outcomes"
              description="Tracks whether resolved recovery tasks led to a rebook within 90 days, and the revenue saved. Suppressed until 5 resolved tasks exist."
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className={tokens.empty.container}>
            <p className={tokens.empty.description}>
              Need at least 5 resolved recovery tasks to compute attribution.
              {data ? ` Currently ${data.totalResolved} resolved.` : ''}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ratePct = ((data.rebookRate ?? 0) * 100).toFixed(0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Recovery Outcomes</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Last 180 days · 90-day rebook window
            </p>
          </div>
          <MetricInfoTooltip
            title="Recovery Outcomes"
            description="Resolved recovery tasks that led to a subsequent appointment within 90 days. Revenue saved excludes tips. Feeds Capital/Economics."
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCcw className="w-3.5 h-3.5" /> Rebook rate
            </div>
            <p className={tokens.kpi.value}>{ratePct}%</p>
            <p className="text-xs text-muted-foreground">
              {data.totalRebooked} of {data.totalResolved}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DollarSign className="w-3.5 h-3.5" /> Revenue saved
            </div>
            <p className={tokens.kpi.value}>
              <BlurredAmount>{formatCurrency(data.revenueSaved)}</BlurredAmount>
            </p>
            <p className="text-xs text-muted-foreground">
              from rebooked clients
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" /> Avg days to rebook
            </div>
            <p className={tokens.kpi.value}>
              {data.avgDaysToRebook != null ? data.avgDaysToRebook.toFixed(0) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.avgDaysToRebook != null ? 'days' : 'no rebooks yet'}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" /> Resolved
            </div>
            <p className={tokens.kpi.value}>{data.totalResolved}</p>
            <p className="text-xs text-muted-foreground">
              tasks in window
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
