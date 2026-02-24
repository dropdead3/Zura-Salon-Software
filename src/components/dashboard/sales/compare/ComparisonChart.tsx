import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3 } from 'lucide-react';
import type { ComparisonResult } from '@/hooks/useComparisonData';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { formatCurrencyWhole as formatCurrencyWholeUtil } from '@/lib/formatCurrency';

interface ComparisonChartProps {
  data: ComparisonResult | undefined;
  isLoading: boolean;
  periodALabel?: string;
  periodBLabel?: string;
}

export function ComparisonChart({ 
  data, 
  isLoading,
  periodALabel = 'Period A',
  periodBLabel = 'Period B',
}: ComparisonChartProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatNumber } = useFormatNumber();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const chartData = [
    {
      name: 'Total Revenue',
      periodA: data.periodA.totalRevenue,
      periodB: data.periodB.totalRevenue,
      txnA: data.periodA.totalTransactions,
      txnB: data.periodB.totalTransactions,
    },
    {
      name: 'Services',
      periodA: data.periodA.serviceRevenue,
      periodB: data.periodB.serviceRevenue,
      txnA: null,
      txnB: null,
    },
    {
      name: 'Retail',
      periodA: data.periodA.productRevenue,
      periodB: data.periodB.productRevenue,
      txnA: null,
      txnB: null,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="font-display text-base tracking-wide">REVENUE BREAKDOWN</CardTitle>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-primary" />
            <span>{periodALabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-muted-foreground/35" />
            <span>{periodBLabel}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis 
                type="number" 
                tickFormatter={(value) => value >= 1000 ? formatCurrencyWholeUtil(value / 1000) + 'k' : formatCurrencyWholeUtil(value)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg min-w-[180px]">
                      <p className="text-xs font-medium mb-2">{d.name}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Current:</span>
                          <span className="font-display tabular-nums">{formatCurrencyWhole(d.periodA)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Prior:</span>
                          <span className="font-display tabular-nums text-muted-foreground">{formatCurrencyWhole(d.periodB)}</span>
                        </div>
                        {d.txnA != null && (
                          <div className="pt-1.5 mt-1.5 border-t border-border/50">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Txns (current):</span>
                              <span className="tabular-nums">{formatNumber(d.txnA)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Txns (prior):</span>
                              <span className="tabular-nums text-muted-foreground">{formatNumber(d.txnB)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar 
                dataKey="periodB" 
                name={periodBLabel}
                fill="hsl(var(--muted-foreground))" 
                fillOpacity={0.35}
                radius={[0, 4, 4, 0]}
              />
              <Bar 
                dataKey="periodA" 
                name={periodALabel}
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
