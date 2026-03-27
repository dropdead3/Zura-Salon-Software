/**
 * useBackroomExceptions — Query hook (read-only).
 * useResolveException — Thin wrapper around ExceptionService.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { resolveException } from '@/lib/backroom/services/exception-service';

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

/**
 * Thin wrapper — delegates to ExceptionService.resolveException().
 */
export function useResolveException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      exceptionId: string;
      action: 'acknowledged' | 'resolved' | 'dismissed';
      notes?: string;
    }) => {
      await resolveException(params);
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
