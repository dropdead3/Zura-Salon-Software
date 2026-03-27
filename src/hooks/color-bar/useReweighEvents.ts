import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReweighEvent {
  id: string;
  bowl_id: string;
  mix_session_id: string;
  leftover_quantity: number;
  leftover_unit: string;
  captured_via: string;
  weighed_by_staff_id: string | null;
  weighed_at: string;
  notes: string | null;
  created_at: string;
}

export function useReweighEvents(sessionId: string | null) {
  return useQuery({
    queryKey: ['reweigh-events', sessionId],
    queryFn: async (): Promise<ReweighEvent[]> => {
      const { data, error } = await supabase
        .from('reweigh_events')
        .select('*')
        .eq('mix_session_id', sessionId!)
        .order('weighed_at', { ascending: true });

      if (error) throw error;
      return data as unknown as ReweighEvent[];
    },
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

export function useCreateReweighEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      bowl_id: string;
      mix_session_id: string;
      leftover_quantity: number;
      leftover_unit?: string;
      captured_via?: string;
      weighed_by_staff_id?: string;
      notes?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase
        .from('reweigh_events')
        .insert({
          bowl_id: params.bowl_id,
          mix_session_id: params.mix_session_id,
          leftover_quantity: params.leftover_quantity,
          leftover_unit: params.leftover_unit || 'g',
          captured_via: params.captured_via || 'manual',
          weighed_by_staff_id: params.weighed_by_staff_id || userId || null,
          notes: params.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ReweighEvent;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['reweigh-events', vars.mix_session_id] });
      queryClient.invalidateQueries({ queryKey: ['mix-bowls'] });
      toast.success('Reweigh recorded');
    },
    onError: (error) => {
      toast.error('Failed to record reweigh: ' + error.message);
    },
  });
}
