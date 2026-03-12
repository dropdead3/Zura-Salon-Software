/**
 * useBackroomExceptions — CRUD for the exception inbox.
 * useResolveException — Resolve/dismiss with notes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface BackroomException {
  id: string;
  organization_id: string;
  location_id: string | null;
  exception_type: string;
  severity: string;
  title: string;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  staff_user_id: string | null;
  metric_value: number | null;
  threshold_value: number | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolved_notes: string | null;
  created_at: string;
}

export interface ExceptionFilters {
  status?: string;
  exceptionType?: string;
  severity?: string;
  locationId?: string;
  staffUserId?: string;
  startDate?: string;
  endDate?: string;
}

export function useBackroomExceptions(filters?: ExceptionFilters) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['backroom-exceptions', orgId, filters],
    queryFn: async (): Promise<BackroomException[]> => {
      let query = supabase
        .from('backroom_exceptions' as any)
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.exceptionType) query = query.eq('exception_type', filters.exceptionType);
      if (filters?.severity) query = query.eq('severity', filters.severity);
      if (filters?.locationId) query = query.eq('location_id', filters.locationId);
      if (filters?.staffUserId) query = query.eq('staff_user_id', filters.staffUserId);
      if (filters?.startDate) query = query.gte('created_at', filters.startDate);
      if (filters?.endDate) query = query.lte('created_at', filters.endDate + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as BackroomException[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useResolveException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      exceptionId: string;
      action: 'acknowledged' | 'resolved' | 'dismissed';
      notes?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { error } = await supabase
        .from('backroom_exceptions' as any)
        .update({
          status: params.action,
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
          resolved_notes: params.notes ?? null,
        } as any)
        .eq('id', params.exceptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-exceptions'] });
      toast.success('Exception updated');
    },
    onError: (err) => {
      toast.error('Failed to update exception: ' + err.message);
    },
  });
}
