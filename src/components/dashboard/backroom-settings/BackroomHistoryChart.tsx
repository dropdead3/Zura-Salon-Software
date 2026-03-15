/**
 * BackroomHistoryChart — Multi-metric time-series with Daily/Weekly/Monthly toggle.
 */

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBackroomHistory, type BucketMode } from '@/hooks/backroom/useBackroomHistory';
import { useFormatNumber } from '@/hooks/useFormatNumber';

interface Props {
  startDate: string;
  endDate: string;
  rangeLabel: string;
}

export function BackroomHistoryChart({ startDate, endDate, rangeLabel }: Props) {
  const [bucketMode, setBucketMode] = useState<BucketMode>('daily');
  const { data: history, isLoading } = useBackroomHistory(startDate, endDate, bucketMode);
  const { formatNumber } = useFormatNumber();

  const formatPeriod = (period: string) => {
    try {
      if (bucketMode === 'monthly') return format(parseISO(period + '-01'), 'MMM yyyy');
      return format(parseISO(period), bucketMode === 'weekly' ? "'W'w MMM d" : 'MMM d');
    } catch {
      return period;
    }
  };

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <TrendingUp className={tokens.card.icon} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className={tokens.card.title}>Backroom History</CardTitle>
              <MetricInfoTooltip description="Tracks dispensed product, waste, and session volume over time. Use the toggle to switch between daily, weekly, and monthly views." />
            </div>
            <CardDescription className="text-xs">{rangeLabel}</CardDescription>
          </div>
        </div>
        <Tabs value={bucketMode} onValueChange={(v) => setBucketMode(v as BucketMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="daily" className="text-xs px-3 h-7">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs px-3 h-7">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs px-3 h-7">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : !history?.length ? (
          <div className={tokens.empty.container}>
            <TrendingUp className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No history data</h3>
            <p className={tokens.empty.description}>No mixing sessions found for this period.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="dispensedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="wasteGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
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
                width={45}
              />
              <Tooltip
                content={({ payload, label }) => {
                  if (!payload?.length) return null;
                  return (
                    <div className="rounded-lg bg-popover border border-border px-3 py-2 text-xs shadow-md space-y-1">
                      <p className="font-medium">{formatPeriod(label)}</p>
                      {payload.map((p: any) => (
                        <p key={p.dataKey} style={{ color: p.color }}>
                          {p.name}: {formatNumber(p.value)}{p.dataKey === 'wastePct' ? '%' : p.dataKey === 'sessions' ? '' : 'g'}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                height={28}
                wrapperStyle={{ fontSize: '11px' }}
              />
              <Area
                type="monotone"
                dataKey="dispensedQty"
                name="Dispensed (g)"
                stroke="hsl(var(--primary))"
                fill="url(#dispensedGrad)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="wasteQty"
                name="Waste (g)"
                stroke="hsl(var(--destructive))"
                fill="url(#wasteGrad)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                name="Sessions"
                stroke="hsl(var(--muted-foreground))"
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
