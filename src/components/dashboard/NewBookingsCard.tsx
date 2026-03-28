import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { CalendarPlus, UserPlus, RefreshCw, TrendingUp, TrendingDown, Minus, MapPin, CalendarCheck } from 'lucide-react';
import { useNewBookings } from '@/hooks/useNewBookings';
import { useBookingPipeline } from '@/hooks/useBookingPipeline';
import { useBookingPipelineByLocation } from '@/hooks/useBookingPipelineByLocation';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { NewBookingsDrilldown } from './NewBookingsDrilldown';
import { PipelineActionGuide } from './PipelineActionGuide';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import type { DateRangeType } from '@/components/dashboard/PinnedAnalyticsCard';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


const RANGE_LABELS: Record<DateRangeType, string> = {
  today: 'Booked Today',
  yesterday: 'Booked Yesterday',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  thisWeek: 'This Week',
  thisMonth: 'This Month',
  lastMonth: 'Last Month',
  todayToEom: 'Today to End of Month',
  todayToPayday: 'Today to Next Pay Day',
};

interface NewBookingsCardProps {
  filterContext?: FilterContext;
}

export function NewBookingsCard({
  filterContext }: NewBookingsCardProps) {
  const { dashPath } = useOrgDashboardPath();
  const dateRange = (filterContext?.dateRange ?? 'today') as DateRangeType;
  const locationIdForPipeline = filterContext?.locationId === 'all' ? undefined : filterContext?.locationId;
  const { data, isLoading } = useNewBookings(filterContext?.locationId, dateRange);
  const pipeline = useBookingPipeline(locationIdForPipeline);
  const { locations: pipelineLocations } = useBookingPipelineByLocation(locationIdForPipeline);
  const [drilldown, setDrilldown] = useState<'new' | 'returning' | null>(null);
  const [showActionGuide, setShowActionGuide] = useState(false);
  const showPipelineAction = pipeline.status === 'critical' || pipeline.status === 'slowing';

  const showLocationBreakdown = !filterContext?.locationId || filterContext.locationId === 'all';
  const heroLabel = RANGE_LABELS[dateRange] || 'Booked';

  const TrendIcon = data?.percentChange && data.percentChange > 0 ? TrendingUp 
    : data?.percentChange && data.percentChange < 0 ? TrendingDown 
    : Minus;
  const trendColor = data?.percentChange && data.percentChange > 0 ? 'text-green-500' 
    : data?.percentChange && data.percentChange < 0 ? 'text-red-500' 
    : 'text-muted-foreground';

  return (
    <Card className={cn("p-6 h-full flex flex-col", tokens.card.wrapper)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <CalendarPlus className={tokens.card.icon} />
          </div>
          <div className="flex items-center gap-2">
            <div>
              <h2 className="font-display text-base tracking-wide">NEW BOOKINGS</h2>
              <p className="text-xs text-muted-foreground">Appointments scheduled</p>
            </div>
          </div>
        </div>
        {filterContext && (
          <AnalyticsFilterBadge 
            locationId={filterContext.locationId} 
            dateRange={filterContext.dateRange} 
          />
        )}
      </div>

      {/* Hero: Total Booked in Range */}
      <div className="text-center mb-6">
        {isLoading ? (
          <Skeleton className="h-12 w-16 mx-auto" />
        ) : (
          <p className="text-4xl font-display tabular-nums">{data?.bookedInRange || 0}</p>
        )}
        <div className="flex items-center gap-1 justify-center mt-1">
          <p className="text-sm text-muted-foreground">{heroLabel}</p>
          <MetricInfoTooltip description={`Total appointments scheduled for the selected period (${heroLabel.toLowerCase()}).`} />
        </div>
      </div>

      {/* Booking Pipeline Health */}
      <Link
        to={dashPath('/admin/analytics?tab=operations&subtab=booking-pipeline')}
        className="block p-3 bg-card-inner rounded-lg border border-border/50 mb-4 hover:bg-muted/50 transition-colors"
      >
        {pipeline.isLoading ? (
          <Skeleton className="h-5 w-full" />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0",
                pipeline.status === 'healthy' && 'bg-emerald-500',
                pipeline.status === 'slowing' && 'bg-amber-500',
                pipeline.status === 'critical' && 'bg-destructive',
              )} />
              <span className="text-sm font-medium">Pipeline: {pipeline.label}</span>
              <MetricInfoTooltip description="Compares confirmed appointments in the next 14 days against the trailing 14 days. Healthy ≥ 90%, Slowing ≥ 70%, Critical < 70%." />
              {showPipelineAction && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-full px-3 h-6 text-[10px] font-sans ml-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowActionGuide(true);
                  }}
                >
                  Take Action
                </Button>
              )}
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {pipeline.forwardCount} next 14d vs {pipeline.baselineCount} trailing
            </span>
          </div>
        )}
      </Link>

      {/* Breakdown: New vs Returning */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <button
          type="button"
          onClick={() => setDrilldown('new')}
          className="text-center p-4 bg-card-inner rounded-lg border border-border/50 cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <div className="flex justify-center mb-2">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-10 mx-auto" />
          ) : (
            <p className="text-xl font-display tabular-nums">{data?.newClientCount || 0}</p>
          )}
          <div className="flex items-center gap-1 justify-center mt-1">
            <p className="text-xs text-muted-foreground">New Clients</p>
            <MetricInfoTooltip description="Bookings from first-time clients in this period." />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setDrilldown('returning')}
          className="text-center p-4 bg-card-inner rounded-lg border border-border/50 cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <div className="flex justify-center mb-2">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-10 mx-auto" />
          ) : (
            <p className="text-xl font-display tabular-nums">{data?.returningClientCount || 0}</p>
          )}
          <div className="flex items-center gap-1 justify-center mt-1">
            <p className="text-xs text-muted-foreground">Returning Clients</p>
            <MetricInfoTooltip description="Bookings from repeat clients in this period." />
          </div>
        </button>
      </div>

      {/* After-Service Rebook Rate */}
      {!isLoading && data?.rebookRate !== undefined && (
        <div className="mb-4 p-4 bg-card-inner rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">After-Service Rebook</span>
            <MetricInfoTooltip description="Percentage of returning clients serviced in this period who rebooked their next appointment." />
          </div>
          {data.rebookRate !== null ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {data.rebookedAtCheckoutInRange} of {data.returningServicedInRange} rebooked
                  {(data.returningServicedInRange! - data.rebookedAtCheckoutInRange!) > 0 && (
                    <span className="text-destructive"> · {data.returningServicedInRange! - data.rebookedAtCheckoutInRange!} did not</span>
                  )}
                </span>
                <span className="font-display tabular-nums text-lg">{data.rebookRate}%</span>
              </div>
              <Progress 
                value={data.rebookRate} 
                className="h-2" 
                indicatorClassName={
                  data.rebookRate >= 70 ? 'bg-emerald-500' 
                  : data.rebookRate >= 40 ? 'bg-amber-500' 
                  : 'bg-red-500'
                }
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No returning clients serviced in this period</p>
          )}
        </div>
      )}

      {/* Location Breakdown */}
      {showLocationBreakdown && data?.locationBreakdown && data.locationBreakdown.length > 1 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-display text-muted-foreground tracking-wide">
              By Location
            </span>
          </div>
          <div className="space-y-2">
            {data.locationBreakdown.map(loc => (
              <div
                key={loc.locationId}
                className="flex items-center justify-between p-2 bg-card-inner rounded-md border border-border/40"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{loc.name}</span>
                  {(() => {
                    const ploc = pipelineLocations?.find(p => p.locationId === loc.locationId);
                    if (!ploc || ploc.status === 'no_data') return null;
                    const badgeConfig = {
                      healthy: { dot: 'bg-emerald-500', label: 'Healthy' },
                      slowing: { dot: 'bg-amber-500', label: 'Slowing' },
                      critical: { dot: 'bg-destructive', label: 'Critical' },
                    }[ploc.status];
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted/50 border border-border/40">
                        <span className={cn('w-1.5 h-1.5 rounded-full', badgeConfig.dot)} />
                        {badgeConfig.label}
                      </span>
                    );
                  })()}
                </div>
                <span className="font-display tabular-nums">{loc.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 30-Day Comparison */}
      <div className="p-4 bg-card-inner rounded-lg border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Last 30 Days:</span>
            {isLoading ? (
              <Skeleton className="h-5 w-10" />
            ) : (
              <span className="font-display tabular-nums">{data?.last30Days || 0}</span>
            )}
          </div>
          {!isLoading && (
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm">
                {data?.percentChange && data.percentChange > 0 ? '+' : ''}{data?.percentChange || 0}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">vs prev 30d</span>
            </div>
          )}
        </div>
      </div>

      {/* Stylist Drill-Down Dialog */}
      <NewBookingsDrilldown
        mode={drilldown}
        onClose={() => setDrilldown(null)}
        newClientsByStaff={data?.newClientsByStaff || []}
        returningClientsByStaff={data?.returningClientsByStaff || []}
      />
      <PipelineActionGuide
        open={showActionGuide}
        onOpenChange={setShowActionGuide}
        forwardCount={pipeline.forwardCount}
      />
    </Card>
  );
}
