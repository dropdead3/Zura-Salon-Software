import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from '@/components/ui/chart-skeleton';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  formatCurrency as formatCurrencyUtil,
  formatCurrencyWhole as formatCurrencyWholeUtil,
} from '@/lib/formatCurrency';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  MapPin,
  Minus,
  Activity,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSalesTrend } from '@/hooks/useSalesData';
import {
  useMonthlyForecast,
  type Scenario,
  type ForecastHorizon,
  type MonthlyDataPoint,
} from '@/hooks/useGrowthForecast';
import { subDays, subYears, differenceInDays, format, parseISO, startOfMonth, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

type MetricKey = 'revenue' | 'appointments';
type ComparisonMode = 'mom' | 'yoy';
type ChartType = 'area' | 'bar';
type ViewMode = 'historical' | 'forecast';

const CHART_TYPE_KEY = 'exec-trend-chart-type';
const TREND_RANGE_KEY = 'exec-trend-range';
const VIEW_MODE_KEY = 'exec-trend-view-mode';
const FORECAST_HORIZON_KEY = 'exec-trend-forecast-horizon';

const HORIZONS: { key: ForecastHorizon; label: string }[] = [
  { key: 3, label: '3M' },
  { key: 6, label: '6M' },
  { key: 12, label: '12M' },
];

const SCENARIOS: { key: Scenario; label: string }[] = [
  { key: 'conservative', label: 'Conservative' },
  { key: 'baseline', label: 'Baseline' },
  { key: 'optimistic', label: 'Optimistic' },
];

type TrendRange = '7d' | '30d' | '90d' | 'mtd' | 'ytd';

const RANGES: { key: TrendRange; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'mtd', label: 'MTD' },
  { key: 'ytd', label: 'YTD' },
];

interface ChartPoint {
  dayLabel: string;
  priorDayLabel: string;
  current: number;
  prior: number;
  currentDate: string;
  priorDate: string;
}

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'appointments', label: 'Appointments' },
];

// Format a date range as "MMM d - MMM d, yyyy"
function formatDateRange(from: string, to: string): string {
  const f = parseISO(from);
  const t = parseISO(to);
  const sameMonth = f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear();
  if (sameMonth) {
    return `${format(f, 'MMM d')} \u2013 ${format(t, 'd, yyyy')}`;
  }
  const sameYear = f.getFullYear() === t.getFullYear();
  if (sameYear) {
    return `${format(f, 'MMM d')} \u2013 ${format(t, 'MMM d, yyyy')}`;
  }
  return `${format(f, 'MMM d, yyyy')} \u2013 ${format(t, 'MMM d, yyyy')}`;
}

export function ExecutiveTrendChart() {
  const [metric, setMetric] = useState<MetricKey>('revenue');
  const [comparison, setComparison] = useState<ComparisonMode>('mom');
  const [chartType, setChartType] = useState<ChartType>(() => {
    const stored = localStorage.getItem(CHART_TYPE_KEY);
    return stored === 'bar' ? 'bar' : 'area';
  });
  const [range, setRange] = useState<TrendRange>(() => {
    const stored = localStorage.getItem(TREND_RANGE_KEY);
    return RANGES.some(r => r.key === stored) ? (stored as TrendRange) : '30d';
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'historical'; } catch { return 'historical'; }
  });
  const [horizon, setHorizon] = useState<ForecastHorizon>(() => {
    try {
      const v = localStorage.getItem(FORECAST_HORIZON_KEY);
      return v ? (Number(v) as ForecastHorizon) : 12;
    } catch { return 12; }
  });
  const [scenario, setScenario] = useState<Scenario>('baseline');
  const { formatCurrencyWhole } = useFormatCurrency();

  // Location access
  const { accessibleLocations, canViewAggregate, defaultLocationId, isLoading: locAccessLoading } = useUserLocationAccess();
  const [locationId, setLocationId] = useState('');
  const showLocationSelector = accessibleLocations.length > 1;

  useEffect(() => {
    if (!locationId && defaultLocationId) setLocationId(defaultLocationId);
  }, [defaultLocationId, locationId]);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem(CHART_TYPE_KEY, chartType);
  }, [chartType]);
  useEffect(() => {
    localStorage.setItem(TREND_RANGE_KEY, range);
  }, [range]);
  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch {}
  }, [viewMode]);
  useEffect(() => {
    try { localStorage.setItem(FORECAST_HORIZON_KEY, String(horizon)); } catch {}
  }, [horizon]);

  // Compute date range from selected range
  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    const to = format(now, 'yyyy-MM-dd');
    switch (range) {
      case '7d':  return { dateFrom: format(subDays(now, 6), 'yyyy-MM-dd'), dateTo: to };
      case '30d': return { dateFrom: format(subDays(now, 29), 'yyyy-MM-dd'), dateTo: to };
      case '90d': return { dateFrom: format(subDays(now, 89), 'yyyy-MM-dd'), dateTo: to };
      case 'mtd': return { dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'), dateTo: to };
      case 'ytd': return { dateFrom: format(startOfYear(now), 'yyyy-MM-dd'), dateTo: to };
    }
  }, [range]);

  const locFilter = locationId === 'all' ? undefined : locationId;

  // Dynamic comparison label based on selected range
  const priorLabel = useMemo(() => {
    switch (range) {
      case '7d':  return 'WoW';
      case '30d': return 'MoM';
      case '90d': return 'QoQ';
      default:    return 'Prior';
    }
  }, [range]);

  // Calculate prior period dates
  const { priorFrom, priorTo } = useMemo(() => {
    const from = parseISO(dateFrom);
    const to = parseISO(dateTo);
    const daySpan = differenceInDays(to, from);

    if (comparison === 'yoy') {
      return {
        priorFrom: format(subYears(from, 1), 'yyyy-MM-dd'),
        priorTo: format(subYears(to, 1), 'yyyy-MM-dd'),
      };
    }
    // MoM: shift back by the same number of days
    return {
      priorFrom: format(subDays(from, daySpan + 1), 'yyyy-MM-dd'),
      priorTo: format(subDays(from, 1), 'yyyy-MM-dd'),
    };
  }, [dateFrom, dateTo, comparison]);

  // Human-readable period labels
  const currentRangeLabel = formatDateRange(dateFrom, dateTo);
  const priorRangeLabel = formatDateRange(priorFrom, priorTo);

  // Fetch current and prior period data
  const { data: currentData, isLoading: currentLoading } = useSalesTrend(
    dateFrom,
    dateTo,
    locFilter
  );
  const { data: priorData, isLoading: priorLoading } = useSalesTrend(
    priorFrom,
    priorTo,
    locFilter
  );

  // Build overlay chart data
  const { chartData, currentTotal, priorTotal, pctChange } = useMemo(() => {
    const currentDays = currentData?.overall ?? [];
    const priorDays = priorData?.overall ?? [];

    const dataKey = metric === 'revenue' ? 'revenue' : 'transactions';

    // Align by day index (Day 1, Day 2, etc.)
    const maxLen = Math.max(currentDays.length, priorDays.length);
    const points: ChartPoint[] = [];

    let curTotal = 0;
    let priTotal = 0;

    for (let i = 0; i < maxLen; i++) {
      const curVal = i < currentDays.length ? (currentDays[i][dataKey] ?? 0) : 0;
      const priVal = i < priorDays.length ? (priorDays[i][dataKey] ?? 0) : 0;
      curTotal += curVal;
      priTotal += priVal;

      // Current and prior period dates for tooltip
      const curDate =
        i < currentDays.length && currentDays[i].date
          ? currentDays[i].date
          : '';
      const priDate =
        i < priorDays.length && priorDays[i].date
          ? priorDays[i].date
          : '';
      const label = curDate ? format(parseISO(curDate), 'MMM d') : `Day ${i + 1}`;

      points.push({
        dayLabel: label,
        priorDayLabel: priDate ? format(parseISO(priDate), 'MMM d') : '',
        current: curVal,
        prior: priVal,
        currentDate: curDate ? format(parseISO(curDate), 'EEE, MMM d') : '',
        priorDate: priDate ? format(parseISO(priDate), 'EEE, MMM d') : '',
      });
    }

    const change =
      priTotal > 0 ? ((curTotal - priTotal) / priTotal) * 100 : curTotal > 0 ? 100 : 0;

    return {
      chartData: points,
      currentTotal: curTotal,
      priorTotal: priTotal,
      pctChange: change,
    };
  }, [currentData, priorData, metric]);

  const isRevenue = metric === 'revenue';
  const metricLabel = isRevenue ? 'Revenue' : 'Appointments';

  const dayCount = chartData.length || 1;
  const currentDailyAvg = currentTotal / dayCount;
  const priorDailyAvg = priorTotal / dayCount;

  const formatValue = (v: number) =>
    isRevenue ? formatCurrencyWhole(v) : v.toLocaleString();
  const formatAxisTick = (v: number) =>
    isRevenue
      ? v >= 1000
        ? formatCurrencyWholeUtil(v / 1000) + 'k'
        : formatCurrencyWholeUtil(v)
      : v.toLocaleString();
  const formatTooltipVal = (v: number) =>
    isRevenue ? formatCurrencyUtil(v) : v.toLocaleString();

  // ── Forecast data ──────────────────────────────────────────────
  const { data: forecastData, isLoading: forecastLoading } = useMonthlyForecast(
    locFilter,
    horizon
  );

  const isLoading = viewMode === 'historical'
    ? (currentLoading || priorLoading)
    : forecastLoading;

  const forecastChartData = useMemo(() => {
    if (!forecastData) return [];
    const actuals = forecastData.monthlyActuals || [];
    const projected = forecastData.monthlyScenarios?.[scenario] || [];
    const getValue = (d: MonthlyDataPoint) => metric === 'revenue' ? d.revenue : d.appointments;
    const getConfLower = (d: MonthlyDataPoint) =>
      metric === 'revenue' ? (d.confidenceLower ?? d.revenue) : (d.appointmentsLower ?? d.appointments);
    const getConfUpper = (d: MonthlyDataPoint) =>
      metric === 'revenue' ? (d.confidenceUpper ?? d.revenue) : (d.appointmentsUpper ?? d.appointments);

    const recentActuals = actuals.slice(-6);
    const points: any[] = [];

    recentActuals.forEach((d) => {
      points.push({
        label: d.period,
        actual: getValue(d),
        projected: null,
        confLower: null,
        confUpper: null,
        type: 'actual',
      });
    });

    // Bridge point
    if (recentActuals.length > 0 && projected.length > 0) {
      const last = recentActuals[recentActuals.length - 1];
      points[points.length - 1] = {
        ...points[points.length - 1],
        projected: getValue(last),
        confLower: getValue(last),
        confUpper: getValue(last),
        type: 'bridge',
      };
    }

    projected.forEach((d) => {
      points.push({
        label: d.period,
        actual: null,
        projected: getValue(d),
        confLower: getConfLower(d),
        confUpper: getConfUpper(d),
        type: 'projected',
      });
    });

    return points;
  }, [forecastData, scenario, metric]);

  const forecastSummary = useMemo(() => {
    if (!forecastData?.summary) return null;
    const s = forecastData.summary;
    const hSuffix = horizon === 3 ? '3m' : horizon === 6 ? '6m' : '12m';
    const revKey = `projectedRevenue${hSuffix}` as keyof typeof s;
    const aptKey = `projectedAppointments${hSuffix}` as keyof typeof s;
    const scenarioMult = scenario === 'conservative' ? 0.85 : scenario === 'optimistic' ? 1.15 : 1;
    const baseRev = (s[revKey] as number) * scenarioMult;
    const baseApt = (s[aptKey] as number) * scenarioMult;
    return {
      revenue: Math.round(baseRev * 100) / 100,
      revenueLower: Math.round(baseRev * 0.85 * 100) / 100,
      revenueUpper: Math.round(baseRev * 1.15 * 100) / 100,
      appointments: Math.round(baseApt),
      appointmentsLower: Math.round(baseApt * 0.85),
      appointmentsUpper: Math.round(baseApt * 1.15),
      momentum: s.momentum,
      momGrowth: s.lastMoMGrowth,
      yoyGrowth: s.yoyGrowth,
      monthsAvailable: s.monthsAvailable,
      trendFit: s.revenueTrendR2,
    };
  }, [forecastData, horizon, scenario]);

  const [insightsOpen, setInsightsOpen] = useState(false);
  const forecastInsights = forecastData?.insights || [];

  const formatForecastYAxis = useCallback(
    (v: number) => isRevenue ? (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`) : `${v}`,
    [isRevenue]
  );

  const formatForecastValue = useCallback(
    (v: number) => isRevenue ? (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`) : v.toLocaleString(),
    [isRevenue]
  );

  const fmtCurrency = useCallback(
    (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`,
    []
  );

  // Custom tooltip with both period dates
  const renderTooltip = useCallback(
    ({ active, payload }: any) => {
      if (!active || !payload?.length) return null;
      const point = payload[0]?.payload as ChartPoint | undefined;
      if (!point) return null;

      const curVal = point.current;
      const priVal = point.prior;
      const delta = priVal > 0 ? ((curVal - priVal) / priVal) * 100 : 0;

      return (
        <div
          className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg"
          style={{ minWidth: 180 }}
        >
          {/* Current period */}
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-[3px] rounded-full bg-primary shrink-0" />
            <span className="text-[11px] text-muted-foreground">
              {point.currentDate || 'Current'}
            </span>
          </div>
          <p className="font-display text-sm tabular-nums pl-5 mb-2">
            {formatTooltipVal(curVal)}
          </p>

          {/* Prior period */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-[3px] shrink-0"
              style={{
                background:
                  'repeating-linear-gradient(to right, hsl(var(--muted-foreground)) 0 3px, transparent 3px 5px)',
              }}
            />
            <span className="text-[11px] text-muted-foreground">
              {point.priorDate || 'Prior'}
            </span>
          </div>
          <p className="font-display text-sm tabular-nums pl-5 mb-2">
            {formatTooltipVal(priVal)}
          </p>

          {/* Delta */}
          {priVal > 0 && (
            <div className="pt-1.5 border-t border-border/50 flex items-center gap-1">
              {delta === 0 ? (
                <span className="text-[11px] font-display tabular-nums text-muted-foreground">
                  0.0% vs prior
                </span>
              ) : delta > 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 text-chart-2" />
                  <span className="text-[11px] font-display tabular-nums text-chart-2">
                    +{delta.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-0.5">
                    vs prior
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3 h-3 text-destructive" />
                  <span className="text-[11px] font-display tabular-nums text-destructive">
                    {delta.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-0.5">
                    vs prior
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      );
    },
    [formatTooltipVal]
  );

  // Shared chart components (axes, grid, tooltip)
  const sharedXAxis = (
    <XAxis
      dataKey="dayLabel"
      tick={(props: any) => {
        const { x, y, payload, index } = props;
        const point = chartData[index];
        return (
          <g transform={`translate(${x},${y})`}>
            <text
              dy={12}
              textAnchor="middle"
              fontSize={10}
              fill="hsl(var(--muted-foreground))"
            >
              {payload.value}
            </text>
            {point?.priorDayLabel && (
              <text
                dy={24}
                textAnchor="middle"
                fontSize={9}
                fill="hsl(var(--muted-foreground))"
                opacity={0.5}
              >
                {point.priorDayLabel}
              </text>
            )}
          </g>
        );
      }}
      tickLine={false}
      axisLine={false}
      interval="preserveStartEnd"
      height={40}
    />
  );

  const sharedYAxis = (
    <YAxis
      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
      tickLine={false}
      axisLine={false}
      tickFormatter={formatAxisTick}
      width={50}
    />
  );

  const sharedGrid = (
    <CartesianGrid
      strokeDasharray="3 3"
      vertical={false}
      stroke="hsl(var(--border))"
      strokeOpacity={0.5}
    />
  );

  const sharedTooltip = (
    <Tooltip
      content={renderTooltip}
      cursor={
        chartType === 'bar'
          ? { fill: 'hsl(var(--muted))', fillOpacity: 0.3 }
          : { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }
      }
    />
  );

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-48" />
          </div>
          <ChartSkeleton lines={6} className="h-[220px]" />
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        {/* Header: title + controls */}
        <div className="space-y-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg shrink-0">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm tracking-wide text-muted-foreground uppercase">
                Trend Analysis
              </h3>
              <MetricInfoTooltip description="Visualizes revenue or appointment trends over time. Historical data comes from daily sales summaries. Forecast mode uses seasonal-adjusted linear regression to project future values." />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Metric pills */}
            <div className="flex items-center gap-1 rounded-[10px] border border-border/50 p-1">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={cn(
                    'px-3 py-1 rounded-[6px] font-sans text-xs transition-colors duration-150',
                    metric === m.key
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 rounded-[10px] border border-border/50 p-1">
              <button
                onClick={() => setViewMode('historical')}
                className={cn(
                  'px-3 py-1 rounded-[6px] font-sans text-xs transition-colors duration-150',
                  viewMode === 'historical'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Historical
              </button>
              <button
                onClick={() => setViewMode('forecast')}
                className={cn(
                  'px-3 py-1 rounded-[6px] font-sans text-xs transition-colors duration-150',
                  viewMode === 'forecast'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Forecast
              </button>
            </div>

            {/* Historical-only controls */}
            {viewMode === 'historical' && (
              <>
                {/* Comparison toggle */}
                <div className="flex items-center gap-1 rounded-[10px] border border-border/50 p-1">
                  <button
                    onClick={() => setComparison('mom')}
                    className={cn(
                      'px-3 py-1 rounded-[6px] font-sans text-xs transition-colors duration-150',
                      comparison === 'mom'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {priorLabel}
                  </button>
                  <button
                    onClick={() => setComparison('yoy')}
                    className={cn(
                      'px-3 py-1 rounded-[6px] font-sans text-xs transition-colors duration-150',
                      comparison === 'yoy'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    YoY
                  </button>
                </div>

                {/* Chart type toggle */}
                <div className="flex items-center gap-1 rounded-[10px] border border-border/50 p-1">
                  <button
                    onClick={() => setChartType('area')}
                    title="Line chart"
                    className={cn(
                      'p-1.5 rounded-[6px] transition-colors duration-150',
                      chartType === 'area'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <LineChart className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setChartType('bar')}
                    title="Bar chart"
                    className={cn(
                      'p-1.5 rounded-[6px] transition-colors duration-150',
                      chartType === 'bar'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Range pills */}
                <div className="flex items-center gap-1 rounded-[10px] border border-border/50 p-1">
                  {RANGES.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setRange(r.key)}
                      className={cn(
                        'px-2.5 py-1 rounded-[6px] font-sans text-xs transition-colors duration-150',
                        range === r.key
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Forecast-only controls */}
            {viewMode === 'forecast' && (
              <>
                {/* Horizon pills */}
                <div className="flex items-center gap-1 rounded-[10px] border border-border/50 p-1">
                  {HORIZONS.map((h) => (
                    <button
                      key={h.key}
                      onClick={() => setHorizon(h.key)}
                      className={cn(
                        'px-2.5 py-1 rounded-[6px] font-sans text-xs transition-colors duration-150',
                        horizon === h.key
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>

                {/* Scenario toggle */}
                <div className="flex items-center gap-1 rounded-[10px] border border-border/50 p-1">
                  {SCENARIOS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setScenario(s.key)}
                      className={cn(
                        'px-2.5 py-1 rounded-[6px] font-sans text-xs transition-colors duration-150',
                        scenario === s.key
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Location selector */}
            {showLocationSelector && (
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="h-7 w-auto min-w-[120px] max-w-[180px] rounded-[10px] border-border/50 font-sans text-xs px-2.5 gap-1.5">
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canViewAggregate && (
                    <SelectItem value="all">All Locations</SelectItem>
                  )}
                  {accessibleLocations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {viewMode === 'historical' ? (
        <>
        {/* Legend / Key with date ranges */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-1 mb-4 pl-1">
          <div className="flex items-center gap-2">
            {chartType === 'area' ? (
              <span className="w-5 h-[2.5px] rounded-full bg-primary shrink-0" />
            ) : (
              <span className="w-3 h-3 rounded-[3px] bg-primary shrink-0" />
            )}
            <span className="text-[11px] text-foreground/80">
              Current
            </span>
            <span className="text-[11px] text-muted-foreground">
              {currentRangeLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {chartType === 'area' ? (
              <span
                className="w-5 h-[2.5px] shrink-0"
                style={{
                  background:
                    'repeating-linear-gradient(to right, hsl(var(--muted-foreground)) 0 4px, transparent 4px 7px)',
                }}
              />
            ) : (
              <span className="w-3 h-3 rounded-[3px] shrink-0" style={{ backgroundColor: 'hsl(var(--muted-foreground))', opacity: 0.35 }} />
            )}
            <span className="text-[11px] text-foreground/80">
              {comparison === 'yoy' ? 'Year Ago' : priorLabel}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {priorRangeLabel}
            </span>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData} barGap={2} barCategoryGap="20%">
                  {sharedGrid}
                  {sharedXAxis}
                  {sharedYAxis}
                  {sharedTooltip}
                  <Bar
                    dataKey="prior"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.35}
                    radius={[4, 4, 0, 0]}
                    animationDuration={300}
                    animationEasing="ease-in-out"
                  />
                  <Bar
                    dataKey="current"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    animationDuration={300}
                    animationEasing="ease-in-out"
                  />
                </BarChart>
              ) : (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="execTrendCurrentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  {sharedGrid}
                  {sharedXAxis}
                  {sharedYAxis}
                  {sharedTooltip}
                  {/* Prior period - dashed */}
                  <Area
                    type="monotone"
                    dataKey="prior"
                    stroke="hsl(var(--muted-foreground))"
                    fill="hsl(var(--muted))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fillOpacity={0.12}
                    animationDuration={300}
                    animationEasing="ease-in-out"
                  />
                  {/* Current period - solid with gradient */}
                  <Area
                    type="monotone"
                    dataKey="current"
                    stroke="hsl(var(--primary))"
                    fill="url(#execTrendCurrentGrad)"
                    strokeWidth={2}
                    fillOpacity={1}
                    animationDuration={300}
                    animationEasing="ease-in-out"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            No data available for the selected period.
          </div>
        )}

        {/* Summary row with date ranges */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/40">
          <div className="text-center">
            <p className="font-display text-[10px] tracking-wide text-muted-foreground uppercase mb-0.5">
              Current {metricLabel}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mb-1">
              {currentRangeLabel}
            </p>
            <p className="font-display text-base tabular-nums">
              {isRevenue ? (
                <BlurredAmount>{formatValue(currentTotal)}</BlurredAmount>
              ) : (
                formatValue(currentTotal)
              )}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {formatValue(currentDailyAvg)} / day
            </p>
          </div>
          <div className="text-center">
            <p className="font-display text-[10px] tracking-wide text-muted-foreground uppercase mb-0.5">
              Prior {metricLabel}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mb-1">
              {priorRangeLabel}
            </p>
            <p className="font-display text-base tabular-nums">
              {isRevenue ? (
                <BlurredAmount>{formatValue(priorTotal)}</BlurredAmount>
              ) : (
                formatValue(priorTotal)
              )}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {formatValue(priorDailyAvg)} / day
            </p>
          </div>
          <div className="text-center">
            <p className="font-display text-[10px] tracking-wide text-muted-foreground uppercase mb-0.5">
              Change
            </p>
            <p className="text-[10px] text-muted-foreground/60 mb-1">
              {comparison === 'yoy' ? 'Year over year' : `${priorLabel} comparison`}
            </p>
            <div className="flex items-center justify-center gap-1">
              {pctChange === 0 ? (
                <p className="font-display text-base tabular-nums text-muted-foreground">
                  0.0%
                </p>
              ) : pctChange > 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-chart-2" />
                  <p className="font-display text-base tabular-nums text-chart-2">
                    +{pctChange.toFixed(1)}%
                  </p>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                  <p className="font-display text-base tabular-nums text-destructive">
                    {pctChange.toFixed(1)}%
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
        </>
        ) : (
        /* ── Forecast view ──────────────────────────────────────── */
        <>
          {forecastChartData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
              <div className="text-center space-y-2">
                <TrendingUp className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p>Not enough historical data for projections yet</p>
              </div>
            </div>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastChartData}>
                  <defs>
                    <linearGradient id="fcActualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fcProjectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fcConfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={formatForecastYAxis}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      const val = d.actual ?? d.projected ?? 0;
                      const isProjected = d.type === 'projected';
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg min-w-[160px]">
                          <p className="font-medium text-sm mb-1">{d.label}</p>
                          <p className="text-sm tabular-nums font-medium">{formatForecastValue(val)}</p>
                          {isProjected && d.confLower != null && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Range: {formatForecastValue(d.confLower)} &ndash; {formatForecastValue(d.confUpper)}
                            </p>
                          )}
                          <span className={cn(
                            'inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full',
                            isProjected ? 'bg-chart-2/10 text-chart-2' : 'bg-primary/10 text-primary'
                          )}>
                            {isProjected ? 'Projected' : 'Actual'}
                          </span>
                        </div>
                      );
                    }}
                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  {/* Confidence band */}
                  <Area type="monotone" dataKey="confUpper" stroke="none" fill="url(#fcConfGrad)" connectNulls={false} animationDuration={300} />
                  <Area type="monotone" dataKey="confLower" stroke="none" fill="hsl(var(--background))" connectNulls={false} animationDuration={300} />
                  {/* Actual line */}
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="hsl(var(--primary))"
                    fill="url(#fcActualGrad)"
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                    animationDuration={300}
                  />
                  {/* Projected line (dashed) */}
                  <Area
                    type="monotone"
                    dataKey="projected"
                    stroke="hsl(var(--chart-2))"
                    fill="url(#fcProjectedGrad)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    connectNulls={false}
                    dot={{ r: 3, fill: 'hsl(var(--chart-2))', strokeWidth: 0 }}
                    animationDuration={300}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Enhanced forecast summary */}
          <div className="mt-4 pt-4 border-t border-border/40 space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-[2.5px] rounded-full bg-primary" />
                <span>Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-[2.5px] rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(90deg, hsl(var(--chart-2)) 0, hsl(var(--chart-2)) 4px, transparent 4px, transparent 8px)' }} />
                <span>Projected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-chart-2/10 border border-chart-2/20" />
                <span>Range</span>
              </div>
            </div>

            {forecastSummary && (
            <>
              {/* Dual-metric KPI row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Revenue KPI */}
                <div className="rounded-lg border border-border/50 p-3.5 bg-card/50">
                  <p className="font-display text-[10px] tracking-wide text-muted-foreground uppercase mb-1.5">
                    Projected Revenue ({horizon}M)
                  </p>
                  <p className="font-display text-lg tabular-nums">
                    <BlurredAmount>{fmtCurrency(forecastSummary.revenue)}</BlurredAmount>
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 tabular-nums">
                    Range: {fmtCurrency(forecastSummary.revenueLower)} &ndash; {fmtCurrency(forecastSummary.revenueUpper)}
                  </p>
                  {forecastSummary.momGrowth !== null && (
                    <div className={cn(
                      'flex items-center gap-1 mt-1.5 text-[11px] font-medium',
                      (forecastSummary.momGrowth ?? 0) >= 0 ? 'text-chart-2' : 'text-destructive'
                    )}>
                      {(forecastSummary.momGrowth ?? 0) >= 0
                        ? <TrendingUp className="w-3 h-3" />
                        : <TrendingDown className="w-3 h-3" />}
                      <span>{(forecastSummary.momGrowth ?? 0) >= 0 ? '+' : ''}{(forecastSummary.momGrowth ?? 0).toFixed(1)}% MoM</span>
                    </div>
                  )}
                </div>

                {/* Appointments KPI */}
                <div className="rounded-lg border border-border/50 p-3.5 bg-card/50">
                  <p className="font-display text-[10px] tracking-wide text-muted-foreground uppercase mb-1.5">
                    Projected Appointments ({horizon}M)
                  </p>
                  <p className="font-display text-lg tabular-nums">
                    {forecastSummary.appointments.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 tabular-nums">
                    Range: {forecastSummary.appointmentsLower.toLocaleString()} &ndash; {forecastSummary.appointmentsUpper.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                    ~{Math.round(forecastSummary.appointments / horizon).toLocaleString()} / month avg
                  </p>
                </div>
              </div>

              {/* Momentum + YoY + Data depth row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Momentum badge */}
                <div className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 bg-card/50">
                  {forecastSummary.momentum === 'accelerating'
                    ? <TrendingUp className="w-3.5 h-3.5 text-chart-2" />
                    : forecastSummary.momentum === 'decelerating'
                    ? <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                    : <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span className={cn(
                    'text-xs font-medium capitalize',
                    forecastSummary.momentum === 'accelerating' ? 'text-chart-2' :
                    forecastSummary.momentum === 'decelerating' ? 'text-destructive' :
                    'text-muted-foreground'
                  )}>
                    {forecastSummary.momentum}
                  </span>
                </div>

                {/* YoY Growth */}
                {forecastSummary.yoyGrowth !== null && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 bg-card/50">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span className={cn(
                      'text-xs font-medium tabular-nums',
                      (forecastSummary.yoyGrowth ?? 0) >= 0 ? 'text-chart-2' : 'text-destructive'
                    )}>
                      {(forecastSummary.yoyGrowth ?? 0) >= 0 ? '+' : ''}{(forecastSummary.yoyGrowth ?? 0).toFixed(1)}% YoY
                    </span>
                  </div>
                )}

                {/* Data depth */}
                <div className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 bg-card/50">
                  <span className="text-xs text-muted-foreground">
                    {forecastSummary.monthsAvailable} months data
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">
                    &middot; fit {((forecastSummary.trendFit ?? 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* AI Insights (collapsible) */}
              {forecastInsights.length > 0 && (
                <div className="rounded-lg border border-border/50 bg-muted/10 overflow-hidden">
                  <button
                    onClick={() => setInsightsOpen(!insightsOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium">Growth Insights</span>
                    </div>
                    {insightsOpen
                      ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  {insightsOpen && (
                    <div className="px-4 pb-3 space-y-1.5">
                      {forecastInsights.map((insight, i) => (
                        <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                          <span className="text-primary/60 mt-0.5 shrink-0">&bull;</span>
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-muted-foreground/40 text-center">
                Projections based on historical trends &amp; seasonal patterns. Actual results may vary.
              </p>
            </>
            )}
          </div>
        </>
        )}
      </CardContent>
    </Card>
  );
}
