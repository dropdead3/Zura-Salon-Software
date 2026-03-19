/**
 * useAuditSchedule — CRUD for inventory audit schedule entries.
 * Tracks scheduled audits, completion, and compliance.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { addDays, addWeeks, addMonths } from 'date-fns';

export interface AuditScheduleEntry {
  id: string;
  organization_id: string;
  location_id: string | null;
  due_date: string;
  status: string;
  completed_by: string | null;
  completed_at: string | null;
  count_session_id: string | null;
  reminder_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useAuditSchedule(filters?: { status?: string; limit?: number }) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['audit-schedule', orgId, filters],
    queryFn: async (): Promise<AuditScheduleEntry[]> => {
      let query = supabase
        .from('inventory_audit_schedule')
        .select('*')
        .eq('organization_id', orgId!)
        .order('due_date', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as AuditScheduleEntry[];
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

export function useNextPendingAudit() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['audit-schedule-next', orgId],
    queryFn: async (): Promise<AuditScheduleEntry | null> => {
      const { data, error } = await supabase
        .from('inventory_audit_schedule')
        .select('*')
        .eq('organization_id', orgId!)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as AuditScheduleEntry | null;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

export function useMarkAuditComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ auditId, countSessionId }: {
      auditId: string;
      countSessionId?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase
        .from('inventory_audit_schedule')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: userId,
          count_session_id: countSessionId ?? null,
        })
        .eq('id', auditId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AuditScheduleEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['audit-schedule-next'] });
      toast.success('Audit marked as complete');
    },
    onError: (error) => {
      toast.error('Failed to complete audit: ' + error.message);
    },
  });
}

export function useSkipAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ auditId, reason }: { auditId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('inventory_audit_schedule')
        .update({
          status: 'skipped',
          notes: reason,
        })
        .eq('id', auditId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AuditScheduleEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['audit-schedule-next'] });
      toast.success('Audit skipped');
    },
    onError: (error) => {
      toast.error('Failed to skip audit: ' + error.message);
    },
  });
}

function getNextDueDate(frequency: string, fromDate?: Date): Date {
  const base = fromDate ?? new Date();
  switch (frequency) {
    case 'weekly': return addWeeks(base, 1);
    case 'biweekly': return addWeeks(base, 2);
    case 'quarterly': return addMonths(base, 3);
    case 'monthly':
    default: return addMonths(base, 1);
  }
}

export function useGenerateNextAudit() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ frequency, locationId }: { frequency: string; locationId?: string }) => {
      const dueDate = getNextDueDate(frequency);
      const { data, error } = await supabase
        .from('inventory_audit_schedule')
        .insert({
          organization_id: orgId!,
          location_id: locationId ?? null,
          due_date: dueDate.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AuditScheduleEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['audit-schedule-next'] });
      toast.success('Next audit scheduled');
    },
    onError: (error) => {
      toast.error('Failed to generate audit: ' + error.message);
    },
  });
}
