/**
 * MyPerformanceSection — 8-week personal trajectory chart.
 *
 * Stylist Privacy Contract: data sourced from useMyTrajectory which
 * filters strictly by the authenticated stylist_user_id. No org-wide
 * comparison, no peer benchmarks.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useMyTrajectory } from '@/hooks/useMyTrajectory';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { ChartSkeleton } from '@/components/ui/chart-skeleton';
import { tokens } from '@/lib/design-tokens';
import { BlurredAmount } from '@/contexts/HideNumbersContext';

export function MyPerformanceSection() {
  const { data, isLoading } = useMyTrajectory();
  const { formatCurrencyWhole, formatCurrencyCompact } = useFormatCurrency();

  if (isLoading) {
    return (
      <Card className="rounded-xl bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className={tokens.card.title}>My Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton lines={4} className="h-48" />
        </CardContent>
      </Card>
    );
  }

  const points = data ?? [];
  const totalService = points.reduce((s, p) => s + p.serviceRevenue, 0);
  const totalRetail = points.reduce((s, p) => s + p.retailRevenue, 0);
  const totalAppts = points.reduce((s, p) => s + p.appointments, 0);

  const lastWeek = points[points.length - 1];
  const priorWeek = points[points.length - 2];
  const trend =
    lastWeek && priorWeek && priorWeek.serviceRevenue > 0
      ? ((lastWeek.serviceRevenue - priorWeek.serviceRevenue) / priorWeek.serviceRevenue) * 100
      : null;

  return (
    <Card className="rounded-xl bg-card/80 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>My Performance</CardTitle>
            <CardDescription>Your last 8 weeks · service + retail revenue</CardDescription>
          </div>
        </div>
        {trend != null && (
          <div className="text-right">
            <p className="font-display text-[11px] uppercase tracking-wider text-muted-foreground">
              Week-over-week
            </p>
            <p
              className={`font-display text-base tabular-nums ${
                trend >= 0 ? 'text-emerald-500' : 'text-destructive'
              }`}
            >
              {trend >= 0 ? '+' : ''}
              {trend.toFixed(1)}%
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <SummaryTile label="Service (8w)">
            <BlurredAmount>{formatCurrencyWhole(totalService)}</BlurredAmount>
          </SummaryTile>
          <SummaryTile label="Retail (8w)">
            <BlurredAmount>{formatCurrencyWhole(totalRetail)}</BlurredAmount>
          </SummaryTile>
          <SummaryTile label="Appointments">{totalAppts}</SummaryTile>
        </div>
        <div className="h-48 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="myService" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="myRetail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
              <XAxis
                dataKey="weekLabel"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCurrencyCompact(Number(v))}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [
                  formatCurrencyWhole(value),
                  name === 'serviceRevenue' ? 'Service' : 'Retail',
                ]}
                labelFormatter={(label) => `Week of ${label}`}
              />
              <Area
                type="monotone"
                dataKey="serviceRevenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#myService)"
              />
              <Area
                type="monotone"
                dataKey="retailRevenue"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                fill="url(#myRetail)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
      <p className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-lg tabular-nums mt-1">{children}</p>
    </div>
  );
}
