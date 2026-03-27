/**
 * useMixBowlProjection — Read derived bowl state from mix_bowl_projections.
 * Projection is maintained by the event trigger on mix_session_events.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MixBowlProjection {
  mix_bowl_id: string;
  mix_session_id: string;
  organization_id: string;
  bowl_number: number;
  purpose: string | null;
  current_status: string;
  line_item_count: number;
  dispensed_total: number;
  estimated_cost: number;
  leftover_total: number;
  net_usage_total: number;
  has_reweigh: boolean;
  last_event_at: string | null;
  updated_at: string;
}

export function useMixBowlProjection(sessionId: string | null) {
  return useQuery({
    queryKey: ['mix-bowl-projections', sessionId],
    queryFn: async (): Promise<MixBowlProjection[]> => {
      const { data, error } = await supabase
        .from('mix_bowl_projections')
        .select('*')
        .eq('mix_session_id', sessionId!)
        .order('bowl_number', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as MixBowlProjection[];
    },
    enabled: !!sessionId,
    staleTime: 5_000,
  });
}

export function useSingleBowlProjection(bowlId: string | null) {
  return useQuery({
    queryKey: ['mix-bowl-projection', bowlId],
    queryFn: async (): Promise<MixBowlProjection | null> => {
      const { data, error } = await supabase
        .from('mix_bowl_projections')
        .select('*')
        .eq('mix_bowl_id', bowlId!)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as MixBowlProjection | null;
    },
    enabled: !!bowlId,
    staleTime: 5_000,
  });
}
