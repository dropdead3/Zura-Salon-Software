import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EdgeFunctionLog {
  id: string;
  function_name: string;
  status: 'running' | 'success' | 'error' | 'timeout';
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  organization_id: string | null;
  triggered_by: string;
}

export interface JobStats {
  totalRuns24h: number;
  successCount: number;
  errorCount: number;
  avgDuration: number;
}

// Job configuration - maps function names to their schedule info
export const JOB_CONFIG: Record<string, { 
  schedule: string; 
  category: 'sync' | 'notifications' | 'snapshots' | 'maintenance';
  description: string;
}> = {
  'sync-phorest-data': { schedule: 'Every 15 minutes', category: 'sync', description: 'Syncs appointments from Phorest' },
  'sync-phorest-services': { schedule: 'Daily at 6:00 AM', category: 'sync', description: 'Syncs services catalog' },
  'sync-callrail-calls': { schedule: 'Every 30 minutes', category: 'sync', description: 'Syncs call tracking data' },
  'send-daily-reminders': { schedule: 'Daily at 8:00 AM', category: 'notifications', description: 'Sends daily reminder emails' },
  'send-birthday-reminders': { schedule: 'Daily at 7:00 AM', category: 'notifications', description: 'Sends birthday notifications' },
  'check-lead-sla': { schedule: 'Every 5 minutes', category: 'notifications', description: 'Checks lead response SLAs' },
  'send-inactivity-alerts': { schedule: 'Daily at 9:00 AM', category: 'notifications', description: 'Alerts for inactive users' },
  'record-staffing-snapshot': { schedule: 'Daily at midnight', category: 'snapshots', description: 'Records daily staffing levels' },
  'update-sales-leaderboard': { schedule: 'Every hour', category: 'snapshots', description: 'Updates sales rankings' },
  'check-expired-assignments': { schedule: 'Every 10 minutes', category: 'maintenance', description: 'Cleans up expired assistant assignments' },
};

export const JOB_CATEGORIES = {
  sync: { label: 'Data Sync', color: 'blue' as const },
  notifications: { label: 'Notifications', color: 'violet' as const },
  snapshots: { label: 'Snapshots & Reports', color: 'emerald' as const },
  maintenance: { label: 'Maintenance', color: 'amber' as const },
};

export function useEdgeFunctionLogs(functionName?: string, limit = 50) {
  return useQuery({
    queryKey: ['edge-function-logs', functionName, limit],
    queryFn: async (): Promise<EdgeFunctionLog[]> => {
      let query = supabase
        .from('edge_function_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (functionName) {
        query = query.eq('function_name', functionName);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(log => ({
        ...log,
        status: log.status as EdgeFunctionLog['status'],
        metadata: (log.metadata as Record<string, unknown>) || {},
      }));
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 120, // Auto-refresh every 2 minutes
  });
}

export function useJobStats(hours = 24) {
  return useQuery({
    queryKey: ['job-stats', hours],
    queryFn: async (): Promise<Record<string, JobStats>> => {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      const { data, error } = await supabase
        .from('edge_function_logs')
        .select('function_name, status, duration_ms')
        .gte('started_at', since.toISOString());

      if (error) throw error;

      const stats: Record<string, JobStats> = {};
      
      for (const log of data || []) {
        if (!stats[log.function_name]) {
          stats[log.function_name] = {
            totalRuns24h: 0,
            successCount: 0,
            errorCount: 0,
            avgDuration: 0,
          };
        }
        
        const s = stats[log.function_name];
        s.totalRuns24h++;
        if (log.status === 'success') s.successCount++;
        if (log.status === 'error' || log.status === 'timeout') s.errorCount++;
        if (log.duration_ms) {
          s.avgDuration = ((s.avgDuration * (s.totalRuns24h - 1)) + log.duration_ms) / s.totalRuns24h;
        }
      }

      return stats;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useLatestJobRuns() {
  return useQuery({
    queryKey: ['latest-job-runs'],
    queryFn: async (): Promise<Record<string, EdgeFunctionLog>> => {
      // Get the latest run for each known function
      const functionNames = Object.keys(JOB_CONFIG);
      
      const { data, error } = await supabase
        .from('edge_function_logs')
        .select('*')
        .in('function_name', functionNames)
        .order('started_at', { ascending: false });

      if (error) throw error;

      const latest: Record<string, EdgeFunctionLog> = {};
      
      for (const log of data || []) {
        if (!latest[log.function_name]) {
          latest[log.function_name] = {
            ...log,
            status: log.status as EdgeFunctionLog['status'],
            metadata: (log.metadata as Record<string, unknown>) || {},
          };
        }
      }

      return latest;
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 120, // 2 minutes
  });
}

export function useTriggerJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (functionName: string) => {
      const response = await supabase.functions.invoke('trigger-scheduled-job', {
        body: { functionName },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edge-function-logs'] });
      queryClient.invalidateQueries({ queryKey: ['latest-job-runs'] });
      queryClient.invalidateQueries({ queryKey: ['job-stats'] });
    },
  });
}
