import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { useSalesTrend } from '@/hooks/useSalesData';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Skeleton } from '@/components/ui/skeleton';

interface LocationTrendPanelProps {
  isOpen: boolean;
  dateFrom: string;
  dateTo: string;
  locationId: string;
}

export function LocationTrendPanel({
  isOpen,
  dateFrom,
  dateTo,
  locationId,
}: LocationTrendPanelProps) {
  const { data, isLoading } = useSalesTrend(dateFrom, dateTo, locationId);
  const { formatCurrencyWhole } = useFormatCurrency();

  const chartData = useMemo(() => {
    if (!data?.overall?.length) return [];
    return data.overall
      .map((d) => ({
        date: d.date,
        label: format(new Date(d.date), 'MMM d'),
        revenue: d.revenue ?? 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const hasData = chartData.some((d) => d.revenue > 0);

  if (!isOpen) return null;

  return (
    <div className="pt-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs tracking-wide font-display uppercase text-muted-foreground font-medium">
          Daily Revenue Trend
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-[180px] w-full" />
        </div>
      ) : !hasData ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No trend data for this period
        </p>
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="locationTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md">
                      <p className="text-xs text-muted-foreground">{d.label}</p>
                      <p className="text-sm font-medium tabular-nums">
                        {formatCurrencyWhole(d.revenue)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#locationTrendGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
