import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InfraMetric {
  id: string;
  metric_type: string;
  metric_key: string;
  value: number;
  unit: string | null;
  threshold_warning: number | null;
  threshold_critical: number | null;
  status: string;
  metadata: Record<string, unknown>;
  recorded_at: string;
}

export interface InfrastructureSummary {
  dbConnections: {
    latest: InfraMetric | null;
    history: InfraMetric[];
  };
  edgeFunctions: {
    coldStartRate: InfraMetric | null;
    functions: InfraMetric[];
  };
  storage: {
    total: InfraMetric | null;
    buckets: InfraMetric[];
  };
}

export function useInfrastructureMetrics() {
  return useQuery({
    queryKey: ['infrastructure-metrics'],
    queryFn: async (): Promise<InfrastructureSummary> => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Fetch latest metrics (last snapshot per type/key)
      const { data: latest, error: latestErr } = await supabase
        .from('infrastructure_metrics')
        .select('*')
        .gte('recorded_at', oneDayAgo)
        .order('recorded_at', { ascending: false })
        .limit(200);

      if (latestErr) throw latestErr;

      const metrics = (latest || []).map((m: any) => ({
        id: m.id,
        metric_type: m.metric_type,
        metric_key: m.metric_key,
        value: m.value,
        unit: m.unit,
        threshold_warning: m.threshold_warning,
        threshold_critical: m.threshold_critical,
        status: m.status,
        metadata: (m.metadata as Record<string, unknown>) || {},
        recorded_at: m.recorded_at,
      }));

      // DB connections — get latest + history for sparkline
      const dbMetrics = metrics.filter(m => m.metric_type === 'db_connections' && m.metric_key === 'pool_utilization');
      const dbLatest = dbMetrics[0] || null;

      // Edge function perf
      const efMetrics = metrics.filter(m => m.metric_type === 'edge_function_perf');
      // Get only the latest entry per function
      const seenFunctions = new Set<string>();
      const latestFunctions: InfraMetric[] = [];
      const coldStartMetric = efMetrics.find(m => m.metric_key === 'cold_start_rate') || null;
      
      for (const m of efMetrics) {
        if (m.metric_key === 'cold_start_rate') continue;
        if (!seenFunctions.has(m.metric_key)) {
          seenFunctions.add(m.metric_key);
          latestFunctions.push(m);
        }
      }

      // Storage
      const storageMetrics = metrics.filter(m => m.metric_type === 'storage_usage');
      const storageTotal = storageMetrics.find(m => m.metric_key === 'total') || null;
      const seenBuckets = new Set<string>();
      const latestBuckets: InfraMetric[] = [];
      for (const m of storageMetrics) {
        if (m.metric_key === 'total') continue;
        if (!seenBuckets.has(m.metric_key)) {
          seenBuckets.add(m.metric_key);
          latestBuckets.push(m);
        }
      }

      return {
        dbConnections: {
          latest: dbLatest,
          history: dbMetrics.slice(0, 96), // ~24h at 15min intervals
        },
        edgeFunctions: {
          coldStartRate: coldStartMetric,
          functions: latestFunctions,
        },
        storage: {
          total: storageTotal,
          buckets: latestBuckets,
        },
      };
    },
    staleTime: 15 * 60_000, // 15 minutes (matches monitor-infrastructure cron — Wave 22.36)
    refetchInterval: 15 * 60_000,
  });
}

export function useRefreshInfrastructureMetrics() {
  return async () => {
    const response = await supabase.functions.invoke('monitor-infrastructure');
    if (response.error) throw response.error;
    return response.data;
  };
}
