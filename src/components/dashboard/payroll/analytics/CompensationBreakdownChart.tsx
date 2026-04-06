import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CompensationBreakdown } from '@/hooks/usePayrollAnalytics';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { useHideNumbers } from '@/contexts/HideNumbersContext';

interface CompensationBreakdownChartProps {
  breakdown: CompensationBreakdown;
  isLoading: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 65%, 55%)',
  'hsl(35, 85%, 55%)',
  'hsl(160, 60%, 45%)',
];

export function CompensationBreakdownChart({ breakdown, isLoading }: CompensationBreakdownChartProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const chartData = useMemo(() => {
    const items = [
      { name: 'Base Pay', value: breakdown.basePay, color: COLORS[0] },
      { name: 'Service Commissions', value: breakdown.serviceCommissions, color: COLORS[1] },
      { name: 'Product Commissions', value: breakdown.productCommissions, color: COLORS[2] },
      { name: 'Bonuses', value: breakdown.bonuses, color: COLORS[3] },
      { name: 'Tips', value: breakdown.tips, color: COLORS[4] },
    ].filter(item => item.value > 0);

    return items;
  }, [breakdown]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Compensation Breakdown</CardTitle>
            <MetricInfoTooltip description="Visualizes the mix of base pay, commission, and bonuses across your team. Helps identify compensation structure balance." />
          </div>
          <CardDescription>Distribution of pay types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No payroll data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Compensation Breakdown</CardTitle>
          <MetricInfoTooltip description="Visualizes the mix of base pay, commission, and bonuses across your team. Helps identify compensation structure balance." />
        </div>
        <CardDescription>Distribution of pay types (last 6 periods)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={0}
                stroke="hsl(var(--border) / 0.4)"
                strokeWidth={1}
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrencyWhole(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry: any) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend with values */}
        <div className="mt-4 space-y-2">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
              <span className="font-medium">{formatCurrencyWhole(item.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
