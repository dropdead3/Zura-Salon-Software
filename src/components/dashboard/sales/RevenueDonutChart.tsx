import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChartIcon } from 'lucide-react';
import { useHideNumbers } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { getRetailPerformanceVerdict } from '@/lib/retailPerformance';
import { cn } from '@/lib/utils';

interface RetailBreakdownData {
  productOnlyRevenue?: number;
  extensionRevenue?: number;
  merchRevenue?: number;
  giftCardRevenue?: number;
  feesRevenue?: number;
}

interface RevenueDonutChartProps {
  serviceRevenue: number;
  productRevenue: number;
  size?: number;
  filterContext?: FilterContext;
  retailAttachmentRate?: number;
  retailAttachmentLoading?: boolean;
  retailBreakdown?: RetailBreakdownData;
}

export function RevenueDonutChart({ 
  serviceRevenue, 
  productRevenue,
  size = 80,
  filterContext,
  retailAttachmentRate,
  retailAttachmentLoading,
  retailBreakdown,
}: RevenueDonutChartProps) {
  const { hideNumbers } = useHideNumbers();
  const { formatCurrencyWhole } = useFormatCurrency();
  
  const emptyData = [{ name: 'Empty', value: 1, color: 'hsl(var(--muted))' }];

  const data = useMemo(() => {
    const total = serviceRevenue + productRevenue;
    if (total === 0) return emptyData;
    return [
      { name: 'Services', value: serviceRevenue, color: 'hsl(var(--foreground))' },
      { name: 'Retail', value: productRevenue, color: 'hsl(var(--muted-foreground) / 0.4)' },
    ].filter(d => d.value > 0);
  }, [serviceRevenue, productRevenue]);

  const total = serviceRevenue + productRevenue;
  const servicePercent = total > 0 ? Math.round((serviceRevenue / total) * 100) : 0;
  const retailPercent = total > 0 ? Math.round((productRevenue / total) * 100) : 0;

  // Retail sub-category percentages (of total revenue)
  const hasBreakdown = retailBreakdown && (
    (retailBreakdown.productOnlyRevenue ?? 0) > 0 ||
    (retailBreakdown.extensionRevenue ?? 0) > 0 ||
    (retailBreakdown.merchRevenue ?? 0) > 0 ||
    (retailBreakdown.giftCardRevenue ?? 0) > 0
  );
  const extRev = retailBreakdown?.extensionRevenue ?? 0;
  const trueRetailRevenue = productRevenue - extRev;
  const trueRetailPercent = total > 0 ? Math.round((trueRetailRevenue / total) * 100) : 0;

  const subCategories = hasBreakdown ? [
    { label: 'Products', value: retailBreakdown!.productOnlyRevenue ?? 0 },
    { label: 'Extensions', value: retailBreakdown!.extensionRevenue ?? 0 },
    { label: 'Merch', value: retailBreakdown!.merchRevenue ?? 0 },
    { label: 'Gift Cards', value: retailBreakdown!.giftCardRevenue ?? 0 },
  ].filter(s => s.value > 0) : [];

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


  return (
    <Card className="@container overflow-hidden border-border/40">
      <CardHeader className="px-4 pt-4 pb-1">{headerContent}</CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="flex flex-col @[280px]:flex-row items-center gap-4 w-full">
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
          <div className="flex-1 min-w-0 text-sm space-y-1.5">
            {/* Services row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-foreground shrink-0" />
                <span className="text-muted-foreground">Services</span>
              </div>
              <span className="font-medium tabular-nums text-foreground">{servicePercent}%</span>
            </div>
            {/* Retail row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'hsl(var(--muted-foreground) / 0.4)' }} />
                <span className="text-muted-foreground">Retail</span>
              </div>
              <span className="font-medium tabular-nums text-foreground">{retailPercent}%</span>
            </div>
            {/* Retail sub-category rows */}
            {subCategories.map((sub) => {
              const subPct = total > 0 ? Math.round((sub.value / total) * 100) : 0;
              return (
                <div key={sub.label} className="flex items-center justify-between gap-2 pl-4">
                  <span className="text-muted-foreground/70 text-xs">{sub.label}</span>
                  <span className="text-muted-foreground tabular-nums text-xs">{subPct}%</span>
                </div>
              );
            })}
            {/* Metrics section */}
            <div className="pt-2 mt-2 border-t border-border/50 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Retail %</span>
                  <MetricInfoTooltip description="Product Revenue ÷ Total Revenue × 100. Shows retail sales as a percentage of all revenue." />
                </div>
                <span className="font-medium text-foreground tabular-nums">
                  {retailPercent}%
                </span>
              </div>
              {hasBreakdown && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">True Retail %</span>
                    <MetricInfoTooltip description="Retail revenue excluding extensions (which are service inputs), as a percentage of total revenue. A more accurate measure of cross-selling effectiveness." />
                  </div>
                  <span className="font-medium text-foreground tabular-nums">
                    {trueRetailPercent}%
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Attach Rate</span>
                  <MetricInfoTooltip description="Percentage of service clients who also purchased a retail product (excluding extensions) in this period. Extensions are service inputs and not counted as cross-sells." />
                </div>
                <div className="flex items-center gap-1.5">
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