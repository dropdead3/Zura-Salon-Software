import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AuditLogEntry } from './usePlatformAuditLog';

export interface AuditLogFilters {
  dateFrom?: Date;
  dateTo?: Date;
  actions?: string[];
  organizationId?: string;
  userId?: string;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogExplorerResult {
  logs: AuditLogEntry[];
  totalCount: number;
  totalPages: number;
}

export function usePlatformAuditLogExplorer(filters: AuditLogFilters = {}) {
  const { 
    dateFrom, 
    dateTo, 
    actions, 
    organizationId, 
    userId, 
    searchQuery,
    page = 1, 
    pageSize = 50 
  } = filters;

  return useQuery({
    queryKey: ['platform-audit-log-explorer', filters],
    queryFn: async (): Promise<AuditLogExplorerResult> => {
      // Build the query
      let query = supabase
        .from('platform_audit_log')
        .select(`
          id,
          organization_id,
          user_id,
          action,
          entity_type,
          entity_id,
          details,
          created_at,
          organizations:organization_id (name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }
      if (actions && actions.length > 0) {
        query = query.in('action', actions);
      }
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Fetch user names for the log entries
      const userIds = [...new Set((data || []).map(log => log.user_id).filter(Boolean))];
      
      let userMap: Record<string, { full_name: string; photo_url: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, full_name, photo_url')
          .in('user_id', userIds);
        
        if (profiles) {
          userMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = { full_name: p.full_name, photo_url: p.photo_url };
            return acc;
          }, {} as Record<string, { full_name: string; photo_url: string | null }>);
        }
      }

      // Transform and filter by search query if present
      let logs: AuditLogEntry[] = (data || []).map(log => ({
        id: log.id,
        organization_id: log.organization_id,
        user_id: log.user_id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        details: (log.details as Record<string, unknown>) || {},
        created_at: log.created_at,
        organization_name: (log.organizations as { name: string } | null)?.name,
        user_name: log.user_id ? userMap[log.user_id]?.full_name : undefined,
        user_photo: log.user_id ? userMap[log.user_id]?.photo_url : undefined,
      }));

      // Client-side search filtering (for details JSON)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        logs = logs.filter(log => 
          log.action.toLowerCase().includes(query) ||
          log.organization_name?.toLowerCase().includes(query) ||
          log.user_name?.toLowerCase().includes(query) ||
          log.entity_type?.toLowerCase().includes(query) ||
          JSON.stringify(log.details).toLowerCase().includes(query)
        );
      }

      return {
        logs,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    staleTime: 1000 * 30,
  });
}

// Export utility for CSV/JSON export
export function exportAuditLogs(logs: AuditLogEntry[], format: 'csv' | 'json') {
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `audit-log-${new Date().toISOString().split('T')[0]}.json`);
  } else {
    const headers = ['Timestamp', 'Action', 'User', 'Organization', 'Entity Type', 'Entity ID', 'Details'];
    const rows = logs.map(log => [
      log.created_at,
      log.action,
      log.user_name || log.user_id || 'System',
      log.organization_name || log.organization_id || '-',
      log.entity_type || '-',
      log.entity_id || '-',
      JSON.stringify(log.details),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `audit-log-${new Date().toISOString().split('T')[0]}.csv`);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Get unique actions for filter dropdown
export function useAuditLogActions() {
  return useQuery({
    queryKey: ['platform-audit-log-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_audit_log')
        .select('action')
        .limit(1000);
      
      if (error) throw error;
      
      const uniqueActions = [...new Set(data?.map(d => d.action) || [])];
      return uniqueActions.sort();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
