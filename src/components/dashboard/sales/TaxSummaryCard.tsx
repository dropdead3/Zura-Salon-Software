import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Receipt, Loader2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge, type DateRangeType } from '@/components/dashboard/AnalyticsFilterBadge';
import { useTaxSummary } from '@/hooks/useTaxSummary';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Badge } from '@/components/ui/badge';
import { format, parse } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface TaxSummaryCardProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  dateRange?: DateRangeType;
}

export function TaxSummaryCard({ dateFrom, dateTo, locationId, dateRange }: TaxSummaryCardProps) {
  const { data, isLoading } = useTaxSummary({ dateFrom, dateTo, locationId });
  const { formatCurrencyWhole } = useFormatCurrency();

  const showMonthlyChart = (data?.byMonth?.length ?? 0) > 1;

  const chartData = (data?.byMonth ?? []).map(m => {
    let label: string;
    try {
      const d = parse(m.month + '-01', 'yyyy-MM-dd', new Date());
      label = format(d, 'MMM yyyy');
    } catch {
      label = m.month;
    }
    return { name: label, tax: m.tax };
  });

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Receipt className={tokens.card.icon} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>TAX COLLECTED</CardTitle>
                <MetricInfoTooltip description="Sales tax collected from POS transactions during the selected period. This is a pass-through liability — not revenue. Use this for tax remittance reporting." />
              </div>
              <CardDescription>Tax liability summary for remittance</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dateRange && (
              <AnalyticsFilterBadge locationId={locationId || 'all'} dateRange={dateRange} />
            )}
            {data && (
              <Badge variant="secondary">
                <BlurredAmount>{formatCurrencyWhole(data.totalTax)}</BlurredAmount>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.totalTax === 0 ? (
          <div className={tokens.empty.container}>
            <Receipt className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No tax collected</h3>
            <p className={tokens.empty.description}>No sales tax was recorded for this period</p>
          </div>
        ) : (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className={cn(tokens.kpi.tile, 'relative')}>
                <span className={tokens.kpi.label}>Tax Collected</span>
                <span className={tokens.kpi.value}>
                  <BlurredAmount>{formatCurrencyWhole(data.totalTax)}</BlurredAmount>
                </span>
              </div>
              <div className={cn(tokens.kpi.tile, 'relative')}>
                <span className={tokens.kpi.label}>Pre-Tax Revenue</span>
                <span className={tokens.kpi.value}>
                  <BlurredAmount>{formatCurrencyWhole(data.totalPreTaxRevenue)}</BlurredAmount>
                </span>
              </div>
              <div className={cn(tokens.kpi.tile, 'relative')}>
                <span className={tokens.kpi.label}>Effective Rate</span>
                <span className={tokens.kpi.value}>
                  {data.totalPreTaxRevenue > 0
                    ? ((data.totalTax / data.totalPreTaxRevenue) * 100).toFixed(2) + '%'
                    : '0%'}
                </span>
              </div>
            </div>

            {/* Location breakdown */}
            {data.byLocation.length > 1 && (
              <div className="space-y-2">
                <p className={tokens.heading.subsection}>By Location</p>
                <div className="space-y-1.5">
                  {data.byLocation.map(loc => (
                    <div key={loc.locationId} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{loc.locationName}</span>
                      <BlurredAmount>
                        <span className="font-medium tabular-nums">{formatCurrencyWhole(loc.tax)}</span>
                      </BlurredAmount>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Item type breakdown */}
            {data.byItemType.length > 0 && (
              <div className="space-y-2">
                <p className={tokens.heading.subsection}>By Category</p>
                <div className="space-y-1.5">
                  {data.byItemType.map(t => (
                    <div key={t.itemType} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{t.itemType}</span>
                      <BlurredAmount>
                        <span className="font-medium tabular-nums">{formatCurrencyWhole(t.tax)}</span>
                      </BlurredAmount>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly trend chart */}
            {showMonthlyChart && (
              <div className="space-y-2">
                <p className={tokens.heading.subsection}>Monthly Trend</p>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tickFormatter={(v) => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v)}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => [formatCurrencyWhole(value), 'Tax']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="tax" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
