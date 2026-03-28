import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { Calendar, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppointmentSummary } from '@/hooks/useOperationalAnalytics';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

export interface DailyBriefCardProps {
  filterContext: FilterContext;
  locationId: string;
}

/** Always shows today's operational snapshot: appointments (completed vs scheduled), no-shows, completion rate. */
export function DailyBriefCard({ filterContext, locationId }: DailyBriefCardProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const locationFilter = locationId === 'all' ? undefined : locationId;

  const { data: appointmentSummary, isLoading, isError, refetch } = useAppointmentSummary(
    today,
    today,
    locationFilter
  );

  const total = appointmentSummary?.total ?? 0;
  const completed = appointmentSummary?.completed ?? 0;
  const noShow = appointmentSummary?.noShow ?? 0;
  const noShowRate = appointmentSummary?.noShowRate ?? 0;

  if (isError) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load daily brief.</span>
          </div>
          <Button variant="outline" size={tokens.button.card} className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              data-pinnable-anchor
              className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg shrink-0"
            >
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm tracking-wide text-muted-foreground uppercase truncate">
                Daily Brief
              </h3>
              <MetricInfoTooltip description="Today's real-time operational snapshot: scheduled vs completed appointments, no-show count and rate, and overall completion percentage." />
            </div>
          </div>
          <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange="today" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Appointments</span>
            </div>
            <p className="font-medium text-lg tabular-nums">
              {completed} / {total}
            </p>
            <p className="text-xs text-muted-foreground">completed</p>
          </div>
          <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">No-Shows</span>
            </div>
            <p className={cn('font-medium text-lg tabular-nums', noShow > 0 && 'text-destructive')}>
              {noShow}
            </p>
            {total > 0 && (
              <p className="text-xs text-muted-foreground">{noShowRate.toFixed(0)}% of scheduled</p>
            )}
          </div>
          <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-success-foreground" />
              <span className="text-xs text-muted-foreground">Completion</span>
            </div>
            <p className="font-medium text-lg tabular-nums">
              {total > 0 ? ((completed / total) * 100).toFixed(0) : 0}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
