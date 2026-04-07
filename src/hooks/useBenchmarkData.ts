import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrganizationBenchmark {
  id: string;
  organization_id: string;
  metric_key: string;
  value: number;
  percentile: number;
  period_type: 'daily' | 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  comparison_group: string;
  metadata: Record<string, unknown>;
  calculated_at: string;
}

export interface BenchmarkWithOrg extends OrganizationBenchmark {
  organization?: {
    name: string;
    slug: string;
  };
}

export interface MetricLeaderboard {
  metric_key: string;
  metric_label: string;
  leaders: Array<{
    organization_id: string;
    organization_name: string;
    value: number;
    percentile: number;
  }>;
  platform_average: number;
}

export const METRIC_CONFIG: Record<string, { label: string; format: 'currency' | 'percent' | 'number'; inverse?: boolean }> = {
  revenue_per_location: { label: 'Revenue per Location', format: 'currency' },
  appointments_per_staff: { label: 'Appointments per Staff', format: 'number' },
  rebooking_rate: { label: 'Rebooking Rate', format: 'percent' },
  average_ticket: { label: 'Average Ticket', format: 'currency' },
  no_show_rate: { label: 'No-Show Rate', format: 'percent', inverse: true },
  login_frequency: { label: 'Staff Login Frequency', format: 'number' },
  chat_activity: { label: 'Team Chat Activity', format: 'number' },
};

export function formatMetricValue(value: number, format: 'currency' | 'percent' | 'number'): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'number':
      return value.toFixed(1);
    default:
      return String(value);
  }
}

export function useLatestBenchmarks() {
  return useQuery({
    queryKey: ['organization-benchmarks-latest'],
    queryFn: async (): Promise<BenchmarkWithOrg[]> => {
      // Get the most recent period
      const { data: latestPeriod } = await supabase
        .from('organization_benchmarks')
        .select('period_start')
        .order('period_start', { ascending: false })
        .limit(1)
        .single();

      if (!latestPeriod) return [];

      const { data, error } = await supabase
        .from('organization_benchmarks')
        .select(`
          *,
          organization:organizations(name, slug)
        `)
        .eq('period_start', latestPeriod.period_start)
        .eq('comparison_group', 'all');

      if (error) throw error;
      
      return (data || []).map((b) => ({
        ...b,
        period_type: b.period_type as 'daily' | 'weekly' | 'monthly',
        metadata: b.metadata as Record<string, unknown>,
      }));
    },
    staleTime: 300000, // Benchmark data changes daily, no frequent polling needed
  });
}

export function useMetricLeaderboards() {
  const { data: benchmarks, isLoading, error } = useLatestBenchmarks();

  const leaderboards: MetricLeaderboard[] = [];

  if (benchmarks) {
    const metricGroups = new Map<string, BenchmarkWithOrg[]>();
    
    for (const benchmark of benchmarks) {
      const existing = metricGroups.get(benchmark.metric_key) || [];
      existing.push(benchmark);
      metricGroups.set(benchmark.metric_key, existing);
    }

    for (const [metricKey, items] of metricGroups) {
      const config = METRIC_CONFIG[metricKey];
      if (!config) continue;

      // Sort by percentile (higher is better, unless inverse)
      const sorted = [...items].sort((a, b) => b.percentile - a.percentile);

      const platformAverage = items.length > 0
        ? items.reduce((sum, i) => sum + i.value, 0) / items.length
        : 0;

      leaderboards.push({
        metric_key: metricKey,
        metric_label: config.label,
        leaders: sorted.slice(0, 5).map((s) => ({
          organization_id: s.organization_id,
          organization_name: s.organization?.name || 'Unknown',
          value: s.value,
          percentile: s.percentile,
        })),
        platform_average: platformAverage,
      });
    }
  }

  return { leaderboards, isLoading, error };
}

export function useOrganizationBenchmarks(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-benchmarks', organizationId],
    queryFn: async (): Promise<OrganizationBenchmark[]> => {
      if (!organizationId) return [];

      // Get the most recent period
      const { data: latestPeriod } = await supabase
        .from('organization_benchmarks')
        .select('period_start')
        .eq('organization_id', organizationId)
        .order('period_start', { ascending: false })
        .limit(1)
        .single();

      if (!latestPeriod) return [];

      const { data, error } = await supabase
        .from('organization_benchmarks')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('period_start', latestPeriod.period_start);

      if (error) throw error;

      return (data || []).map((b) => ({
        ...b,
        period_type: b.period_type as 'daily' | 'weekly' | 'monthly',
        metadata: b.metadata as Record<string, unknown>,
      }));
    },
    enabled: !!organizationId,
  });
}

export function useBenchmarkComparison(orgId1: string | undefined, orgId2: string | undefined) {
  const { data: benchmarks1 } = useOrganizationBenchmarks(orgId1);
  const { data: benchmarks2 } = useOrganizationBenchmarks(orgId2);

  if (!benchmarks1 || !benchmarks2) {
    return { comparison: null, isLoading: true };
  }

  const comparison: Array<{
    metric_key: string;
    metric_label: string;
    format: 'currency' | 'percent' | 'number';
    org1_value: number;
    org1_percentile: number;
    org2_value: number;
    org2_percentile: number;
    difference: number;
    difference_percent: number;
  }> = [];

  for (const metric of Object.keys(METRIC_CONFIG)) {
    const config = METRIC_CONFIG[metric];
    const b1 = benchmarks1.find((b) => b.metric_key === metric);
    const b2 = benchmarks2.find((b) => b.metric_key === metric);

    if (b1 && b2) {
      const difference = b1.value - b2.value;
      const differencePercent = b2.value !== 0 ? (difference / b2.value) * 100 : 0;

      comparison.push({
        metric_key: metric,
        metric_label: config.label,
        format: config.format,
        org1_value: b1.value,
        org1_percentile: b1.percentile,
        org2_value: b2.value,
        org2_percentile: b2.percentile,
        difference,
        difference_percent: differencePercent,
      });
    }
  }

  return { comparison, isLoading: false };
}

export function useRecalculateBenchmarks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-org-benchmarks');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-benchmarks'] });
      queryClient.invalidateQueries({ queryKey: ['organization-benchmarks-latest'] });
    },
  });
}
