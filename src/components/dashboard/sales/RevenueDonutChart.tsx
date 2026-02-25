import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChartIcon } from 'lucide-react';
import { useHideNumbers } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface RevenueDonutChartProps {
  serviceRevenue: number;
  productRevenue: number;
  size?: number;
  filterContext?: FilterContext;
  retailAttachmentRate?: number;
  retailAttachmentLoading?: boolean;
}

export function RevenueDonutChart({ 
  serviceRevenue, 
  productRevenue,
  size = 80,
  filterContext,
  retailAttachmentRate,
  retailAttachmentLoading,
}: RevenueDonutChartProps) {
  const { hideNumbers } = useHideNumbers();
  const { formatCurrencyWhole } = useFormatCurrency();
  
  const data = useMemo(() => {
    const total = serviceRevenue + productRevenue;
    if (total === 0) return [];
    return [
      { name: 'Services', value: serviceRevenue, color: 'hsl(var(--foreground))' },
      { name: 'Retail', value: productRevenue, color: 'hsla(35, 70%, 45%, 0.55)' },
    ].filter(d => d.value > 0);
  }, [serviceRevenue, productRevenue]);

  const total = serviceRevenue + productRevenue;
  const servicePercent = total > 0 ? Math.round((serviceRevenue / total) * 100) : 0;

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
          <PieChartIcon className="w-5 h-5 text-primary" />
        </div>
        <CardTitle className="font-display text-sm tracking-wide">REVENUE BREAKDOWN</CardTitle>
      </div>
      {filterContext && (
        <AnalyticsFilterBadge 
          locationId={filterContext.locationId} 
          dateRange={filterContext.dateRange} 
        />
      )}
    </div>
  );

  if (!data.length) {
    return (
      <Card className="overflow-hidden border-border/40">
        <CardHeader className="px-4 pt-4 pb-1">{headerContent}</CardHeader>
        <CardContent className="px-4 pb-3 pt-0 flex-1 flex items-center justify-center">
          <div className="text-muted-foreground text-xs">No data</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/40">
      <CardHeader className="px-4 pt-4 pb-1">{headerContent}</CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="flex items-center gap-4 w-full">
          <div className="shrink-0" style={{ width: size, height: size }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={size * 0.35}
                  outerRadius={size * 0.45}
                  paddingAngle={0}
                  stroke="hsl(var(--border) / 0.4)"
                  strokeWidth={1}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                {!hideNumbers && (
                  <Tooltip 
                    formatter={(value: number) => [formatCurrencyWhole(value), '']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 min-w-0 text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-foreground shrink-0" />
                <span className="text-muted-foreground">Services</span>
              </div>
              <span className="font-medium tabular-nums">{servicePercent}%</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'hsla(35, 70%, 45%, 0.55)' }} />
                <span className="text-muted-foreground">Retail</span>
              </div>
              <span className="font-medium tabular-nums">{100 - servicePercent}%</span>
            </div>
            <div className="pt-2 mt-2 border-t border-border/50 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Retail %</span>
                  <MetricInfoTooltip description="Product Revenue ÷ Total Revenue × 100. Shows retail sales as a percentage of all revenue." />
                </div>
                <span className="font-medium text-foreground tabular-nums">
                  {100 - servicePercent}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Attach Rate</span>
                  <MetricInfoTooltip description="Percentage of service clients who also purchased a retail product in this period. A key indicator of cross-selling effectiveness." />
                </div>
                <div className="flex items-center gap-1.5">
                  {!retailAttachmentLoading && retailAttachmentRate !== undefined && (
                    <span className="hidden lg:inline text-muted-foreground text-[10px]">
                      {(retailAttachmentRate / 10).toFixed(1)} of every 10 purchase retail
                    </span>
                  )}
                  <span className="font-medium text-foreground tabular-nums">
                    {retailAttachmentLoading ? '…' : retailAttachmentRate !== undefined ? `${retailAttachmentRate}%` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
