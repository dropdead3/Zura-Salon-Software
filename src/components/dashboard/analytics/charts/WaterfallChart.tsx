import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency as formatCurrencyUtil, formatCurrencyWhole as formatCurrencyWholeUtil } from '@/lib/formatCurrency';

interface WaterfallDataPoint {
  category: string;
  delta: number;
  isIncrease: boolean;
  isTotal?: boolean;
}

interface WaterfallChartProps {
  data: WaterfallDataPoint[];
  startValue: number;
  endValue: number;
  isLoading?: boolean;
  title?: string;
  periodALabel?: string;
  periodBLabel?: string;
}

export function WaterfallChart({
  data,
  startValue,
  endValue,
  isLoading,
  title = 'Revenue Change Breakdown',
  periodALabel = 'Previous Period',
  periodBLabel = 'Current Period',
}: WaterfallChartProps) {
  interface ChartDataPoint {
    name: string;
    value: number;
    start: number;
    fill: string;
    isBase: boolean;
    delta?: number;
  }

  const chartData = useMemo((): ChartDataPoint[] => {
    if (!data.length) return [];

    let runningTotal = startValue;
    
    const result: ChartDataPoint[] = [
      {
        name: periodALabel,
        value: startValue,
        start: 0,
        fill: 'hsl(var(--muted))',
        isBase: true,
      },
    ];

    data.forEach(item => {
      const start = runningTotal;
      const end = runningTotal + item.delta;
      
      result.push({
        name: item.category,
        value: Math.abs(item.delta),
        start: Math.min(start, end),
        fill: item.isIncrease ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))',
        isBase: false,
        delta: item.delta,
      });

      runningTotal = end;
    });

    result.push({
      name: periodBLabel,
      value: endValue,
      start: 0,
      fill: 'hsl(var(--primary))',
      isBase: true,
    });

    return result;
  }, [data, startValue, endValue, periodALabel, periodBLabel]);

  const percentChange = startValue > 0 
    ? ((endValue - startValue) / startValue) * 100 
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex items-center gap-1.5">
            {percentChange > 0 ? (
              <TrendingUp className="w-4 h-4 text-chart-2" />
            ) : percentChange < 0 ? (
              <TrendingDown className="w-4 h-4 text-destructive" />
            ) : (
              <Minus className="w-4 h-4 text-muted-foreground" />
            )}
            <span className={`text-sm font-medium ${
              percentChange > 0 ? 'text-chart-2' : percentChange < 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                tickFormatter={(v) => formatCurrencyWholeUtil(v / 1000) + 'k'}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fontSize: 12 }}
                width={90}
              />
              <Tooltip
                formatter={(value: number, name: string, props: any) => {
                  const delta = props.payload.delta;
                  if (delta !== undefined) {
                    return [`${delta >= 0 ? '+' : ''}${formatCurrencyUtil(delta)}`, 'Change'];
                  }
                  return [formatCurrencyUtil(value), 'Total'];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <ReferenceLine x={0} stroke="hsl(var(--border))" />
              <Bar 
                dataKey="value" 
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-chart-2" />
            <span className="text-muted-foreground">Increase</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-destructive" />
            <span className="text-muted-foreground">Decrease</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-muted-foreground">Period Total</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
