import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface AuditLogEntry {
  id: string;
  appointment_id: string;
  organization_id: string;
  event_type: string;
  actor_user_id: string | null;
  actor_name: string | null;
  previous_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export function useAuditLog(
  appointmentId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['appointment-audit-log', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointment_audit_log')
        .select('*')
        .eq('appointment_id', appointmentId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as AuditLogEntry[];
    },
    enabled: !!appointmentId && (options?.enabled ?? true),
    staleTime: 30_000,
  });
}

interface LogAuditEventParams {
  appointmentId: string;
  organizationId: string;
  eventType: string;
  previousValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

export function useLogAuditEvent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogAuditEventParams) => {
      const actorName = user?.user_metadata?.full_name || user?.email || 'System';
      const { error } = await supabase
        .from('appointment_audit_log')
        .insert({
          appointment_id: params.appointmentId,
          organization_id: params.organizationId,
          event_type: params.eventType,
          actor_user_id: user?.id || null,
          actor_name: actorName,
          previous_value: params.previousValue || null,
          new_value: params.newValue || null,
          metadata: params.metadata || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-audit-log', variables.appointmentId] });
    },
  });
}
