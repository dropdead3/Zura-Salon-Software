import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceHealth {
  service_name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  response_time_ms: number | null;
  last_checked_at: string;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export interface SystemHealthSummary {
  services: ServiceHealth[];
  overallStatus: 'healthy' | 'degraded' | 'down';
  lastChecked: Date | null;
  syncStatus: {
    lastPhorestSync: Date | null;
    phorestStatus: 'success' | 'running' | 'failed' | 'unknown';
    pendingJobs: number;
  };
  queues: {
    pendingImports: number;
    pendingEmails: number;
    failedJobs: number;
  };
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: async (): Promise<SystemHealthSummary> => {
      // Fetch service health status
      const { data: services, error: servicesError } = await supabase
        .from('system_health_status')
        .select('*');

      if (servicesError) throw servicesError;

      // Fetch latest sync status from edge function logs
      const { data: latestSync, error: syncError } = await supabase
        .from('edge_function_logs')
        .select('*')
        .eq('function_name', 'sync-phorest-data')
        .order('started_at', { ascending: false })
        .limit(1);

      if (syncError) throw syncError;

      // Fetch pending imports count
      const { count: pendingImports } = await supabase
        .from('import_jobs')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'processing']);

      // Fetch failed jobs in last 24h
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const { count: failedJobs } = await supabase
        .from('edge_function_logs')
        .select('id', { count: 'exact', head: true })
        .in('status', ['error', 'timeout'])
        .gte('started_at', oneDayAgo.toISOString());

      // Transform services
      const servicesList: ServiceHealth[] = (services || []).map(s => ({
        service_name: s.service_name,
        status: s.status as ServiceHealth['status'],
        response_time_ms: s.response_time_ms,
        last_checked_at: s.last_checked_at,
        error_message: s.error_message,
        metadata: (s.metadata as Record<string, unknown>) || {},
      }));

      // Calculate overall status
      let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (servicesList.some(s => s.status === 'down')) {
        overallStatus = 'down';
      } else if (servicesList.some(s => s.status === 'degraded')) {
        overallStatus = 'degraded';
      }

      // Get latest sync info
      const syncRecord = latestSync?.[0];
      const phorestStatus = syncRecord 
        ? (syncRecord.status as 'success' | 'running' | 'error' === 'error' ? 'failed' : syncRecord.status as 'success' | 'running')
        : 'unknown';

      return {
        services: servicesList,
        overallStatus,
        lastChecked: servicesList.length > 0 
          ? new Date(Math.max(...servicesList.map(s => new Date(s.last_checked_at).getTime())))
          : null,
        syncStatus: {
          lastPhorestSync: syncRecord ? new Date(syncRecord.started_at) : null,
          phorestStatus: phorestStatus as 'success' | 'running' | 'failed' | 'unknown',
          pendingJobs: 0, // Would need a dedicated query
        },
        queues: {
          pendingImports: pendingImports || 0,
          pendingEmails: 0, // Would need email queue tracking
          failedJobs: failedJobs || 0,
        },
      };
    },
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 300, // 5 minutes
  });
}

export function useRefreshSystemHealth() {
  return async () => {
    // Trigger the health check edge function
    const response = await supabase.functions.invoke('check-system-health');
    if (response.error) throw response.error;
    return response.data;
  };
}
