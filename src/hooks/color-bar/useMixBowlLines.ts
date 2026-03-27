/**
 * useMixBowlLines — Query + Command-layer mutations for mix bowl lines.
 *
 * Mutations emit events via the command layer (source of truth),
 * then write to the projection table (mix_bowl_lines) for backward compat.
 * syncBowlTotals() is a projection update derived from line data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculateBowlWeight, calculateBowlCost } from '@/lib/backroom/mix-calculations';
import {
  executeRecordLineItem,
  executeRemoveLineItem,
} from '@/lib/backroom/commands/mixing-commands';
import { emitSessionEvent } from '@/lib/backroom/mix-session-service';
import { buildCommandMeta } from '@/lib/backroom/commands/types';

export interface MixBowlLine {
  id: string;
  bowl_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  brand_snapshot: string | null;
  dispensed_quantity: number;
  dispensed_unit: string;
  dispensed_cost_snapshot: number;
  captured_via: string;
  sequence_order: number;
  created_at: string;
}

export function useMixBowlLines(bowlId: string | null) {
  return useQuery({
    queryKey: ['mix-bowl-lines', bowlId],
    queryFn: async (): Promise<MixBowlLine[]> => {
      const { data, error } = await supabase
        .from('mix_bowl_lines')
        .select('*')
        .eq('bowl_id', bowlId!)
        .order('sequence_order', { ascending: true });

      if (error) throw error;
      return data as unknown as MixBowlLine[];
    },
    enabled: !!bowlId,
    staleTime: 30_000,
  });
}

/**
 * Recalculate and persist bowl totals from current lines (projection update).
 */
async function syncBowlTotals(bowlId: string) {
  const { data: lines, error: fetchError } = await supabase
    .from('mix_bowl_lines')
    .select('dispensed_quantity, dispensed_cost_snapshot, dispensed_unit')
    .eq('bowl_id', bowlId);

  if (fetchError) {
    console.error('Failed to fetch lines for bowl total sync:', fetchError);
    return;
  }

  const castLines = (lines ?? []) as unknown as Array<{
    dispensed_quantity: number;
    dispensed_cost_snapshot: number;
    dispensed_unit: string;
  }>;

  const totalWeight = calculateBowlWeight(castLines);
  const totalCost = calculateBowlCost(castLines);

  const { error: updateError } = await supabase
    .from('mix_bowls')
    .update({
      total_dispensed_weight: totalWeight,
      total_dispensed_cost: totalCost,
    })
    .eq('id', bowlId);

  if (updateError) {
    console.error('Failed to sync bowl totals:', updateError);
  }
}

/**
 * Add a bowl line: emit line_item_recorded event → write projection.
 */
export function useAddBowlLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      bowl_id: string;
      mix_session_id: string;
      organization_id: string;
      product_id?: string;
      product_name_snapshot: string;
      brand_snapshot?: string;
      dispensed_quantity: number;
      dispensed_unit?: string;
      dispensed_cost_snapshot: number;
      captured_via?: string;
      sequence_order: number;
      location_id?: string;
    }) => {
      // 1. Emit event via command layer (source of truth)
      if (params.product_id) {
        const meta = await buildCommandMeta('ui');
        await executeRecordLineItem({
          meta,
          organization_id: params.organization_id,
          mix_session_id: params.mix_session_id,
          bowl_id: params.bowl_id,
          product_id: params.product_id,
          quantity: params.dispensed_quantity,
          unit: params.dispensed_unit || 'g',
        });
      } else {
        // No product_id — emit raw event
        await emitSessionEvent({
          mix_session_id: params.mix_session_id,
          organization_id: params.organization_id,
          location_id: params.location_id,
          event_type: 'line_item_recorded',
          event_payload: {
            bowl_id: params.bowl_id,
            product_name: params.product_name_snapshot,
            quantity: params.dispensed_quantity,
            unit: params.dispensed_unit || 'g',
          },
          source_mode: params.captured_via === 'scale' ? 'scale' : 'manual',
        });
      }

      // 2. Write projection (mix_bowl_lines)
      // Auto-increment sequence_order
      const { data: maxRow } = await supabase
        .from('mix_bowl_lines')
        .select('sequence_order')
        .eq('bowl_id', params.bowl_id)
        .order('sequence_order', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = ((maxRow as any)?.sequence_order ?? 0) + 1;

      const { data, error } = await supabase
        .from('mix_bowl_lines')
        .insert({
          bowl_id: params.bowl_id,
          product_id: params.product_id || null,
          product_name_snapshot: params.product_name_snapshot,
          brand_snapshot: params.brand_snapshot || null,
          dispensed_quantity: params.dispensed_quantity,
          dispensed_unit: params.dispensed_unit || 'g',
          dispensed_cost_snapshot: params.dispensed_cost_snapshot,
          captured_via: params.captured_via || 'manual',
          sequence_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as MixBowlLine;
    },
    onSuccess: async (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mix-bowl-lines', vars.bowl_id] });
      await syncBowlTotals(vars.bowl_id);
      queryClient.invalidateQueries({ queryKey: ['mix-bowls'] });
    },
    onError: (error) => {
      toast.error('Failed to add product: ' + error.message);
    },
  });
}

/**
 * Update a bowl line: emit weight_adjusted event → write projection.
 */
export function useUpdateBowlLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bowlId, mixSessionId, organizationId, updates, locationId }: {
      id: string;
      bowlId: string;
      mixSessionId: string;
      organizationId: string;
      updates: Partial<Pick<MixBowlLine, 'dispensed_quantity' | 'dispensed_cost_snapshot'>>;
      locationId?: string;
    }) => {
      // 1. Emit event (source of truth)
      await emitSessionEvent({
        mix_session_id: mixSessionId,
        organization_id: organizationId,
        location_id: locationId,
        event_type: 'weight_adjusted',
        event_payload: { bowl_id: bowlId, line_id: id, ...updates },
        source_mode: 'manual',
      });

      // 2. Write projection
      const { data, error } = await supabase
        .from('mix_bowl_lines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as MixBowlLine;
    },
    onSuccess: async (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mix-bowl-lines', vars.bowlId] });
      await syncBowlTotals(vars.bowlId);
      queryClient.invalidateQueries({ queryKey: ['mix-bowls'] });
    },
    onError: (error) => {
      toast.error('Failed to update line: ' + error.message);
    },
  });
}

/**
 * Delete a bowl line: emit line_item_removed event → delete projection.
 */
export function useDeleteBowlLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bowlId, mixSessionId, organizationId, locationId }: {
      id: string;
      bowlId: string;
      mixSessionId: string;
      organizationId: string;
      locationId?: string;
    }) => {
      // 1. Emit event via command layer (source of truth)
      const meta = await buildCommandMeta('ui');
      await executeRemoveLineItem({
        meta,
        organization_id: organizationId,
        mix_session_id: mixSessionId,
        bowl_id: bowlId,
        line_id: id,
      });

      // 2. Delete projection
      const { error } = await supabase
        .from('mix_bowl_lines')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: async (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mix-bowl-lines', vars.bowlId] });
      await syncBowlTotals(vars.bowlId);
      queryClient.invalidateQueries({ queryKey: ['mix-bowls'] });
    },
    onError: (error) => {
      toast.error('Failed to remove product: ' + error.message);
    },
  });
}
