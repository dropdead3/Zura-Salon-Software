/**
 * RebookDeclineReasonsCard — surfaces why staff aren't rebooking, ranked.
 * Headline metric: % of declines that were "I never asked" (the biggest lever).
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { MessageCircleX, AlertCircle } from 'lucide-react';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { cn } from '@/lib/utils';
import {
  useRebookDeclineReasons,
  REBOOK_DECLINE_REASONS,
  getReasonLabel,
} from '@/hooks/useRebookDeclineReasons';

interface RebookDeclineReasonsCardProps {
  organizationId?: string;
  locationId?: string | null;
  dateFrom: string;
  dateTo: string;
  filterContext: FilterContext;
}

export function RebookDeclineReasonsCard({
  organizationId,
  locationId,
  dateFrom,
  dateTo,
  filterContext,
}: RebookDeclineReasonsCardProps) {
  const { data: rows = [], isLoading, isError } = useRebookDeclineReasons({
    organizationId,
    locationId: locationId === 'all' ? null : locationId,
    dateFrom,
    dateTo,
  });

  const breakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      counts.set(r.reason_code, (counts.get(r.reason_code) || 0) + 1);
    }
    const total = rows.length;
    const ordered = REBOOK_DECLINE_REASONS.map((r) => ({
      code: r.code,
      label: r.label,
      isLever: !!(r as any).isLever,
      count: counts.get(r.code) || 0,
      pct: total > 0 ? ((counts.get(r.code) || 0) / total) * 100 : 0,
    })).sort((a, b) => b.count - a.count);
    const neverAskedPct = ordered.find((r) => r.code === 'never_asked')?.pct ?? 0;
    return { total, rows: ordered, neverAskedPct };
  }, [rows]);

  if (isError) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load decline reasons.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        {/* Canonical header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              data-pinnable-anchor
              className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg shrink-0"
            >
              <MessageCircleX className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm tracking-wide text-muted-foreground uppercase truncate">
                Rebook Decline Reasons
              </h3>
              <MetricInfoTooltip description="Captured at checkout when staff skip the rebook prompt. Reasons distinguish 'client declined' from 'I never asked' — the latter is the biggest lever for raising rebook rate." />
            </div>
          </div>
          <AnalyticsFilterBadge
            locationId={filterContext.locationId}
            dateRange={filterContext.dateRange}
          />
        </div>

        {/* Headline insight */}
        {breakdown.total === 0 ? (
          <div className={tokens.empty.container}>
            <MessageCircleX className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No decline reasons recorded yet</h3>
            <p className={tokens.empty.description}>
              Reasons capture starts at checkout when staff skip the rebook prompt.
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-lg border border-border/50 bg-muted/30 mb-4">
              <p
                className={cn(
                  'font-medium text-2xl tabular-nums',
                  breakdown.neverAskedPct >= 30 && 'text-amber-600 dark:text-amber-400',
                )}
              >
                {breakdown.neverAskedPct.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">
                of declines were <span className="font-medium">"I never asked"</span> — biggest lever this period
              </p>
            </div>

            {/* Horizontal bars */}
            <div className="space-y-2">
              {breakdown.rows
                .filter((r) => r.count > 0)
                .map((r) => (
                  <div key={r.code}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          'text-xs truncate pr-2',
                          r.isLever && 'font-medium text-foreground',
                        )}
                      >
                        {r.label}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                        {r.count} · {r.pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          r.isLever ? 'bg-amber-500/80' : 'bg-primary/60',
                        )}
                        style={{ width: `${Math.max(r.pct, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>

            <p className="text-[11px] text-muted-foreground mt-4">
              {breakdown.total} total decline{breakdown.total === 1 ? '' : 's'} captured in this period.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
