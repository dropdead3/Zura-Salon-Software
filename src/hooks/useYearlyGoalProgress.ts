import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSalesGoals } from './useSalesGoals';
import { format, startOfYear, getDayOfYear, isLeapYear } from 'date-fns';
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import { isAllLocations, parseLocationIds } from '@/lib/locationFilter';

export interface YearlyGoalProgress {
  ytdRevenue: number;
  yearlyGoal: number;
  percentComplete: number;
  expectedPercent: number;
  isOnTrack: boolean;
  projectedYearEnd: number;
  remainingMonths: number;
  requiredMonthlyPace: number;
  aheadBehindAmount: number;
  dailyAverage: number;
}

export function useYearlyGoalProgress(locationId?: string) {
  const { goals } = useSalesGoals();
  const yearlyGoal = (goals?.monthlyTarget || 50000) * 12;

  return useQuery({
    queryKey: ['yearly-goal-progress', locationId, yearlyGoal],
    queryFn: async (): Promise<YearlyGoalProgress> => {
      const today = new Date();
      const yearStart = format(startOfYear(today), 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');
      const dayOfYear = getDayOfYear(today);
      const daysInYear = isLeapYear(today) ? 366 : 365;

      // Query YTD revenue from POS transaction items (source of truth)
      const txnData = await fetchAllBatched<{
        total_amount: number | null;
        tax_amount: number | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items')
          .select('total_amount, tax_amount')
          .gte('transaction_date', `${yearStart}T00:00:00`)
          .lte('transaction_date', `${todayStr}T23:59:59`)
          .range(from, to);
        if (!isAllLocations(locationId)) {
          const ids = parseLocationIds(locationId);
          if (ids.length === 1) q = q.eq('location_id', ids[0]);
          else if (ids.length > 1) q = q.in('location_id', ids);
        }
        return q;
      });

      const ytdRevenue = txnData.reduce((sum, row) =>
        sum + (Number(row.total_amount) || 0) + (Number(row.tax_amount) || 0), 0);

      // Calculate metrics
      const expectedPercent = (dayOfYear / daysInYear) * 100;
      const percentComplete = yearlyGoal > 0 ? (ytdRevenue / yearlyGoal) * 100 : 0;
      const isOnTrack = percentComplete >= expectedPercent;

      // Project year-end based on current pace
      const dailyAverage = dayOfYear > 0 ? ytdRevenue / dayOfYear : 0;
      const projectedYearEnd = dailyAverage * daysInYear;

      // Required pace to hit goal
      const currentMonth = today.getMonth() + 1;
      const remainingMonths = 12 - currentMonth + 1;
      const remaining = Math.max(yearlyGoal - ytdRevenue, 0);
      const requiredMonthlyPace = remainingMonths > 0 ? remaining / remainingMonths : 0;

      // How much ahead or behind we are
      const expectedRevenue = yearlyGoal * (dayOfYear / daysInYear);
      const aheadBehindAmount = ytdRevenue - expectedRevenue;

      return {
        ytdRevenue,
        yearlyGoal,
        percentComplete,
        expectedPercent,
        isOnTrack,
        projectedYearEnd,
        remainingMonths,
        requiredMonthlyPace,
        aheadBehindAmount,
        dailyAverage,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
