/**
 * useMixBowls — Query + Command-layer mutations for mix bowls.
 *
 * Mutations emit events via the command layer (source of truth),
 * then write to the projection table (mix_bowls) for backward compat.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MixBowlStatus } from '@/lib/backroom/bowl-state-machine';
import { canTransitionBowl } from '@/lib/backroom/bowl-state-machine';
import {
  executeCreateBowl,
  executeSealBowl,
  executeCaptureReweigh,
} from '@/lib/backroom/commands/mixing-commands';
import { emitSessionEvent } from '@/lib/backroom/mix-session-service';
import { buildCommandMeta } from '@/lib/backroom/commands/types';

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

/**
 * Create a bowl: emit bowl_created event → write projection.
 */
export function useCreateMixBowl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      mix_session_id: string;
      organization_id: string;
      bowl_number: number;
      bowl_name?: string;
      purpose?: string;
      location_id?: string;
    }) => {
      const meta = await buildCommandMeta('ui');

      // 1. Emit event via command layer (source of truth)
      await executeCreateBowl({
        meta,
        organization_id: params.organization_id,
        mix_session_id: params.mix_session_id,
        bowl_payload: {
          bowl_number: params.bowl_number,
          bowl_name: params.bowl_name,
          purpose: params.purpose,
        },
      });

      // 2. Write projection (mix_bowls)
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

/**
 * Update bowl status: emit appropriate event → write projection.
 */
export function useUpdateBowlStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sessionId, organizationId, currentStatus, newStatus, totals, locationId }: {
      id: string;
      sessionId: string;
      organizationId: string;
      currentStatus: MixBowlStatus;
      newStatus: MixBowlStatus;
      locationId?: string;
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

      // 1. Emit event (source of truth)
      const meta = await buildCommandMeta('ui');

      if (newStatus === 'sealed') {
        await executeSealBowl({
          meta,
          organization_id: organizationId,
          mix_session_id: sessionId,
          bowl_id: id,
        });
      } else if (newStatus === 'discarded') {
        await emitSessionEvent({
          mix_session_id: sessionId,
          organization_id: organizationId,
          location_id: locationId,
          event_type: 'bowl_discarded',
          event_payload: { bowl_id: id },
          source_mode: 'manual',
        });
      } else if (newStatus === 'reweighed') {
        await executeCaptureReweigh({
          meta,
          organization_id: organizationId,
          mix_session_id: sessionId,
          bowl_id: id,
          weight: totals?.leftover_weight ?? 0,
        });
      }

      // 2. Write projection (mix_bowls)
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
