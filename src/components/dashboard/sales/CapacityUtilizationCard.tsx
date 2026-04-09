import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { useCapacityUtilization, CapacityPeriod } from '@/hooks/useCapacityUtilization';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import { LocationSelect } from '@/components/ui/location-select';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { CapacityBreakdown } from '@/components/dashboard/analytics/CapacityBreakdown';
import { Tabs, FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';
import { Gauge, Clock, DollarSign, TrendingDown, Calendar, Info, Moon } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ClosedBadge } from '@/components/dashboard/ClosedBadge';
import { cn } from '@/lib/utils';
import { analyticsHubUrl } from '@/config/dashboardNav';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';

const PERIOD_LABELS: Record<CapacityPeriod, string> = {
  'tomorrow': 'Tomorrow',
  '7days': 'Next 7 Days',
  '30days': 'Next 30 Days',
};

// Utilization color thresholds
function getUtilizationColor(percent: number): string {
  if (percent >= 70) return 'hsl(var(--chart-2))'; // Green
  if (percent >= 50) return 'hsl(45 93% 47%)'; // Amber
  return 'hsl(0 72% 51%)'; // Red
}

function getUtilizationPillClasses(percent: number): string {
  if (percent >= 70) return 'bg-chart-2/10 text-chart-2';
  if (percent >= 50) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  return 'bg-destructive/10 text-destructive';
}

// Progress bar indicator class by threshold
function getProgressIndicatorClass(percent: number): string {
  if (percent >= 70) return 'bg-chart-2';
  if (percent >= 50) return 'bg-amber-500/80';
  return 'bg-muted-foreground/60';
}

export function CapacityUtilizationCard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<CapacityPeriod>('7days');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const { data, isLoading, error } = useCapacityUtilization(period, selectedLocation);
  const { formatCurrency, currency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { colorMap } = useServiceCategoryColorsMap();

  const handleViewDetails = () => {
    navigate(analyticsHubUrl('operations', 'appointments'));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Unable to load capacity data
        </CardContent>
      </Card>
    );
  }

  const {
    days,
    totalAvailableHours,
    totalBookedHours,
    totalGapHours,
    overallUtilization,
    totalAppointments,
    avgHourlyRevenue,
    gapRevenue,
    serviceMix,
    peakDay,
    lowDay,
    breakdown,
  } = data;

  const showChart = period !== 'tomorrow' && days.length > 1;

  // Compute average utilization for open days
  const openDays = days.filter(d => !d.isClosed);
  const avgUtil = openDays.length > 0
    ? Math.round(openDays.reduce((sum, d) => sum + d.utilizationPercent, 0) / openDays.length)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <Gauge className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="font-display text-base tracking-wide">CAPACITY UTILIZATION</CardTitle>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-primary/10"
                    onClick={handleViewDetails}
                  >
                    <Info className="w-4 h-4 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  View full analytics
                </TooltipContent>
              </UITooltip>
            </div>
            <div className="flex items-center gap-2">
              <LocationSelect
                value={selectedLocation}
                onValueChange={setSelectedLocation}
                includeAll={true}
                allLabel="All Locations"
                triggerClassName="h-8 w-[180px] text-xs border border-border"
              />
              <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', getUtilizationPillClasses(overallUtilization))}>
                {overallUtilization}% utilized
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <CardDescription>How much of your salon's capacity is booked</CardDescription>
            <Tabs value={period} onValueChange={(v) => v && setPeriod(v as CapacityPeriod)}>
              <FilterTabsList>
                <FilterTabsTrigger value="tomorrow">Tomorrow</FilterTabsTrigger>
                <FilterTabsTrigger value="7days">7 Days</FilterTabsTrigger>
                <FilterTabsTrigger value="30days">30 Days</FilterTabsTrigger>
              </FilterTabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Utilization Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {totalBookedHours}h booked of {totalAvailableHours}h available
            </span>
            <span 
              className="font-medium tabular-nums"
              style={{ color: getUtilizationColor(overallUtilization) }}
            >
              {overallUtilization}%
            </span>
          </div>
          <Progress 
            value={overallUtilization} 
            className="h-2.5 bg-muted/50"
            indicatorClassName={cn(
              'transition-all',
              overallUtilization >= 70 && 'bg-chart-2',
              overallUtilization >= 50 && overallUtilization < 70 && 'bg-amber-500/80',
              overallUtilization < 50 && 'bg-muted-foreground/60'
            )}
          />

          {/* Capacity Breakdown Calculator */}
          <CapacityBreakdown
            grossHoursPerStylist={breakdown.grossHoursPerStylist}
            breakMinutes={breakdown.breakMinutes}
            lunchMinutes={breakdown.lunchMinutes}
            paddingMinutes={breakdown.paddingMinutes}
            stylistCount={breakdown.stylistCount}
            daysInPeriod={breakdown.daysInPeriod}
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-4 bg-card border border-border/40 rounded-xl">
            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Clock className="w-4 h-4 text-chart-3" />
              </div>
            </div>
            <span className="text-xl font-display tabular-nums">{totalGapHours}h</span>
            <div className="flex items-center gap-1 justify-center mt-0.5">
              <p className="text-xs text-muted-foreground">Unused Hours</p>
              <MetricInfoTooltip description="Total chair-hours available but not booked. Each stylist-hour counts as one chair-hour." />
            </div>
          </div>
          <div className="text-center p-4 bg-card border border-border/40 rounded-xl">
            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <AnimatedBlurredAmount 
              value={gapRevenue}
              currency={currency}
              className="text-xl font-display tabular-nums"
            />
            <div className="flex items-center gap-1 justify-center mt-0.5">
              <p className="text-xs text-muted-foreground">Gap Revenue</p>
              <MetricInfoTooltip description={`Potential revenue if unused hours were booked. Based on avg hourly revenue of ${formatCurrency(avgHourlyRevenue)}.`} />
            </div>
          </div>
          <div className="text-center p-4 bg-card border border-border/40 rounded-xl">
            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
            </div>
            <span className="text-xl font-display tabular-nums">{totalAppointments}</span>
            <div className="flex items-center gap-1 justify-center mt-0.5">
              <p className="text-xs text-muted-foreground">Appointments</p>
              <MetricInfoTooltip description={`Total scheduled appointments for ${PERIOD_LABELS[period].toLowerCase()}.`} />
            </div>
          </div>
        </div>

        {/* Daily Utilization — Progress Bars */}
        {showChart && days.length > 0 && (
          <div className="space-y-1">
            {/* Average label */}
            {avgUtil > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
                  getUtilizationPillClasses(avgUtil)
                )}>
                  Avg: {avgUtil}%
                </span>
              </div>
            )}

            {days.map((day, i) => (
              <div key={i} className="py-1.5">
                {day.isClosed ? (
                  <div className="flex items-center gap-3">
                    <div className="w-[4.5rem] shrink-0">
                      <span className="text-xs font-medium text-foreground">{day.dayName}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">{formatDate(day.date, 'MMM d')}</span>
                    </div>
                    <ClosedBadge reason={day.closedReason} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-[4.5rem] shrink-0">
                      <span className="text-xs font-medium text-foreground">{day.dayName}</span>
                      <div className="text-[10px] text-muted-foreground">{formatDate(day.date, 'MMM d')}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Progress
                        value={day.utilizationPercent}
                        className="h-3 bg-muted/40"
                        indicatorClassName={cn('transition-all rounded-full', getProgressIndicatorClass(day.utilizationPercent))}
                      />
                    </div>
                    <div className="w-16 shrink-0 text-right">
                      <span className="text-xs font-medium tabular-nums text-foreground">{day.utilizationPercent}%</span>
                      <div className="text-[10px] text-muted-foreground tabular-nums">
                        {day.gapHours > 0 ? `${day.gapHours}h open` : 'Full'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tomorrow View */}
        {period === 'tomorrow' && days.length > 0 && days[0] && (
          days[0].isClosed ? (
            <div className="p-6 bg-muted/20 rounded-lg flex flex-col items-center justify-center gap-2">
              <Moon className="w-6 h-6 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Closed Tomorrow</p>
              <p className="text-xs text-muted-foreground">{formatDate(days[0].date, 'EEEE, MMMM d')}</p>
            </div>
          ) : (
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {formatDate(days[0].date, 'EEEE, MMMM d')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {days[0].bookedHours}h booked • {days[0].gapHours}h available
                  </p>
                </div>
                <div className="text-right">
                  <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium', getUtilizationPillClasses(days[0].utilizationPercent))}>
                    {days[0].utilizationPercent}% capacity
                  </span>
                </div>
              </div>
            </div>
          )
        )}

        {/* Opportunity Callout */}
        {overallUtilization < 70 && totalGapHours > 0 && (
          <div className="p-3 bg-muted/40 border border-border/40 rounded-lg">
            <div className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  Room for {Math.round(totalGapHours / 2)} more bookings
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lowDay && lowDay.utilizationPercent < 50 && (
                    <>{formatDate(lowDay.date, 'EEEE')} has the most availability ({lowDay.gapHours}h open)</>
                  )}
                  {!lowDay && `Fill unused hours to capture ${formatCurrency(gapRevenue)} in potential revenue`}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
