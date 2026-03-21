import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, addDays, differenceInDays } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrencyWhole as formatCurrencyWholeUtil } from '@/lib/formatCurrency';

interface GoalPaceTrendPanelProps {
  period: 'weekly' | 'monthly';
  target: number;
  locationId?: string;
}

export function GoalPaceTrendPanel({ period, target, locationId }: GoalPaceTrendPanelProps) {
  const { formatDate } = useFormatDate();
  const now = new Date();
  const periodStart = period === 'weekly' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
  const periodEnd = period === 'weekly' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);
  const totalDays = differenceInDays(periodEnd, periodStart) + 1;

  const { data: dailyRevenue, isLoading } = useQuery({
    queryKey: ['goal-pace-daily', period, locationId],
    queryFn: async () => {
      const dateFrom = format(periodStart, 'yyyy-MM-dd');
      const dateTo = format(now, 'yyyy-MM-dd');

      let query = supabase
        .from('phorest_appointments')
        .select('appointment_date, total_price')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .not('status', 'in', '("cancelled","no_show")');

      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by date
      const byDate: Record<string, number> = {};
      data?.forEach(row => {
        const d = row.appointment_date;
        byDate[d] = (byDate[d] || 0) + (Number(row.total_price) || 0);
      });
      return byDate;
    },
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useMemo(() => {
    if (!dailyRevenue) return [];

    const points: { date: string; label: string; actual: number; ideal: number }[] = [];
    let cumulative = 0;
    const dailyIdeal = target / totalDays;

    for (let i = 0; i < totalDays; i++) {
      const day = addDays(periodStart, i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const label = formatDate(day, 'MMM d');
      const idealCum = dailyIdeal * (i + 1);

      if (day <= now) {
        cumulative += dailyRevenue[dateStr] || 0;
        points.push({ date: dateStr, label, actual: cumulative, ideal: idealCum });
      } else {
        points.push({ date: dateStr, label, actual: 0, ideal: idealCum });
      }
    }
    return points;
  }, [dailyRevenue, target, totalDays, periodStart, now]);

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={period === 'monthly' ? 4 : 0}
            />
            <YAxis
              tickFormatter={(v) => formatCurrencyWholeUtil(v / 1000) + 'k'}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrencyWholeUtil(value),
                name === 'actual' ? 'Cumulative Revenue' : 'Ideal Pace',
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              fill="url(#actualGradient)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="ideal"
              stroke="hsl(var(--muted-foreground) / 0.4)"
              fill="none"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-primary rounded-full" />
          <span className="text-[10px] text-muted-foreground">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 border-t border-dashed border-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground">Ideal Pace</span>
        </div>
      </div>
    </motion.div>
  );
}
