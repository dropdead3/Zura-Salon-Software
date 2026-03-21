import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';
import type { CorrelationPair } from '@/hooks/useCorrelationAnalysis';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import { formatCurrency as formatCurrencyUtil, formatCurrencyWhole as formatCurrencyWholeUtil } from '@/lib/formatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

interface ScatterPlotCardProps {
  pair: CorrelationPair;
  locationId?: string;
  onClose: () => void;
}

const METRIC_COLUMN_MAP: Record<string, string> = {
  'total_revenue': 'total_revenue',
  'service_revenue': 'service_revenue',
  'product_revenue': 'product_revenue',
  'total_transactions': 'total_transactions',
};

const METRIC_LABELS: Record<string, string> = {
  total_revenue: 'Total Revenue',
  service_revenue: 'Service Revenue',
  product_revenue: 'Product Revenue',
  total_transactions: 'Transactions',
};

export function ScatterPlotCard({ pair, locationId, onClose }: ScatterPlotCardProps) {
  const { metricA, metricB, coefficient, strength, direction, dataPoints } = pair;
  const labelA = METRIC_LABELS[metricA] || metricA;
  const labelB = METRIC_LABELS[metricB] || metricB;

  // Fetch actual data points for scatter plot
  const { data: scatterData, isLoading } = useQuery({
    queryKey: ['scatter-data', metricA, metricB, locationId],
    queryFn: async () => {
      const dateFrom = format(subDays(new Date(), 90), 'yyyy-MM-dd');

      let query = supabase
        .from('phorest_daily_sales_summary')
        .select('summary_date, total_revenue, service_revenue, product_revenue, total_transactions')
        .gte('summary_date', dateFrom)
        .order('summary_date', { ascending: true });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data } = await query;
      
      return (data || []).map(row => ({
        x: Number(row[metricA as keyof typeof row]) || 0,
        y: Number(row[metricB as keyof typeof row]) || 0,
        date: row.summary_date,
      }));
    },
  });

  // Calculate trend line
  const trendLine = useMemo(() => {
    if (!scatterData || scatterData.length < 2) return null;

    const n = scatterData.length;
    const sumX = scatterData.reduce((s, p) => s + p.x, 0);
    const sumY = scatterData.reduce((s, p) => s + p.y, 0);
    const sumXY = scatterData.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = scatterData.reduce((s, p) => s + p.x * p.x, 0);

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...scatterData.map(p => p.x));
    const maxX = Math.max(...scatterData.map(p => p.x));

    return {
      start: { x: minX, y: slope * minX + intercept },
      end: { x: maxX, y: slope * maxX + intercept },
    };
  }, [scatterData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              {labelA} vs {labelB}
              <MetricInfoTooltip description="Plots two metrics against each other to reveal correlations. Each point represents a daily observation. The correlation coefficient (r) indicates strength and direction of the relationship." />
              <Badge variant={direction === 'positive' ? 'default' : 'destructive'}>
                {direction === 'positive' ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {(coefficient * 100).toFixed(0)}% {strength}
              </Badge>
            </CardTitle>
            <CardDescription>
              Based on {dataPoints} data points from the last 90 days
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Loading scatter data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={scatterData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="x" 
                  type="number"
                  tickFormatter={(v) => formatCurrencyWholeUtil(v / 1000) + 'k'}
                  label={{ value: labelA, position: 'bottom', offset: 0 }}
                />
                <YAxis 
                  dataKey="y"
                  type="number"
                  tickFormatter={(v) => formatCurrencyWholeUtil(v / 1000) + 'k'}
                  label={{ value: labelB, angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg p-2 text-sm shadow-md">
                        <p className="text-muted-foreground">{data.date}</p>
                        <p>{labelA}: {formatCurrencyUtil(data.x)}</p>
                        <p>{labelB}: {formatCurrencyUtil(data.y)}</p>
                      </div>
                    );
                  }}
                />
                <Scatter 
                  dataKey="y" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.6}
                />
                {trendLine && (
                  <ReferenceLine 
                    segment={[
                      { x: trendLine.start.x, y: trendLine.start.y },
                      { x: trendLine.end.x, y: trendLine.end.y },
                    ]}
                    stroke={direction === 'positive' ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Interpretation */}
        <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
          <h4 className="font-medium text-sm mb-2">Interpretation</h4>
          <p className="text-sm text-muted-foreground">
            {strength === 'strong' && direction === 'positive' && (
              <>There's a strong positive relationship between {labelA} and {labelB}. When {labelA} increases, {labelB} tends to increase as well. This suggests these metrics are linked — improving one may naturally boost the other.</>
            )}
            {strength === 'strong' && direction === 'negative' && (
              <>There's a strong inverse relationship. Higher {labelA} correlates with lower {labelB}. This might indicate a tradeoff or resource allocation pattern worth investigating.</>
            )}
            {strength === 'moderate' && direction === 'positive' && (
              <>A moderate positive correlation exists. {labelA} and {labelB} tend to move together, though other factors also influence their relationship.</>
            )}
            {strength === 'moderate' && direction === 'negative' && (
              <>A moderate inverse correlation is present. These metrics show some opposing trends, possibly indicating competing priorities.</>
            )}
            {(strength === 'weak' || strength === 'none') && (
              <>No significant correlation detected. {labelA} and {labelB} appear to operate independently of each other.</>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
