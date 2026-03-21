import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveLocations } from '@/hooks/useLocations';
import { useStaffingHistory, useAggregatedStaffingHistory } from '@/hooks/useStaffingHistory';
import { TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from '@/components/ui/chart-skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';


interface StaffingTrendChartProps {
  className?: string;
}

export function StaffingTrendChart({ className }: StaffingTrendChartProps) {
  const { formatDate } = useFormatDate();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [days, setDays] = useState<number>(90);
  
  const { data: locations } = useActiveLocations();
  const { data: locationHistory, isLoading: isLoadingLocation } = useStaffingHistory(
    selectedLocation !== 'all' ? selectedLocation : undefined, 
    days
  );
  const { data: aggregatedHistory, isLoading: isLoadingAggregated } = useAggregatedStaffingHistory(days);

  const isLoading = selectedLocation === 'all' ? isLoadingAggregated : isLoadingLocation;

  // Transform data for chart
  const chartData = selectedLocation === 'all' 
    ? aggregatedHistory?.map(record => ({
        date: record.record_date,
        stylists: record.stylist_count,
        assistants: record.assistant_count,
        total: record.total_staff,
        capacity: record.total_capacity,
      })) || []
    : locationHistory?.map(record => ({
        date: record.record_date,
        stylists: record.stylist_count,
        assistants: record.assistant_count,
        total: (record.stylist_count || 0) + (record.assistant_count || 0),
        capacity: record.stylist_capacity 
          ? record.stylist_capacity + Math.ceil(record.stylist_capacity * (record.assistant_ratio || 0.5))
          : null,
      })) || [];

  const hasData = chartData.length > 0;
  const maxCapacity = hasData 
    ? Math.max(...chartData.map(d => d.capacity || 0).filter(Boolean))
    : 0;

  return (
    <Card className={cn(tokens.card.wrapper, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-display text-base tracking-wide">STAFFING TRENDS</CardTitle>
                <MetricInfoTooltip description="Tracks stylist and assistant headcount over time against your configured capacity targets. Use to identify hiring gaps and growth patterns." />
              </div>
              <CardDescription>Historical headcount and capacity over time</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[160px] h-8 text-sm">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations?.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-[100px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="60">60 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
                <SelectItem value="180">6 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ChartSkeleton lines={6} className="h-[250px]" />
        ) : !hasData ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No staffing history data available yet.</p>
              <p className="text-xs mt-1">Data will be recorded daily once configured.</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="stylistGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="assistantGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(d) => formatDate(parseISO(d), 'MMM d')}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-background border border-border rounded-lg p-2 shadow-lg text-sm">
                      <p className="font-medium mb-1">
                        {formatDate(parseISO(label), 'MMM d, yyyy')}
                      </p>
                      {payload.map((entry, idx) => (
                        <p key={idx} className="tabular-nums" style={{ color: entry.color }}>
                          {entry.name}: {entry.value}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Area 
                type="monotone" 
                dataKey="stylists" 
                name="Stylists"
                stroke="hsl(var(--primary))" 
                fill="url(#stylistGradient)"
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="assistants" 
                name="Assistants"
                stroke="hsl(var(--chart-2))" 
                fill="url(#assistantGradient)"
                strokeWidth={2}
              />
              {maxCapacity > 0 && (
                <ReferenceLine 
                  y={maxCapacity} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5"
                  label={{ 
                    value: 'Target', 
                    position: 'right',
                    fill: 'hsl(var(--destructive))',
                    fontSize: 11,
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
