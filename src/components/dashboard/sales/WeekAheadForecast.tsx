import { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { formatCurrency as formatCurrencyPrecise } from '@/lib/format';
import { useWeekAheadRevenue, DayForecast } from '@/hooks/useWeekAheadRevenue';
import { useRealizationRate } from '@/hooks/useRealizationRate';
import { LocationSelect } from '@/components/ui/location-select';
import { DayAppointmentsPanel } from './DayAppointmentsPanel';
import { DayProviderBreakdownPanel } from './DayProviderBreakdownPanel';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { CalendarRange, TrendingUp, Calendar, Users, ChevronDown } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CategoryBreakdownPanel, BreakdownMode } from './CategoryBreakdownPanel';
import { ServiceMixLegend } from '@/components/dashboard/analytics/ServiceMixLegend';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import { isGradientMarker, getGradientFromMarker, getDarkCategoryStyle } from '@/utils/categoryColors';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { useForecastChartMode } from '@/hooks/useForecastChartMode';
import { Tabs, FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';

function resolveHexColor(colorHex: string): string {
  if (!isGradientMarker(colorHex)) return colorHex;
  const grad = getGradientFromMarker(colorHex);
  if (!grad) return '#888888';
  const match = grad.background.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : '#888888';
}
import { cn } from '@/lib/utils';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useLocations, isClosedOnDate } from '@/hooks/useLocations';
import { motion, useInView } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LabelList,
  Customized 
} from 'recharts';

// Label positioned above each bar for revenue
function AboveBarLabel({ x, y, width, value, ...rest }: any) {
  if (value === undefined || value === null || value === 0) return null;
  const isPeak = rest?.isPeak ?? rest?.payload?.isPeak;
  
  return (
    <g style={{ pointerEvents: 'none' }}>
      {isPeak && (
        <circle cx={x + width / 2} cy={y - 22} r={3} fill="hsl(var(--chart-2))" />
      )}
      <text
        x={x + width / 2}
        y={y - 8}
        textAnchor="middle"
        className={cn("text-xs tabular-nums", isPeak ? "fill-chart-2" : "fill-foreground")}
        style={{ fontWeight: isPeak ? 700 : 500 }}
      >
        {value >= 10000
          ? formatCurrencyPrecise(value, { compact: true, decimals: 2 })
          : formatCurrencyPrecise(value, { decimals: 0 })}
      </text>
    </g>
  );
}

// Custom X-axis tick to show day name and appointments under each bar
function CustomXAxisTick({ x, y, payload, days, peakDate, onDayClick, closedDates }: any) {
  const [isHovered, setIsHovered] = useState(false);
  const day = days.find((d: DayForecast) => d.dayName === payload.value);
  if (!day) return null;

  const isClosed = closedDates?.has(day.date);
  
  return (
    <g 
      transform={`translate(${x},${y})`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      <motion.g
        animate={{ scale: isHovered ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{ originX: 0.5, originY: 0 }}
      >
        <text 
          x={0} y={0} dy={12} 
          textAnchor="middle" 
          className="fill-foreground text-[11px]"
          style={{ fontWeight: 500 }}
        >
          {day.dayName}
        </text>
        {day.appointmentCount > 0 ? (
          <>
            <text 
              x={0} y={0} dy={26} 
              textAnchor="middle" 
              className="fill-primary text-[11px] cursor-pointer"
              style={{ 
                fontWeight: 500,
                textDecoration: isHovered ? 'underline' : 'none',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onDayClick(day);
              }}
            >
              {day.appointmentCount} appointment{day.appointmentCount !== 1 ? 's' : ''}
            </text>
            {isClosed && (
              <text x={0} dy={39} textAnchor="middle" className="fill-foreground text-[11px]" style={{ fontWeight: 500 }}>
                Closed
              </text>
            )}
          </>
        ) : isClosed ? (
          <text x={0} dy={26} textAnchor="middle" className="fill-foreground text-[11px]" style={{ fontWeight: 500 }}>
            Closed
          </text>
        ) : (
          <text 
            x={0} y={0} dy={26} 
            textAnchor="middle" 
            className="fill-primary text-[11px] cursor-pointer"
            style={{ 
              fontWeight: 500,
              textDecoration: isHovered ? 'underline' : 'none',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDayClick(day);
            }}
          >
            0 appointments
          </text>
        )}
      </motion.g>
    </g>
  );
}

// Custom tooltip showing category breakdown or solid total
function WeekAheadTooltip({ active, payload, label, days, colorMap, formatCurrency, chartMode }: any) {
  const { formatDate } = useFormatDate();
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const day = days?.find((d: DayForecast) => d.dayName === label);
  const displayLabel = day ? formatDate(day.date, 'EEEE, MMM d') : label;

  if (chartMode === 'solid') {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg min-w-[150px]">
        <p className="font-medium text-sm mb-2">{displayLabel}</p>
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium tabular-nums text-primary">{formatCurrency(data.totalRevenue || 0)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-xs mt-1">
          <span className="text-muted-foreground">Appointments</span>
          <span className="font-medium tabular-nums">{data.appointments || 0}</span>
        </div>
      </div>
    );
  }

  const categoryBreakdown: Record<string, number> = data._categoryBreakdown || {};
  const sorted = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a);

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg min-w-[180px]">
      <p className="font-medium text-sm mb-2">{displayLabel}</p>
      <div className="space-y-1.5">
        {sorted.map(([cat, rev]) => (
          <div key={cat} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: resolveHexColor(colorMap[cat.toLowerCase()]?.bg || '#888888') }} />
              <span className="text-muted-foreground">{cat}</span>
            </div>
            <span className="font-medium tabular-nums">{formatCurrency(rev)}</span>
          </div>
        ))}
        <div className="border-t border-border/50 my-1.5" />
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium tabular-nums text-primary">{formatCurrency(data.totalRevenue || 0)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Appointments</span>
          <span className="font-medium tabular-nums">{data.appointments || 0}</span>
        </div>
      </div>
    </div>
  );
}

export function WeekAheadForecast() {
  const { formatCurrencyWhole, formatCurrency, currency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<DayForecast | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedStatCard, setSelectedStatCard] = useState<BreakdownMode | null>(null);
  const [selectedBarDay, setSelectedBarDay] = useState<DayForecast | null>(null);
  const [viewMode, setViewMode] = useState<'scheduled' | 'predicted'>('scheduled');
  const { data, isLoading, error } = useWeekAheadRevenue(selectedLocation);
  const { realizationRate } = useRealizationRate(selectedLocation === 'all' ? undefined : selectedLocation);
  const { data: locations = [] } = useLocations();
  const { colorMap } = useServiceCategoryColorsMap();
  const { resolvedTheme } = useDashboardTheme();
  const isDark = resolvedTheme === 'dark';

  // Compute closed dates for the selected location
  const closedDates = useMemo(() => {
    const days = data?.days || [];
    if (!days.length || !locations.length) return new Set<string>();
    const closed = new Set<string>();
    if (selectedLocation === 'all') {
      // Mark closed only if EVERY location is closed on that day
      days.forEach(day => {
        const allClosed = locations.every(loc => 
          isClosedOnDate(loc.hours_json, loc.holiday_closures, parseISO(day.date)).isClosed
        );
        if (allClosed) closed.add(day.date);
      });
    } else {
      const loc = locations.find(l => l.id === selectedLocation);
      if (!loc) return closed;
      days.forEach(day => {
        if (isClosedOnDate(loc.hours_json, loc.holiday_closures, parseISO(day.date)).isClosed) {
          closed.add(day.date);
        }
      });
    }
    return closed;
  }, [selectedLocation, locations, data?.days]);
  const { mode: chartMode, setMode: setChartMode } = useForecastChartMode();
  
  const chartRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(chartRef, { once: true, amount: 0.3 });

  const handleDayClick = (day: DayForecast) => {
    setSelectedDay(day);
    setSheetOpen(true);
  };

  const handleStatCardClick = useCallback((mode: BreakdownMode) => {
    setSelectedStatCard(prev => prev === mode ? null : mode);
  }, []);

  const handleBarClick = useCallback((dayName: string) => {
    if (!data?.days) return;
    const day = data.days.find(d => d.dayName === dayName);
    if (!day) return;
    setSelectedBarDay(prev => prev?.date === day.date ? null : day);
  }, [data?.days]);

  const days = data?.days || [];
  const { totalRevenue = 0, totalAppointments = 0, peakDay = null, byCategory } = data || {};

  // Compute operating-day average (exclude closed days)
  const operatingDayCount = Math.max(days.length - closedDates.size, 1);
  const operatingDailyAvg = totalRevenue / operatingDayCount;

  // Realization-adjusted values
  // realizationRate comes from useRealizationRate above
  const hasRealization = realizationRate != null && realizationRate < 100 && realizationRate > 0;
  const realizationFactor = hasRealization ? realizationRate / 100 : 1;
  const isPredictedMode = viewMode === 'predicted' && hasRealization;
  const displayRevenue = isPredictedMode ? totalRevenue * realizationFactor : totalRevenue;
  const displayDailyAvg = isPredictedMode ? operatingDailyAvg * realizationFactor : operatingDailyAvg;

  // Compute all unique categories across days (must be before early returns)
  const allCategories = useMemo(() => {
    const catTotals: Record<string, number> = {};
    days.forEach(day => {
      Object.entries(day.categoryBreakdown).forEach(([c, v]) => {
        catTotals[c] = (catTotals[c] || 0) + v;
      });
    });
    return Object.entries(catTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([cat]) => cat);
  }, [days]);

  // Chart data with category breakdown flattened (must be before early returns)
  const chartData = useMemo(() => days.map(day => {
    const entry: Record<string, any> = {
      name: day.dayName,
      totalRevenue: day.revenue,
      appointments: day.appointmentCount,
      isPeak: peakDay?.date === day.date,
      date: day.date,
      _categoryBreakdown: day.categoryBreakdown,
    };
    allCategories.forEach(cat => {
      entry[cat] = day.categoryBreakdown[cat] || 0;
    });
    return entry;
  }), [days, peakDay, allCategories]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
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
          Unable to load week ahead forecast
        </CardContent>
      </Card>
    );
  }


  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-primary" />
              <CardTitle className="font-display text-base">Revenue Forecast</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <LocationSelect
                value={selectedLocation}
                onValueChange={setSelectedLocation}
                includeAll={true}
                allLabel="All Locations"
                triggerClassName="h-8 w-[180px] text-xs"
              />
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {totalAppointments} bookings
              </Badge>
            </div>
          </div>
          <CardDescription>Projected revenue from scheduled appointments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scheduled / Predicted toggle */}
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => v && setViewMode(v as 'scheduled' | 'predicted')}>
              <FilterTabsList>
                <FilterTabsTrigger value="scheduled">Scheduled</FilterTabsTrigger>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <FilterTabsTrigger value="predicted" disabled={!hasRealization}>
                        Predicted
                      </FilterTabsTrigger>
                    </span>
                  </TooltipTrigger>
                  {!hasRealization && (
                    <TooltipContent side="top" className="text-xs max-w-[220px]">
                      Insufficient historical data to calculate realization rate
                    </TooltipContent>
                  )}
                </UITooltip>
              </FilterTabsList>
            </Tabs>
            {isPredictedMode && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn(
                  "tabular-nums",
                  realizationRate! < 85 ? "text-amber-500" : "text-chart-2"
                )}>
                  {Math.round(realizationRate!)}% realization rate applied
                </span>
                <MetricInfoTooltip
                  description={`Over the last 30 days, ${Math.round(realizationRate!)}% of scheduled revenue was collected as actual POS revenue. Predicted values account for cancellations, no-shows, and pricing differences.`}
                />
              </span>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className={cn(
                "text-center p-3 bg-card-inner rounded-lg border cursor-pointer transition-all hover:-translate-y-0.5",
                selectedStatCard === 'revenue' ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/40'
              )}
              onClick={() => handleStatCardClick('revenue')}
            >
              <div className="flex justify-center mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <AnimatedBlurredAmount 
                value={displayRevenue}
                currency={currency}
                className="text-lg font-display tabular-nums"
              />
              <div className="flex items-center gap-1 justify-center">
                <p className="text-xs text-muted-foreground">
                  {isPredictedMode ? '7-Day Predicted' : '7-Day Total'}
                </p>
                <MetricInfoTooltip description={isPredictedMode
                  ? `Scheduled revenue adjusted by ${Math.round(realizationRate!)}% realization rate. Accounts for cancellations, no-shows, and pricing differences.`
                  : "Sum of projected revenue from all scheduled appointments over the next 7 days."
                } />
              </div>
              <ChevronDown className={cn('w-3 h-3 mx-auto mt-1 text-muted-foreground transition-transform', selectedStatCard === 'revenue' && 'rotate-180 text-primary')} />
            </div>
            <div
              className={cn(
                "text-center p-3 bg-card-inner rounded-lg border cursor-pointer transition-all hover:-translate-y-0.5",
                selectedStatCard === 'dailyAvg' ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/40'
              )}
              onClick={() => handleStatCardClick('dailyAvg')}
            >
              <div className="flex justify-center mb-1">
                <Calendar className="w-4 h-4 text-chart-2" />
              </div>
              <AnimatedBlurredAmount 
                value={Math.round(displayDailyAvg)}
                currency={currency}
                className="text-lg font-display tabular-nums"
              />
              <p className="text-xs text-muted-foreground">Daily Operating Avg</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5 leading-tight">Only counts days open</p>
              <ChevronDown className={cn('w-3 h-3 mx-auto mt-1 text-muted-foreground transition-transform', selectedStatCard === 'dailyAvg' && 'rotate-180 text-primary')} />
            </div>
            <div
              className={cn(
                "text-center p-3 bg-card-inner rounded-lg border cursor-pointer transition-all hover:-translate-y-0.5",
                selectedStatCard === 'count' ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/40'
              )}
              onClick={() => handleStatCardClick('count')}
            >
              <div className="flex justify-center mb-1">
                <Users className="w-4 h-4 text-chart-3" />
              </div>
              <span className="text-lg font-display tabular-nums">{totalAppointments}</span>
              <div className="flex items-center gap-1 justify-center">
                <p className="text-xs text-muted-foreground">Appointments</p>
                <MetricInfoTooltip description="Total count of scheduled appointments across the next 7 days." />
              </div>
              <ChevronDown className={cn('w-3 h-3 mx-auto mt-1 text-muted-foreground transition-transform', selectedStatCard === 'count' && 'rotate-180 text-primary')} />
            </div>
          </div>

          {/* Category Breakdown Panel */}
          {byCategory && (
            <CategoryBreakdownPanel
              data={byCategory}
              mode={selectedStatCard || 'revenue'}
              dayCount={7}
              isOpen={selectedStatCard !== null}
            />
          )}


          {/* Chart mode toggle + Bar Chart */}
          <div className="flex justify-end">
            <Tabs value={chartMode} onValueChange={(v) => v && setChartMode(v as 'category' | 'solid')}>
              <FilterTabsList>
                <FilterTabsTrigger value="category">By Category</FilterTabsTrigger>
                <FilterTabsTrigger value="solid">Solid</FilterTabsTrigger>
              </FilterTabsList>
            </Tabs>
          </div>
          <div className="h-[200px]" ref={chartRef}>
            {isInView ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 25, right: 5, bottom: 35, left: 10 }}
                >
                  <XAxis 
                    dataKey="name" 
                    tick={<CustomXAxisTick days={days} peakDate={peakDay?.date} onDayClick={handleDayClick} closedDates={closedDates} />}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    height={40}
                  />
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip
                    content={<WeekAheadTooltip days={days} colorMap={colorMap} formatCurrency={formatCurrency} chartMode={chartMode} />}
                    cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}
                  />
                  {/* SVG gradient defs for solid glass bars */}
                  <Customized component={() => (
                    <defs>
                      <linearGradient id="solid-glass-week" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.18} />
                      </linearGradient>
                    </defs>
                  )} />
                  {/* Conditional: solid single bar or stacked category bars */}
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
                          const day = days.find((d: DayForecast) => d.dayName === entry.name);
                          if (!day || !closedDates.has(day.date)) return null;
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
                  {chartMode === 'solid' ? (
                    <Bar
                      dataKey="totalRevenue"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={800}
                      animationEasing="ease-out"
                      onClick={(data: any) => handleBarClick(data.name)}
                      cursor="pointer"
                      fill="url(#solid-glass-week)"
                    >
                      <LabelList 
                        dataKey="totalRevenue"
                        content={AboveBarLabel}
                      />
                      {chartData.map((entry, index) => {
                        const isSelected = selectedBarDay?.dayName === entry.name;
                        return (
                          <Cell
                            key={`solid-${index}`}
                            fill="url(#solid-glass-week)"
                            stroke={isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--foreground) / 0.12)'}
                            strokeOpacity={isSelected ? 1 : 1}
                            strokeWidth={isSelected ? 1.5 : 1}
                          />
                        );
                      })}
                    </Bar>
                  ) : (
                    allCategories.map((cat, catIndex) => {
                      const isTopBar = catIndex === allCategories.length - 1;
                      const solidColor = resolveHexColor(colorMap[cat.toLowerCase()]?.bg || '#888888');
                      const darkStyle = isDark ? getDarkCategoryStyle(solidColor) : null;
                      const barFill = isDark ? darkStyle!.fill : solidColor;
                      const barStroke = isDark ? darkStyle!.stroke : solidColor;
                      return (
                        <Bar
                          key={cat}
                          dataKey={cat}
                          stackId="revenue"
                          radius={isTopBar ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={800}
                          animationEasing="ease-out"
                          onClick={(data: any) => handleBarClick(data.name)}
                          cursor="pointer"
                          fill={barFill}
                        >
                          {isTopBar && (
                            <LabelList 
                              dataKey="totalRevenue"
                              content={AboveBarLabel}
                            />
                          )}
                          {chartData.map((entry, index) => {
                            const isSelected = selectedBarDay?.dayName === entry.name;
                            return (
                              <Cell
                                key={`${cat}-${index}`}
                                fill={barFill}
                                stroke={isSelected ? 'hsl(var(--foreground))' : barStroke}
                                strokeOpacity={isSelected ? 1 : 0.2}
                                strokeWidth={isSelected ? 1.5 : 0.5}
                              />
                            );
                          })}
                        </Bar>
                      );
                    })
                  )}
                  {operatingDailyAvg > 0 && (
                    <Customized component={(props: any) => {
                      const { yAxisMap, xAxisMap } = props;
                      if (!yAxisMap?.[0]?.scale || !xAxisMap?.[0]) return null;
                      const yPos = yAxisMap[0].scale(operatingDailyAvg);
                      const chartLeft = xAxisMap[0].x;
                      const chartRight = chartLeft + xAxisMap[0].width;
                      if (typeof yPos !== 'number' || isNaN(yPos)) return null;
                      const badgeWidth = 180;
                      return (
                      <g style={{ pointerEvents: 'none' }}>
                          <style>{`
                            @keyframes drawLine { to { stroke-dashoffset: 0; } }
                            @keyframes fadeInBadge { from { opacity: 0; } to { opacity: 1; } }
                          `}</style>
                          <foreignObject x={chartLeft} y={yPos - 14} width={badgeWidth} height={24} style={{ animation: 'fadeInBadge 0.5s ease-out 0.6s forwards', opacity: 0 }}>
                            <div style={{ 
                              fontSize: 11, fontWeight: 500, 
                              color: isDark ? 'rgb(254 240 138)' : 'hsl(35 70% 30%)',
                              backdropFilter: 'blur(6px)',
                              WebkitBackdropFilter: 'blur(6px)',
                              background: isDark
                                ? 'linear-gradient(to right, rgb(133 77 14 / 0.5), rgb(180 83 9 / 0.3), rgb(133 77 14 / 0.5))'
                                : 'hsl(40 40% 94% / 0.85)',
                              border: isDark ? '1px solid rgb(202 138 4 / 0.6)' : '1px solid hsl(35 60% 60% / 0.5)',
                              borderRadius: 9999,
                              padding: '1px 8px',
                              whiteSpace: 'nowrap',
                              width: 'fit-content',
                            }}>
                              Daily Operating Avg: {formatCurrencyWhole(Math.round(operatingDailyAvg))}
                            </div>
                          </foreignObject>
                          {(() => {
                            const lineStart = chartLeft + badgeWidth + 4;
                            const lineLength = chartRight - lineStart;
                            return (
                              <>
                                {/* Background halo for visibility over bars */}
                                <line
                                  x1={lineStart}
                                  y1={yPos}
                                  x2={chartRight}
                                  y2={yPos}
                                  stroke="hsl(var(--background))"
                                  strokeWidth={5}
                                  strokeOpacity={0.85}
                                />
                                {/* Dashed reference line */}
                                <line
                                  x1={lineStart}
                                  y1={yPos}
                                  x2={chartRight}
                                  y2={yPos}
                                  stroke={isDark ? 'rgb(202 138 4)' : 'hsl(35 60% 55% / 0.4)'}
                                  strokeDasharray={lineLength}
                                  strokeDashoffset={lineLength}
                                  strokeWidth={1}
                                  style={{ animation: 'drawLine 1s ease-out 0.8s forwards' }}
                                />
                              </>
                            );
                          })()}
                        </g>
                      );
                    }} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full" />
            )}
          </div>

          {/* Service Mix Legend - shown in category mode */}
          {chartMode === 'category' && byCategory && Object.keys(byCategory).length > 0 && (
            <ServiceMixLegend byCategory={byCategory} />
          )}

          {/* Provider Breakdown Drill-Down */}
          <DayProviderBreakdownPanel
            day={selectedBarDay}
            open={selectedBarDay !== null}
            onOpenChange={(open) => { if (!open) setSelectedBarDay(null); }}
          />

          <p className="text-[11px] text-muted-foreground/40 italic pt-2">
            *Daily Operating Average only counts days open
          </p>
          {/* Peak Day Callout */}
          {peakDay && peakDay.revenue > 0 && (
            <div className="flex items-center justify-between p-2 bg-chart-2/10 rounded-lg text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-chart-2" />
                Peak day (next 7 days): <span className="font-medium text-foreground">{formatDate(parseISO(peakDay.date), 'EEEE, MMM d')}</span>
              </span>
              <span className="font-display text-chart-2">
                <BlurredAmount>{formatCurrencyWhole(peakDay.revenue)}</BlurredAmount>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <DayAppointmentsPanel 
        day={selectedDay}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
