/**
 * useAutoReplenishment — CRUD for replenishment rules + events.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useReplenishmentRules(orgId: string | undefined) {
  return useQuery({
    queryKey: ['auto-replenishment-rules', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_replenishment_rules')
        .select('*, supplier_preferences(supplier_name)')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useReplenishmentEvents(
  orgId: string | undefined,
  statusFilter?: string
) {
  return useQuery({
    queryKey: ['auto-replenishment-events', orgId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('auto_replenishment_events')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useUpdateReplenishmentEvent(orgId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      status,
    }: {
      eventId: string;
      status: 'approved' | 'dismissed';
    }) => {
      const { error } = await supabase
        .from('auto_replenishment_events')
        .update({ status })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(
        status === 'approved'
          ? 'Replenishment approved'
          : 'Replenishment dismissed'
      );
      qc.invalidateQueries({ queryKey: ['auto-replenishment-events', orgId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
