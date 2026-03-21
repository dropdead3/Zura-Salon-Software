import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { useCapacityUtilization, CapacityPeriod, DayCapacity } from '@/hooks/useCapacityUtilization';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import { LocationSelect } from '@/components/ui/location-select';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { CapacityBreakdown } from '@/components/dashboard/analytics/CapacityBreakdown';
import { Tabs, FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';
import { Gauge, Clock, DollarSign, TrendingDown, Calendar, Info, Moon } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';
import { analyticsHubUrl } from '@/config/dashboardNav';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Customized,
} from 'recharts';

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

// Custom bar label
function UtilizationBarLabel({ x, y, width, value, index, days }: any) {
  if (value === undefined || value === null) return null;
  // Suppress label for closed days
  if (days && days[index]?.isClosed) return null;
  
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      className="fill-foreground text-[10px] font-medium tabular-nums"
    >
      {value}%
    </text>
  );
}

// Custom X-axis tick
function DayXAxisTick({ x, y, payload, days }: any) {
  const { formatDate } = useFormatDate();
  const day = days.find((d: DayCapacity) => d.dayName === payload.value);
  if (!day) return null;
  const dateLabel = formatDate(day.date, 'MMM d');

  if (day.isClosed) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} y={0} dy={12} 
          textAnchor="middle" 
          className="fill-foreground text-[11px]"
          style={{ fontWeight: 500 }}
        >
          {day.dayName}
        </text>
        <text x={0} y={0} dy={25} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {dateLabel}
        </text>
        <text x={0} y={0} dy={38} textAnchor="middle" className="fill-foreground text-[11px]" style={{ fontWeight: 500 }}>
          Closed
        </text>
      </g>
    );
  }
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        x={0} y={0} dy={12} 
        textAnchor="middle" 
        className="fill-foreground text-[11px]"
        style={{ fontWeight: 500 }}
      >
        {day.dayName}
      </text>
      <text x={0} y={0} dy={25} textAnchor="middle" className="fill-muted-foreground text-[10px]">
        {dateLabel}
      </text>
      <text 
        x={0} y={0} dy={38} 
        textAnchor="middle" 
        className="fill-foreground text-[11px]" style={{ fontWeight: 500 }}
      >
        {day.gapHours > 0 ? `${day.gapHours}h open` : 'Full'}
      </text>
    </g>
  );
}

const FALLBACK_COLOR = '#888888';

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

  // Chart data
  const chartData = days.map(day => ({
    name: day.dayName,
    utilization: day.utilizationPercent,
    gapHours: day.gapHours,
    bookedHours: day.bookedHours,
  }));

  // Dynamic Y-axis max: peak + 20% buffer, rounded to nearest 10, clamped [20, 100]
  const peakUtil = Math.max(...chartData.map(d => d.utilization), 0);
  const yMax = Math.min(100, Math.max(20, Math.ceil((peakUtil * 1.2) / 10) * 10));

  const showChart = period !== 'tomorrow' && days.length > 1;

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

        {/* Daily Utilization Chart */}
        {showChart && chartData.length > 0 && (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 5, bottom: 35, left: 5 }}>
                <XAxis 
                  dataKey="name" 
                  tick={<DayXAxisTick days={days} />}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--foreground) / 0.15)', strokeWidth: 1 }}
                  interval={0}
                  height={40}
                />
                <YAxis hide domain={[0, yMax]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'utilization') return [`${value}%`, 'Utilization'];
                    if (name === 'gapHours') return [`${value}h`, 'Open Hours'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => {
                    const day = days.find(d => d.dayName === label);
                    return day ? formatDate(day.date, 'EEEE, MMM d') : label;
                  }}
                />
                <defs>
                  <linearGradient id="capacity-glass-sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.18} />
                  </linearGradient>
                </defs>
                <Bar 
                  dataKey="utilization" 
                  radius={[6, 6, 0, 0]}
                  fill="url(#capacity-glass-sales)"
                  stroke="hsl(var(--foreground) / 0.12)"
                  strokeWidth={1}
                  label={<UtilizationBarLabel days={days} />}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={days[index]?.isClosed ? 'transparent' : 'url(#capacity-glass-sales)'}
                      stroke={days[index]?.isClosed ? 'none' : 'hsl(var(--foreground) / 0.12)'}
                    />
                  ))}
                </Bar>
                {/* Moon icons for closed days */}
                <Customized component={(props: any) => {
                  const { xAxisMap, yAxisMap } = props;
                  if (!xAxisMap?.[0] || !yAxisMap?.[0]) return null;
                  const xAxis = xAxisMap[0];
                  const yAxis = yAxisMap[0];
                  const bottomY = yAxis.y + yAxis.height;
                  return (
                    <g>
                      {chartData.map((entry, index) => {
                        if (!days[index]?.isClosed) return null;
                        const bandWidth = xAxis.width / chartData.length;
                        const cx = xAxis.x + bandWidth * index + bandWidth / 2;
                        const cy = bottomY - 40;
                        return (
                          <g
                            key={`moon-${index}`}
                            transform={`translate(${cx - 8}, ${cy - 8}) scale(0.67)`}
                          >
                            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" 
                                  fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                  className="stroke-muted-foreground" style={{ opacity: 0.5 }} />
                          </g>
                        );
                      })}
                    </g>
                  );
                }} />
                {/* Average utilization reference line */}
                {(() => {
                  const openDays = days.filter(d => !d.isClosed);
                  if (openDays.length === 0) return null;
                  const avgUtil = Math.round(openDays.reduce((sum, d) => sum + d.utilizationPercent, 0) / openDays.length);
                  if (avgUtil <= 0) return null;
                  return (
                    <Customized component={(props: any) => {
                      const { yAxisMap, xAxisMap } = props;
                      if (!yAxisMap?.[0]?.scale || !xAxisMap?.[0]) return null;
                      const yPos = yAxisMap[0].scale(avgUtil);
                      const chartLeft = xAxisMap[0].x;
                      const chartRight = chartLeft + xAxisMap[0].width;
                      if (typeof yPos !== 'number' || isNaN(yPos)) return null;
                      return (
                        <g>
                          <line x1={chartLeft} y1={yPos} x2={chartRight} y2={yPos} stroke="rgb(202 138 4)" strokeOpacity={0.5} strokeDasharray="4 4" strokeWidth={1} />
                          <foreignObject x={chartLeft} y={yPos - 12} width={120} height={24} style={{ overflow: 'visible' }}>
                            <div style={{
                              fontSize: 11, fontWeight: 500,
                              color: 'rgb(254 240 138)',
                              backdropFilter: 'blur(6px)',
                              WebkitBackdropFilter: 'blur(6px)',
                              background: 'linear-gradient(to right, rgb(133 77 14 / 0.5), rgb(180 83 9 / 0.3), rgb(133 77 14 / 0.5))',
                              border: '1px solid rgb(202 138 4 / 0.6)',
                              borderRadius: 9999,
                              padding: '2px 8px',
                              whiteSpace: 'nowrap' as const,
                              width: 'fit-content',
                            }}>
                              Avg: {avgUtil}%
                            </div>
                          </foreignObject>
                        </g>
                      );
                    }} />
                  );
                })()}
              </BarChart>
            </ResponsiveContainer>
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
