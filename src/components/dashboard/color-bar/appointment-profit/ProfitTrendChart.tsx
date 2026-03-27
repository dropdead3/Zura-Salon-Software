/**
 * ProfitTrendChart — Area chart showing profit margin trend over time.
 */

import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { format, parseISO } from 'date-fns';

interface TrendDataPoint {
  date: string;
  avgMarginPct: number;
  count: number;
  totalMargin: number;
}

interface ProfitTrendChartProps {
  data: TrendDataPoint[];
  className?: string;
}

export function ProfitTrendChart({ data, className }: ProfitTrendChartProps) {
  const { formatCurrency } = useFormatCurrency();

  return (
    <Card className={cn(tokens.card.wrapper, className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <TrendingUp className={tokens.card.icon} />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Profit Trend</CardTitle>
            <CardDescription>Contribution margin over time</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length < 2 ? (
          <div className={tokens.empty.container}>
            <TrendingUp className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>Not enough data</h3>
            <p className={tokens.empty.description}>Need at least 2 days of data for trend</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => format(parseISO(v), 'MMM d')}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload as TrendDataPoint;
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-md text-sm">
                        <p className={tokens.body.emphasis}>{format(parseISO(d.date), 'MMM d, yyyy')}</p>
                        <p className={tokens.body.muted}>Margin: {d.avgMarginPct}%</p>
                        <p className={tokens.body.muted}>Total: {formatCurrency(d.totalMargin)}</p>
                        <p className={tokens.body.muted}>{d.count} appointment{d.count !== 1 ? 's' : ''}</p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avgMarginPct"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#profitGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
