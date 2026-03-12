import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MixBowlStatus } from '@/lib/backroom/bowl-state-machine';
import { canTransitionBowl } from '@/lib/backroom/bowl-state-machine';

export interface MixBowl {
  id: string;
  mix_session_id: string;
  bowl_number: number;
  bowl_name: string | null;
  purpose: string | null;
  started_at: string;
  completed_at: string | null;
  status: MixBowlStatus;
  total_dispensed_weight: number;
  total_dispensed_cost: number;
  leftover_weight: number | null;
  net_usage_weight: number | null;
  created_at: string;
  updated_at: string;
}

export function useMixBowls(sessionId: string | null) {
  return useQuery({
    queryKey: ['mix-bowls', sessionId],
    queryFn: async (): Promise<MixBowl[]> => {
      const { data, error } = await supabase
        .from('mix_bowls')
        .select('*')
        .eq('mix_session_id', sessionId!)
        .order('bowl_number', { ascending: true });

      if (error) throw error;
      return data as unknown as MixBowl[];
    },
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

export function useCreateMixBowl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      mix_session_id: string;
      bowl_number: number;
      bowl_name?: string;
      purpose?: string;
    }) => {
      const { data, error } = await supabase
        .from('mix_bowls')
        .insert({
          mix_session_id: params.mix_session_id,
          bowl_number: params.bowl_number,
          bowl_name: params.bowl_name || null,
          purpose: params.purpose || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as MixBowl;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mix-bowls', vars.mix_session_id] });
    },
    onError: (error) => {
      toast.error('Failed to add bowl: ' + error.message);
    },
  });
}

export function useUpdateBowlStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sessionId, currentStatus, newStatus, totals }: {
      id: string;
      sessionId: string;
      currentStatus: MixBowlStatus;
      newStatus: MixBowlStatus;
      totals?: {
        total_dispensed_weight?: number;
        total_dispensed_cost?: number;
        leftover_weight?: number;
        net_usage_weight?: number;
      };
    }) => {
      if (!canTransitionBowl(currentStatus, newStatus)) {
        throw new Error(`Invalid bowl transition: ${currentStatus} → ${newStatus}`);
      }

      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'sealed' || newStatus === 'reweighed' || newStatus === 'discarded') {
        updates.completed_at = new Date().toISOString();
      }
      if (totals) {
        Object.assign(updates, totals);
      }

      const { data, error } = await supabase
        .from('mix_bowls')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as MixBowl;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mix-bowls', vars.sessionId] });
    },
    onError: (error) => {
      toast.error('Failed to update bowl: ' + error.message);
    },
  });
}
