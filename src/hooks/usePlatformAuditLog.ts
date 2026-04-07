import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface AuditLogEntry {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  // Joined data
  organization_name?: string;
  user_name?: string;
  user_photo?: string;
}

interface UsePlatformAuditLogOptions {
  limit?: number;
  organizationId?: string;
}

export function usePlatformAuditLog(options: UsePlatformAuditLogOptions = {}) {
  const { limit = 10, organizationId } = options;

  return useQuery({
    queryKey: ['platform-audit-log', limit, organizationId],
    queryFn: async (): Promise<AuditLogEntry[]> => {
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
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

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

      return (data || []).map(log => ({
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
    },
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 300, // Refetch every 5 minutes (platform admin)
  });
}

export function useLogPlatformAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organizationId?: string;
      action: string;
      entityType?: string;
      entityId?: string;
      details?: Record<string, Json>;
    }) => {
      const { data, error } = await supabase
        .from('platform_audit_log')
        .insert({
          organization_id: params.organizationId,
          action: params.action,
          entity_type: params.entityType,
          entity_id: params.entityId,
          details: params.details,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-audit-log'] });
    },
  });
}

// Action type labels and icons
export const AUDIT_ACTION_CONFIG: Record<string, { 
  label: string; 
  color: 'violet' | 'emerald' | 'amber' | 'rose' | 'blue' | 'slate';
  verb: string;
}> = {
  dashboard_accessed: { label: 'Dashboard Access', color: 'blue', verb: 'accessed dashboard for' },
  account_created: { label: 'Account Created', color: 'emerald', verb: 'created account' },
  account_updated: { label: 'Account Updated', color: 'violet', verb: 'updated account' },
  account_activated: { label: 'Account Activated', color: 'emerald', verb: 'activated account' },
  account_deactivated: { label: 'Account Deactivated', color: 'amber', verb: 'deactivated account' },
  migration_started: { label: 'Migration Started', color: 'blue', verb: 'started migration for' },
  migration_completed: { label: 'Migration Complete', color: 'emerald', verb: 'completed migration for' },
  migration_failed: { label: 'Migration Failed', color: 'rose', verb: 'migration failed for' },
  user_impersonated: { label: 'Impersonation', color: 'amber', verb: 'impersonated user in' },
  settings_updated: { label: 'Settings Updated', color: 'violet', verb: 'updated settings' },
  permission_changed: { label: 'Permission Changed', color: 'amber', verb: 'changed permissions for' },
  coaching_email_sent: { label: 'Coaching Email', color: 'violet', verb: 'sent coaching email to' },
  brand_removed: { label: 'Brand Removed', color: 'rose', verb: 'removed brand' },
  brand_restored: { label: 'Brand Restored', color: 'emerald', verb: 'restored brand' },
  commission_rate_updated: { label: 'Commission Updated', color: 'violet', verb: 'updated commission rates for' },
};

export function getAuditActionConfig(action: string) {
  return AUDIT_ACTION_CONFIG[action] || { 
    label: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
    color: 'slate' as const,
    verb: action.replace(/_/g, ' ')
  };
}
