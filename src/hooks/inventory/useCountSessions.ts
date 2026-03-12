/**
 * useCountSessions — CRUD for physical count sessions.
 * Groups individual stock_counts into a single counting event.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface CountSession {
  id: string;
  organization_id: string;
  location_id: string | null;
  status: string;
  started_by: string | null;
  completed_at: string | null;
  notes: string | null;
  total_products_counted: number;
  total_variance_units: number;
  total_variance_cost: number;
  created_at: string;
  updated_at: string;
}

export function useCountSessions(filters?: { status?: string }) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['count-sessions', orgId, filters],
    queryFn: async (): Promise<CountSession[]> => {
      let query = supabase
        .from('count_sessions')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as CountSession[];
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

export function useCreateCountSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      location_id?: string;
      notes?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from('count_sessions')
        .insert({
          organization_id: params.organization_id,
          location_id: params.location_id ?? null,
          started_by: userId,
          notes: params.notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as CountSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['count-sessions'] });
      toast.success('Count session started');
    },
    onError: (error) => {
      toast.error('Failed to start count: ' + error.message);
    },
  });
}

export function useCompleteCountSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, totalCounted, totalVarianceUnits, totalVarianceCost }: {
      sessionId: string;
      totalCounted: number;
      totalVarianceUnits: number;
      totalVarianceCost: number;
    }) => {
      const { data, error } = await supabase
        .from('count_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          total_products_counted: totalCounted,
          total_variance_units: totalVarianceUnits,
          total_variance_cost: totalVarianceCost,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as CountSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['count-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Count session completed');
    },
    onError: (error) => {
      toast.error('Failed to complete count: ' + error.message);
    },
  });
}
