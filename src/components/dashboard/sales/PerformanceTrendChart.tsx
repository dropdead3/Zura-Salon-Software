import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, MapPin } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { formatCurrencyWhole as formatCurrencyWholeUtil } from '@/lib/formatCurrency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PerformanceTrendChartProps {
  userId: string;
  weeks?: number;
}

interface WeeklyData {
  weekLabel: string;
  weekStart: string;
  revenue: number;
  services: number;
  products: number;
}

interface LocationOption {
  id: string;
  name: string;
}

export function PerformanceTrendChart({ userId, weeks = 8 }: PerformanceTrendChartProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Fetch weekly performance data with location info
  const { data, isLoading } = useQuery({
    queryKey: ['stylist-weekly-trend', userId, weeks],
    queryFn: async () => {
      const weekRanges: { start: string; end: string; label: string }[] = [];
      const today = new Date();
      
      for (let i = weeks - 1; i >= 0; i--) {
        const weekDate = subWeeks(today, i);
        const start = startOfWeek(weekDate, { weekStartsOn: 1 });
        const end = endOfWeek(weekDate, { weekStartsOn: 1 });
        weekRanges.push({
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd'),
          label: formatDate(start, 'MMM d'),
        });
      }

      // Resolve phorest staff IDs for fallback
      const { resolveStaffNamesByPhorestIds } = await import('@/utils/resolveStaffNames');
      const { data: staffMappings } = await supabase
        .from('phorest_staff_mapping')
        .select('phorest_staff_id')
        .eq('user_id', userId)
        .eq('is_active', true);
      const phorestStaffIds = staffMappings?.map(m => m.phorest_staff_id) || [];

      // Fetch locations for mapping
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name');

      // Fetch live POS transaction items with pagination
      const fetchTxnItems = async (field: string, values: string[]) => {
        const allData: any[] = [];
        const pageSize = 1000;
        let from = 0;
        let hasMore = true;
        while (hasMore) {
          let q: any = supabase
            .from('phorest_transaction_items')
            .select('total_amount, tax_amount, item_type, transaction_date, location_id')
            .gte('transaction_date', weekRanges[0].start)
            .lte('transaction_date', weekRanges[weekRanges.length - 1].end);
          if (values.length === 1) q = q.eq(field, values[0]);
          else q = q.in(field, values);
          const { data, error: e } = await q.range(from, from + pageSize - 1);
          if (e) throw e;
          allData.push(...(data || []));
          hasMore = (data?.length || 0) === pageSize;
          from += pageSize;
        }
        return allData;
      };

      let txnItems = await fetchTxnItems('stylist_user_id', [userId]);
      if (txnItems.length === 0 && phorestStaffIds.length > 0) {
        txnItems = await fetchTxnItems('phorest_staff_id', phorestStaffIds);
      }

      // Aggregate to daily summaries
      const dailyMap: Record<string, any> = {};
      for (const item of txnItems) {
        const date = (item.transaction_date || '').slice(0, 10);
        if (!dailyMap[date]) {
          dailyMap[date] = { summary_date: date, location_id: item.location_id, total_revenue: 0, total_services: 0, total_products: 0 };
        }
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        dailyMap[date].total_revenue += amount;
        const itemType = (item.item_type || '').toLowerCase();
        if (itemType === 'service') dailyMap[date].total_services += 1;
        else dailyMap[date].total_products += 1;
      }
      const allSummaries = Object.values(dailyMap);

      // Extract unique locations from the data
      const locationMap = new Map<string, LocationOption>();
      for (const item of txnItems) {
        const key = item.location_id;
        if (key && !locationMap.has(key)) {
          const loc = locations?.find(l => l.id === key);
          locationMap.set(key, {
            id: key,
            name: loc?.name || 'Unknown',
          });
        }
      }

      return {
        summaries: allSummaries,
        weekRanges,
        locations: Array.from(locationMap.values()),
      };
    },
    enabled: !!userId,
  });

  // Filter and aggregate data based on selected location
  const chartData = useMemo(() => {
    if (!data) return [];

    const { summaries, weekRanges } = data;

    // Filter by location if selected
    const filteredSummaries = selectedLocation === 'all' 
      ? summaries 
      : summaries.filter(s => 
          s.location_id === selectedLocation || s.branch_name === selectedLocation
        );

    // Aggregate by week
    return weekRanges.map(range => {
      const weekSummaries = filteredSummaries.filter(s => 
        s.summary_date >= range.start && s.summary_date <= range.end
      );
      
      return {
        weekLabel: range.label,
        weekStart: range.start,
        revenue: weekSummaries.reduce((sum, s) => sum + (Number(s.total_revenue) || 0), 0),
        services: weekSummaries.reduce((sum, s) => sum + (s.total_services || 0), 0),
        products: weekSummaries.reduce((sum, s) => sum + (s.total_products || 0), 0),
      };
    });
  }, [data, selectedLocation]);

  // Calculate trend
  const trend = useMemo(() => {
    if (!chartData || chartData.length < 2) return { direction: 'neutral' as const, percentage: 0 };
    
    const currentWeek = chartData[chartData.length - 1]?.revenue || 0;
    const previousWeek = chartData[chartData.length - 2]?.revenue || 0;
    
    if (previousWeek === 0) return { direction: 'up' as const, percentage: currentWeek > 0 ? 100 : 0 };
    
    const change = ((currentWeek - previousWeek) / previousWeek) * 100;
    return {
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
      percentage: Math.abs(change),
    };
  }, [chartData]);

  const totalRevenue = useMemo(() => 
    chartData?.reduce((sum, d) => sum + d.revenue, 0) || 0
  , [chartData]);

  const hasMultipleLocations = (data?.locations?.length || 0) > 1;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 min-h-[200px]">
          <DashboardLoader size="md" className="min-h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-display text-base tracking-wide">REVENUE TREND</CardTitle>
                <MetricInfoTooltip description="Weekly revenue trend over the selected timeframe. Each data point represents total service and product revenue for that week. The trend arrow shows the direction of the most recent week vs the prior week." />
              </div>
              <p className="text-sm text-muted-foreground">Last {weeks} weeks performance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Location Switcher */}
            {hasMultipleLocations && (
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <MapPin className="w-3 h-3 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {data?.locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="text-right">
              <p className="font-display text-2xl">{formatCurrencyWhole(totalRevenue)}</p>
              <div className="flex items-center gap-1 justify-end">
                {trend.direction === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-success-foreground" />
                ) : trend.direction === 'down' ? (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  trend.direction === 'up' && "text-success-foreground",
                  trend.direction === 'down' && "text-destructive"
                )}>
                  {trend.percentage.toFixed(1)}% vs last week
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData || []}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="weekLabel" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCurrencyWholeUtil(v / 1000) + 'k'}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrencyWhole(value), 'Revenue']}
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly breakdown badges */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <Badge variant="outline" className="text-xs">
            {chartData?.[chartData.length - 1]?.services || 0} services this week
          </Badge>
          <Badge variant="outline" className="text-xs">
            {chartData?.[chartData.length - 1]?.products || 0} products sold
          </Badge>
          {selectedLocation !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {data?.locations.find(l => l.id === selectedLocation)?.name}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
