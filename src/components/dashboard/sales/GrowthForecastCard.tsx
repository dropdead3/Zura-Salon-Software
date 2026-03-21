import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { formatCurrencyWhole as formatCurrencyWholeUtil } from '@/lib/formatCurrency';
import { useGrowthForecast, Scenario, GrowthDataPoint, AccuracyDataPoint } from '@/hooks/useGrowthForecast';
import { LocationSelect } from '@/components/ui/location-select';
import { CommandCenterVisibilityToggle } from '@/components/dashboard/CommandCenterVisibilityToggle';
import { TrendingUp, TrendingDown, Minus, BarChart3, Sparkles, ArrowUpRight, ArrowDownRight, Activity, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { motion, useInView } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useState } from 'react';

// KPI Cards
function TrendKPICards({ summary, scenario }: { summary: any; scenario: Scenario }) {
  const { formatCurrencyWhole } = useFormatCurrency();
  if (!summary) return null;

  const { momentum, lastQoQGrowth, yoyGrowth, nextQuarterBaseline, nextQuarterLabel, seasonalIndices } = summary;

  const multiplier = scenario === 'conservative' ? 0.85 : scenario === 'optimistic' ? 1.15 : 1;
  const projectedRev = nextQuarterBaseline * multiplier;

  const MomentumIcon = momentum === 'accelerating' ? TrendingUp : momentum === 'decelerating' ? TrendingDown : Minus;
  const momentumColor = momentum === 'accelerating' ? 'text-chart-2' : momentum === 'decelerating' ? 'text-destructive' : 'text-muted-foreground';
  const momentumBg = momentum === 'accelerating' ? 'bg-chart-2/10' : momentum === 'decelerating' ? 'bg-destructive/10' : 'bg-muted/30';

  // Find strongest quarter
  const strongestQ = Object.entries(seasonalIndices || {}).reduce(
    (best, [q, idx]) => ((idx as number) > best.idx ? { q: Number(q), idx: idx as number } : best),
    { q: 1, idx: 0 }
  );

  const cards = [
    {
      label: `Projected ${nextQuarterLabel}`,
      value: projectedRev,
      isCurrency: true,
      icon: BarChart3,
      accent: 'text-primary',
    },
    {
      label: 'QoQ Growth',
      value: lastQoQGrowth,
      isPercent: true,
      icon: lastQoQGrowth !== null && lastQoQGrowth >= 0 ? ArrowUpRight : ArrowDownRight,
      accent: lastQoQGrowth !== null && lastQoQGrowth >= 0 ? 'text-chart-2' : 'text-destructive',
    },
    {
      label: 'Revenue Momentum',
      value: momentum,
      isText: true,
      icon: MomentumIcon,
      accent: momentumColor,
      bg: momentumBg,
    },
    {
      label: 'Strongest Quarter',
      value: `Q${strongestQ.q}`,
      isText: true,
      icon: Activity,
      accent: 'text-primary',
      subtitle: `${((strongestQ.idx - 1) * 100).toFixed(0)}% above avg`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className={cn(
            'rounded-lg border border-border/50 p-3 bg-card/50 backdrop-blur-sm',
            card.bg
          )}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <card.icon className={cn('w-3.5 h-3.5', card.accent)} />
            <span className="text-[11px] text-muted-foreground font-medium truncate">{card.label}</span>
          </div>
          <div className="text-lg font-medium tabular-nums">
            {card.isCurrency ? (
              <BlurredAmount>{formatCurrencyWhole(Math.round(card.value as number))}</BlurredAmount>
            ) : card.isPercent ? (
              card.value !== null ? (
                <span className={card.accent}>{(card.value as number) >= 0 ? '+' : ''}{(card.value as number).toFixed(1)}%</span>
              ) : (
                <span className="text-muted-foreground text-sm">N/A</span>
              )
            ) : (
              <span className={cn('capitalize', card.accent)}>{card.value as string}</span>
            )}
          </div>
          {card.subtitle && (
            <span className="text-[10px] text-muted-foreground">{card.subtitle}</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// Custom tooltip
function TrajectoryTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg min-w-[180px]">
      <p className="font-medium text-sm mb-2">{data.period}</p>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Revenue</span>
          <span className="font-medium tabular-nums">{formatCurrencyWholeUtil(Math.round(data.revenue))}</span>
        </div>
        {data.confidenceUpper && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Range</span>
            <span className="tabular-nums">
              {formatCurrencyWholeUtil(Math.round(data.confidenceLower))} – {formatCurrencyWholeUtil(Math.round(data.confidenceUpper))}
            </span>
          </div>
        )}
        <Badge variant={data.type === 'actual' ? 'default' : 'secondary'} className="text-[10px] mt-1">
          {data.type === 'actual' ? 'Actual' : 'Projected'}
        </Badge>
      </div>
    </div>
  );
}

// Revenue Trajectory Chart
function RevenueTrajectoryChart({
  actuals,
  projected,
}: {
  actuals: GrowthDataPoint[];
  projected: GrowthDataPoint[];
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(chartRef, { once: true, amount: 0.3 });

  // Merge data for chart
  const chartData = [
    ...actuals.map((d) => ({ ...d, actualRevenue: d.revenue, projectedRevenue: null, confidenceLower: null, confidenceUpper: null })),
    // Bridge point: last actual also starts projection
    ...(actuals.length > 0 && projected.length > 0
      ? [{
          ...actuals[actuals.length - 1],
          actualRevenue: actuals[actuals.length - 1].revenue,
          projectedRevenue: actuals[actuals.length - 1].revenue,
          confidenceLower: actuals[actuals.length - 1].revenue,
          confidenceUpper: actuals[actuals.length - 1].revenue,
          type: 'bridge' as const,
        }]
      : []),
    ...projected.map((d) => ({ ...d, actualRevenue: null, projectedRevenue: d.revenue })),
  ];

  return (
    <motion.div
      ref={chartRef}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6 }}
      className="h-[280px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.08} />
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          <YAxis
            tickFormatter={(v) => formatCurrencyWholeUtil(v / 1000) + 'k'}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          <Tooltip content={<TrajectoryTooltip />} />

          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="confidenceUpper"
            stroke="none"
            fill="url(#confidenceGradient)"
            connectNulls={false}
          />
          <Area
            type="monotone"
            dataKey="confidenceLower"
            stroke="none"
            fill="hsl(var(--background))"
            connectNulls={false}
          />

          {/* Actual revenue */}
          <Area
            type="monotone"
            dataKey="actualRevenue"
            stroke="hsl(var(--primary))"
            fill="url(#actualGradient)"
            strokeWidth={2.5}
            connectNulls={false}
            dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
          />

          {/* Projected revenue */}
          <Area
            type="monotone"
            dataKey="projectedRevenue"
            stroke="hsl(var(--chart-2))"
            fill="url(#projectedGradient)"
            strokeWidth={2}
            strokeDasharray="6 4"
            connectNulls={false}
            dot={{ r: 3, fill: 'hsl(var(--chart-2))', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// Growth Insights Panel
function GrowthInsightsPanel({ insights }: { insights: string[] }) {
  if (!insights || insights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="space-y-2 p-4 rounded-lg bg-card-inner border border-border/50"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Growth Insights</span>
      </div>
      {insights.map((insight, i) => (
        <div key={i} className="flex gap-2 text-sm text-muted-foreground">
          <span className="text-primary/60 mt-0.5">•</span>
          <span>{insight}</span>
        </div>
      ))}
    </motion.div>
  );
}

// Forecast Accuracy Tracker
function ForecastAccuracyTracker({ history, average }: { history: AccuracyDataPoint[]; average: number | null }) {
  if (!history || history.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="space-y-3 p-4 rounded-lg bg-card-inner border border-border/50"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Forecast Accuracy</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Accuracy tracking will appear once projected quarters have actual results to compare against.
        </p>
      </motion.div>
    );
  }

  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return 'text-chart-2';
    if (acc >= 75) return 'text-amber-500';
    return 'text-destructive';
  };

  const getBarColor = (acc: number) => {
    if (acc >= 90) return 'hsl(var(--chart-2))';
    if (acc >= 75) return 'hsl(45 93% 47%)';
    return 'hsl(var(--destructive))';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="space-y-3 p-4 rounded-lg bg-card-inner border border-border/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Forecast Accuracy</span>
        </div>
        {average !== null && (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className={cn('w-3.5 h-3.5', getAccuracyColor(average))} />
            <span className={cn('text-sm font-medium tabular-nums', getAccuracyColor(average))}>
              {average.toFixed(1)}% avg
            </span>
          </div>
        )}
      </div>

      {/* Accuracy bar chart */}
      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={history} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              className="fill-muted-foreground"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as AccuracyDataPoint;
                return (
                  <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg text-sm">
                    <p className="font-medium mb-1">{d.period}</p>
                    <div className="space-y-0.5 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Projected</span>
                        <span className="tabular-nums font-medium">{formatCurrencyWholeUtil(Math.round(d.projected))}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Actual</span>
                        <span className="tabular-nums font-medium">{formatCurrencyWholeUtil(Math.round(d.actual))}</span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">Accuracy</span>
                        <span className={cn('tabular-nums font-medium', getAccuracyColor(d.accuracy))}>
                          {d.accuracy.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {history.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.accuracy)} fillOpacity={0.8} />
              ))}
            </Bar>
            <ReferenceLine y={90} stroke="hsl(var(--chart-2))" strokeDasharray="3 3" strokeOpacity={0.4} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-quarter comparison rows */}
      <div className="space-y-1.5">
        {history.slice(-4).map((h, i) => {
          const diff = h.actual - h.projected;
          const isOver = diff >= 0;
          return (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{h.period}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground tabular-nums">
                  <BlurredAmount>{formatCurrencyWholeUtil(Math.round(h.projected))}</BlurredAmount>
                  {' → '}
                  <BlurredAmount>{formatCurrencyWholeUtil(Math.round(h.actual))}</BlurredAmount>
                </span>
                <span className={cn('font-medium tabular-nums', isOver ? 'text-chart-2' : 'text-destructive'}>
                  {isOver ? '+' : ''}{((diff / h.projected) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Main component
export function GrowthForecastCard() {
  const [selectedLocation, setSelectedLocation] = useState('all');
  const { data, isLoading, error, scenario, setScenario } = useGrowthForecast(
    selectedLocation !== 'all' ? selectedLocation : undefined
  );

  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.15 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-[280px]" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Unable to load growth forecast
        </CardContent>
      </Card>
    );
  }

  const actuals = data.actuals || [];
  const projected = data.scenarios?.[scenario] || [];
  const hasData = actuals.length > 0 || projected.length > 0;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-display text-base tracking-wide">GROWTH FORECASTING</CardTitle>
                <MetricInfoTooltip description="Projects future revenue using historical trends and seasonal patterns. The forecast applies linear regression with monthly seasonal indices to estimate 3, 6, and 12-month outlooks." />
              </div>
              <CommandCenterVisibilityToggle
                elementKey="growth_forecast"
                elementName="Growth Forecast"
              />
            </div>
            <div className="flex items-center gap-2">
              <LocationSelect
                value={selectedLocation}
                onValueChange={setSelectedLocation}
                includeAll
                allLabel="All Locations"
                triggerClassName="h-7 text-xs bg-muted/30 border-border/40 w-auto min-w-0 max-w-[240px] px-2 whitespace-nowrap"
              />
            </div>
          </div>
          <CardDescription className="text-xs">
            Quarterly revenue projections based on historical trends, seasonality, and growth momentum
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* KPI Cards */}
          <TrendKPICards summary={data.summary} scenario={scenario} />

          {/* Scenario Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scenario</span>
            <Tabs value={scenario} onValueChange={(v) => v && setScenario(v as Scenario)}>
              <FilterTabsList>
                <FilterTabsTrigger value="conservative">Conservative</FilterTabsTrigger>
                <FilterTabsTrigger value="baseline">Baseline</FilterTabsTrigger>
                <FilterTabsTrigger value="optimistic">Optimistic</FilterTabsTrigger>
              </FilterTabsList>
            </Tabs>
          </div>

          {/* Chart */}
          {hasData ? (
            <RevenueTrajectoryChart actuals={actuals} projected={projected} />
          ) : (
            <div className="h-[280px] flex items-center justify-center border border-dashed border-border/50 rounded-lg">
              <div className="text-center space-y-2">
                <BarChart3 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Growth projections will appear once historical revenue data is available
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          {hasData && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-primary rounded-full" />
                <span>Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-chart-2 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(90deg, hsl(var(--chart-2)) 0, hsl(var(--chart-2)) 4px, transparent 4px, transparent 8px)' }} />
                <span>Projected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-chart-2/10 border border-chart-2/20" />
                <span>Confidence Band</span>
              </div>
            </div>
          )}

          {/* AI Insights */}
          <GrowthInsightsPanel insights={data.insights || []} />

          {/* Forecast Accuracy Tracker */}
          <ForecastAccuracyTracker
            history={data.accuracy?.history || []}
            average={data.accuracy?.average ?? null}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
