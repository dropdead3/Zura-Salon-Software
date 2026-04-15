import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, subWeeks, format, parseISO, isWithinInterval } from 'date-fns';

interface AnalyticsData {
  date: string;
  visitors: number;
  pageviews: number;
  avg_session_duration: number;
  bounce_rate: number;
}

interface WeeklyMetrics {
  weekStart: string;
  visitors: number;
  pageviews: number;
  avgSessionDuration: number;
  bounceRate: number;
}

interface AnalyticsSummary {
  thisWeek: WeeklyMetrics;
  lastWeek: WeeklyMetrics;
  weeklyData: WeeklyMetrics[];
  trends: {
    visitors: number;
    pageviews: number;
    sessionDuration: number;
    bounceRate: number;
  };
}

export function useWebsiteAnalytics() {
  const queryClient = useQueryClient();

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ['website-analytics'],
    queryFn: async () => {
      // First try to get from cache
      const { data, error } = await supabase
        .from('website_analytics_cache')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      return data as unknown as AnalyticsData[];
    },
  });

  const refreshAnalytics = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-website-analytics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh analytics');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-analytics'] });
    },
  });

  // Process raw data into weekly summaries
  const summary: AnalyticsSummary | null = rawData ? calculateSummary(rawData) : null;

  return {
    data: rawData,
    summary,
    isLoading,
    error,
    refreshAnalytics: refreshAnalytics.mutate,
    isRefreshing: refreshAnalytics.isPending,
  };
}

function calculateSummary(data: AnalyticsData[]): AnalyticsSummary {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);
  const lastWeekEnd = thisWeekStart;

  // Group data by weeks
  const weeklyData: WeeklyMetrics[] = [];
  
  for (let i = 0; i < 8; i++) {
    const weekStart = subWeeks(thisWeekStart, i);
    const weekEnd = subWeeks(thisWeekStart, i - 1);
    
    const weekData = data.filter(d => {
      const date = parseISO(d.date);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });

    if (weekData.length > 0) {
      weeklyData.push({
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        visitors: weekData.reduce((sum, d) => sum + d.visitors, 0),
        pageviews: weekData.reduce((sum, d) => sum + d.pageviews, 0),
        avgSessionDuration: weekData.reduce((sum, d) => sum + d.avg_session_duration, 0) / weekData.length,
        bounceRate: weekData.reduce((sum, d) => sum + d.bounce_rate, 0) / weekData.length,
      });
    }
  }

  const thisWeekData = weeklyData[0] || {
    weekStart: format(thisWeekStart, 'yyyy-MM-dd'),
    visitors: 0,
    pageviews: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
  };

  const lastWeekData = weeklyData[1] || {
    weekStart: format(lastWeekStart, 'yyyy-MM-dd'),
    visitors: 0,
    pageviews: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
  };

  // Calculate trends (percentage change)
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    thisWeek: thisWeekData,
    lastWeek: lastWeekData,
    weeklyData: weeklyData.reverse(), // Oldest first for charts
    trends: {
      visitors: calculateTrend(thisWeekData.visitors, lastWeekData.visitors),
      pageviews: calculateTrend(thisWeekData.pageviews, lastWeekData.pageviews),
      sessionDuration: calculateTrend(thisWeekData.avgSessionDuration, lastWeekData.avgSessionDuration),
      bounceRate: calculateTrend(thisWeekData.bounceRate, lastWeekData.bounceRate),
    },
  };
}
