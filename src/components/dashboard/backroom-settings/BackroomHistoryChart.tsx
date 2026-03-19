/**
 * BackroomHistoryChart — Multi-metric time-series with toggleable legend.
 * Inspired by Vish-style product usage history chart.
 */

import { useState, useCallback } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBackroomHistory, type BucketMode, type HistoryDataPoint } from '@/hooks/backroom/useBackroomHistory';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface Props {
  startDate: string;
  endDate: string;
  rangeLabel: string;
  locationId?: string;
}

interface MetricConfig {
  key: keyof HistoryDataPoint;
  label: string;
  color: string;
  unit: 'g' | '%' | '$' | 'count';
  defaultOn: boolean;
  /** true = Area fill, false = Line only */
  isArea: boolean;
}

const METRICS: MetricConfig[] = [
  { key: 'wasteQty',              label: 'Waste',                       color: 'hsl(25, 95%, 53%)',   unit: 'g',     defaultOn: true,  isArea: true },
  { key: 'sessions',              label: 'Services Performed',          color: 'hsl(217, 91%, 60%)',  unit: 'count', defaultOn: false, isArea: true },
  { key: 'wastePct',              label: 'Percent Waste',               color: 'hsl(142, 71%, 45%)',  unit: '%',     defaultOn: false, isArea: false },
  { key: 'estimatedWasteCost',    label: 'Estimated Waste Cost',        color: 'hsl(271, 76%, 53%)',  unit: '$',     defaultOn: false, isArea: false },
  { key: 'reweighPct',            label: 'Percent Reweighed',           color: 'hsl(45, 93%, 47%)',   unit: '%',     defaultOn: false, isArea: false },
  { key: 'dispensedQty',          label: 'Product Dispensed',           color: 'hsl(var(--muted-foreground))', unit: 'g', defaultOn: true,  isArea: true },
  { key: 'estimatedProductWasted',label: 'Est. Product Wasted',         color: 'hsl(0, 0%, 25%)',     unit: 'g',     defaultOn: false, isArea: false },
  { key: 'dispensedPerService',   label: 'Product Dispensed / Service', color: 'hsl(30, 55%, 45%)',   unit: 'g',     defaultOn: false, isArea: false },
  { key: 'wastePerService',       label: 'Product Waste / Service',     color: 'hsl(25, 80%, 65%)',   unit: 'g',     defaultOn: false, isArea: false },
];

const DEFAULT_ACTIVE = new Set(METRICS.filter(m => m.defaultOn).map(m => m.key));

export function BackroomHistoryChart({ startDate, endDate, rangeLabel, locationId }: Props) {
  const [bucketMode, setBucketMode] = useState<BucketMode>('daily');
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(new Set(DEFAULT_ACTIVE));
  const { data: history, isLoading } = useBackroomHistory(startDate, endDate, bucketMode, locationId);
  const { formatNumber } = useFormatNumber();
  const { formatCurrency } = useFormatCurrency();

  const toggleMetric = useCallback((key: string) => {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const formatPeriod = (period: string) => {
    try {
      if (bucketMode === 'yearly') return period;
      if (bucketMode === 'monthly') return format(parseISO(period + '-01'), 'MMM yyyy');
      return format(parseISO(period), bucketMode === 'weekly' ? "'W'w MMM d" : 'MMM d');
    } catch {
      return period;
    }
  };

  const formatValue = (value: number, unit: 'g' | '%' | '$' | 'count') => {
    switch (unit) {
      case '$': return formatCurrency(value);
      case '%': return `${value}%`;
      case 'g': return `${formatNumber(value)}g`;
      case 'count': return formatNumber(value);
    }
  };

  const activeConfigs = METRICS.filter(m => activeMetrics.has(m.key));

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <TrendingUp className={tokens.card.icon} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>Backroom History</CardTitle>
                <MetricInfoTooltip description="Tracks dispensed product, waste, reweigh compliance, and per-service ratios over time. Click legend items to show/hide metrics." />
              </div>
              <CardDescription className="text-xs">{rangeLabel}</CardDescription>
            </div>
          </div>
          <Tabs value={bucketMode} onValueChange={(v) => setBucketMode(v as BucketMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="daily" className="text-xs px-3 h-7">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs px-3 h-7">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs px-3 h-7">Monthly</TabsTrigger>
              <TabsTrigger value="yearly" className="text-xs px-3 h-7">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Clickable metric legend */}
        <div className="flex flex-wrap gap-2">
          {METRICS.map(m => {
            const isActive = activeMetrics.has(m.key);
            return (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans transition-all border',
                  isActive
                    ? 'bg-card border-border shadow-sm text-foreground'
                    : 'bg-transparent border-transparent text-muted-foreground opacity-50 hover:opacity-75'
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: m.color, opacity: isActive ? 1 : 0.3 }}
                />
                {m.label}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : !history?.length ? (
          <div className={tokens.empty.container}>
            <TrendingUp className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No history data</h3>
            <p className={tokens.empty.description}>No mixing sessions found for this period.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                {activeConfigs.filter(m => m.isArea).map(m => (
                  <linearGradient key={`grad-${m.key}`} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={m.color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border) / 0.4)"
                vertical={false}
              />
              <XAxis
                dataKey="period"
                tickFormatter={formatPeriod}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                content={({ payload, label }) => {
                  if (!payload?.length) return null;
                  return (
                    <div className="rounded-lg bg-popover border border-border px-3 py-2 text-xs shadow-md space-y-1 max-w-[240px]">
                      <p className="font-medium text-foreground">{formatPeriod(label)}</p>
                      {payload.map((p: any) => {
                        const cfg = METRICS.find(m => m.key === p.dataKey);
                        if (!cfg) return null;
                        return (
                          <div key={p.dataKey} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                            <span className="text-muted-foreground">{cfg.label}:</span>
                            <span className="font-medium text-foreground ml-auto">{formatValue(p.value, cfg.unit)}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {activeConfigs.map(m =>
                m.isArea ? (
                  <Area
                    key={m.key}
                    type="monotone"
                    dataKey={m.key}
                    name={m.label}
                    stroke={m.color}
                    fill={`url(#grad-${m.key})`}
                    strokeWidth={2}
                    dot={false}
                  />
                ) : (
                  <Line
                    key={m.key}
                    type="monotone"
                    dataKey={m.key}
                    name={m.label}
                    stroke={m.color}
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray={m.unit === '%' ? '6 3' : undefined}
                  />
                )
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
