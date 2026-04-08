import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { CalendarRange, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { format, subYears, getMonth, getYear } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { formatCurrencyWhole as formatCurrencyWholeUtil } from '@/lib/formatCurrency';
import { AnalyticsFilterBadge, FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';

interface YearOverYearComparisonProps {
  locationId?: string;
  filterContext?: FilterContext;
}

export function YearOverYearComparison({ locationId, filterContext }: YearOverYearComparisonProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const currentYear = getYear(new Date());
  const lastYear = currentYear - 1;

  const { data, isLoading } = useQuery({
    queryKey: ['year-over-year', locationId],
    queryFn: async () => {
      const fetchYear = async (year: number) => {
        const allData: any[] = [];
        const pageSize = 1000;
        let from = 0;
        let hasMore = true;
        while (hasMore) {
          let q: any = supabase
            .from('phorest_transaction_items')
            .select('transaction_date, total_amount, tax_amount, item_type')
            .gte('transaction_date', `${year}-01-01`)
            .lte('transaction_date', `${year}-12-31`);
          if (locationId) q = q.eq('location_id', locationId);
          const { data, error } = await q.range(from, from + pageSize - 1);
          if (error) throw error;
          allData.push(...(data || []));
          hasMore = (data?.length || 0) === pageSize;
          from += pageSize;
        }
        // Aggregate to daily summary rows
        const byDate: Record<string, any> = {};
        for (const item of allData) {
          const date = (item.transaction_date || '').slice(0, 10);
          if (!byDate[date]) byDate[date] = { summary_date: date, total_revenue: 0, service_revenue: 0, product_revenue: 0, total_transactions: 0 };
          const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
          byDate[date].total_revenue += amount;
          const itemType = (item.item_type || '').toLowerCase();
          if (itemType === 'service') byDate[date].service_revenue += amount;
          else byDate[date].product_revenue += amount;
          byDate[date].total_transactions += 1;
        }
        return Object.values(byDate);
      };

      const [currentData, lastData] = await Promise.all([
        fetchYear(currentYear),
        fetchYear(lastYear),
      ]);

      return { currentYear: currentData, lastYear: lastData };
    },
  });

  const comparison = useMemo(() => {
    if (!data) return null;

    // Aggregate by month
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const monthlyData = months.map((month, idx) => ({
      month,
      currentYear: 0,
      lastYear: 0,
    }));

    // Aggregate current year
    data.currentYear?.forEach(row => {
      const monthIdx = getMonth(new Date(row.summary_date));
      monthlyData[monthIdx].currentYear += Number(row.total_revenue) || 0;
    });

    // Aggregate last year
    data.lastYear?.forEach(row => {
      const monthIdx = getMonth(new Date(row.summary_date));
      monthlyData[monthIdx].lastYear += Number(row.total_revenue) || 0;
    });

    // Calculate totals
    const currentTotal = monthlyData.reduce((sum, m) => sum + m.currentYear, 0);
    const lastTotal = monthlyData.reduce((sum, m) => sum + m.lastYear, 0);
    const change = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    // Calculate current month comparison
    const currentMonthIdx = getMonth(new Date());
    const currentMonthNow = monthlyData[currentMonthIdx].currentYear;
    const currentMonthLast = monthlyData[currentMonthIdx].lastYear;
    const monthChange = currentMonthLast > 0 
      ? ((currentMonthNow - currentMonthLast) / currentMonthLast) * 100 
      : 0;

    return {
      monthlyData,
      currentTotal,
      lastTotal,
      change,
      currentMonthNow,
      currentMonthLast,
      monthChange,
      currentMonthName: months[currentMonthIdx],
    };
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!comparison) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No historical data available
        </CardContent>
      </Card>
    );
  }

  const isUp = comparison.change > 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <CalendarRange className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base tracking-wide">YEAR-OVER-YEAR</CardTitle>
              <MetricInfoTooltip description="Compares monthly revenue between the current year and the prior year. The percentage badge shows the overall year-to-date change. Use this to identify seasonal patterns and long-term growth." />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filterContext && (
              <AnalyticsFilterBadge 
                locationId={filterContext.locationId} 
                dateRange={filterContext.dateRange} 
              />
            )}
            <Badge variant={isUp ? 'default' : 'secondary'}>
              <TrendIcon className={cn('w-3 h-3 mr-1', isUp ? 'text-chart-2' : 'text-destructive')} />
              {isUp ? '+' : ''}{comparison.change.toFixed(1)}%
            </Badge>
          </div>
        </div>
        <CardDescription>{currentYear} vs {lastYear} comparison</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <p className="text-lg font-display">{formatCurrencyWhole(comparison.currentTotal)}</p>
            <p className="text-xs text-muted-foreground">{currentYear} YTD</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-lg font-display">{formatCurrencyWhole(comparison.lastTotal)}</p>
            <p className="text-xs text-muted-foreground">{lastYear} YTD</p>
          </div>
          <div className={cn(
            'text-center p-3 rounded-lg',
            comparison.monthChange >= 0 ? 'bg-chart-2/10' : 'bg-destructive/10'
          )}>
            <p className={cn(
              'text-lg font-display',
              comparison.monthChange >= 0 ? 'text-chart-2' : 'text-destructive'
            )}>
              {comparison.monthChange >= 0 ? '+' : ''}{comparison.monthChange.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">{comparison.currentMonthName} vs LY</p>
          </div>
          <div className={cn(
            'text-center p-3 rounded-lg',
            isUp ? 'bg-chart-2/10' : 'bg-destructive/10'
          )}>
            <p className={cn('text-lg font-display', isUp ? 'text-chart-2' : 'text-destructive')}>
              {formatCurrencyWhole(Math.abs(comparison.currentTotal - comparison.lastTotal))}
            </p>
            <p className="text-xs text-muted-foreground">{isUp ? 'Ahead' : 'Behind'} YTD</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparison.monthlyData} barGap={0} barCategoryGap="20%">
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCurrencyWholeUtil(v / 1000) + 'k'}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  formatCurrencyWhole(value),
                  name === 'currentYear' ? currentYear.toString() : lastYear.toString()
                ]}
              />
              <Legend 
                formatter={(value) => value === 'currentYear' ? currentYear : lastYear}
              />
              <Bar 
                dataKey="lastYear" 
                fill="hsl(var(--muted-foreground) / 0.3)" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="currentYear" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly breakdown */}
        <div className="text-xs text-muted-foreground text-center">
          <p>
            {comparison.currentMonthName}: {formatCurrencyWhole(comparison.currentMonthNow)} vs {formatCurrencyWhole(comparison.currentMonthLast)} last year
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
