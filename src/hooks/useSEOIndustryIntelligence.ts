import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  type DetectedTrend,
  type OrgPercentilePosition,
  rankWhatsWorking,
  computeOrgPercentile,
} from '@/lib/seo-engine/seo-industry-intelligence';
import {
  type TrendDirection,
  type TrendConfidence,
  type IndustrySignalType,
  BENCHMARK_METRIC_KEYS,
} from '@/config/seo-engine/seo-industry-config';

interface IndustryTrendSignalRow {
  id: string;
  signal_type: string;
  category: string;
  city: string | null;
  metric_key: string;
  current_value: number;
  previous_value: number;
  delta_pct: number;
  direction: string;
  cohort_size: number;
  confidence: string;
  period_start: string;
  period_end: string;
  insight_text: string | null;
  expires_at: string;
}

interface IndustryBenchmarkRow {
  id: string;
  category: string;
  city: string | null;
  metric_key: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  cohort_size: number;
  period: string;
}

/**
 * Fetch active (non-expired) industry trend signals.
 */
export function useIndustryTrends() {
  return useQuery({
    queryKey: ['industry-trend-signals'],
    queryFn: async (): Promise<DetectedTrend[]> => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('industry_trend_signals' as any)
        .select('*')
        .gte('expires_at', now)
        .order('computed_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return ((data || []) as unknown as IndustryTrendSignalRow[]).map((row) => ({
        signalType: row.signal_type as IndustrySignalType,
        category: row.category,
        city: row.city ?? undefined,
        metricKey: row.metric_key,
        currentValue: Number(row.current_value),
        previousValue: Number(row.previous_value),
        deltaPct: Number(row.delta_pct),
        direction: row.direction as TrendDirection,
        cohortSize: row.cohort_size,
        confidence: row.confidence as TrendConfidence,
        insightText: row.insight_text,
      }));
    },
    staleTime: 1000 * 60 * 30, // 30 min — signals update weekly
  });
}

/**
 * Fetch industry benchmarks.
 */
export function useIndustryBenchmarks(category?: string) {
  return useQuery({
    queryKey: ['industry-benchmarks', category],
    queryFn: async () => {
      let query = supabase
        .from('industry_benchmarks' as any)
        .select('*')
        .order('computed_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      return ((data || []) as unknown as IndustryBenchmarkRow[]).map((row) => ({
        category: row.category,
        city: row.city ?? undefined,
        metricKey: row.metric_key,
        p25: Number(row.p25),
        p50: Number(row.p50),
        p75: Number(row.p75),
        p90: Number(row.p90),
        cohortSize: row.cohort_size,
        period: row.period,
      }));
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Composite hook: "What's Working Now" feed + org benchmarking.
 */
export function useSEOIndustryIntelligence(organizationId?: string, orgActiveCategories?: string[]) {
  const { data: trends = [], isLoading: trendsLoading } = useIndustryTrends();
  const { data: benchmarks = [], isLoading: benchmarksLoading } = useIndustryBenchmarks();

  const whatsWorking = rankWhatsWorking(trends, orgActiveCategories, 5);

  // Market alerts: demand shifts with high or medium confidence
  const marketAlerts = trends.filter(
    (t) => t.signalType === 'demand_shift' && t.confidence !== 'low' && t.direction === 'rising',
  );

  return {
    whatsWorking,
    marketAlerts,
    allTrends: trends,
    benchmarks,
    isLoading: trendsLoading || benchmarksLoading,
  };
}
