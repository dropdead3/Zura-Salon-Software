/**
 * useDockMixSession — Orchestrates session + bowl creation and line item recording
 * for the Dock dispensing flow. Wraps the command layer.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildCommandMeta } from '@/lib/backroom/commands/types';
import {
  executeStartMixSession,
  executeRecordLineItem,
  executeSealBowl,
  executeCaptureReweigh,
} from '@/lib/backroom/commands/mixing-commands';
import { emitSessionEvent } from '@/lib/backroom/mix-session-service';
import type { FormulaLine } from '@/components/dock/mixing/DockFormulaBuilder';

export interface CreatedBowlResult {
  sessionId: string;
  bowlId: string;
  bowlNumber: number;
}

/**
 * Create a mix session + first bowl + record line items from the formula builder.
 */
export function useCreateDockBowl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appointmentId: string;
      organizationId: string;
      locationId?: string;
      staffUserId: string;
      lines: FormulaLine[];
      baseWeight: number;
    }): Promise<CreatedBowlResult> => {
      const meta = await buildCommandMeta('ui');

      // 1. Create mix_session row
      const { data: session, error: sessionErr } = await supabase
        .from('mix_sessions')
        .insert({
          appointment_id: params.appointmentId,
          organization_id: params.organizationId,
          location_id: params.locationId || null,
          stylist_user_id: params.staffUserId,
          status: 'draft',
          is_manual_override: true,
        })
        .select('id')
        .single();

      if (sessionErr) throw sessionErr;
      const sessionId = (session as any).id as string;

      // 2. Emit session_created event
      await emitSessionEvent({
        mix_session_id: sessionId,
        organization_id: params.organizationId,
        location_id: params.locationId,
        event_type: 'session_created',
        event_payload: { appointment_id: params.appointmentId },
        source_mode: 'manual',
      });

      // 3. Start session via command
      await executeStartMixSession({
        meta,
        organization_id: params.organizationId,
        mix_session_id: sessionId,
      });

      // 4. Create bowl row
      const { data: bowl, error: bowlErr } = await supabase
        .from('mix_bowls')
        .insert({
          mix_session_id: sessionId,
          bowl_number: 1,
          bowl_name: 'Bowl 1',
          purpose: 'color',
        })
        .select('id')
        .single();

      if (bowlErr) throw bowlErr;
      const bowlId = (bowl as any).id as string;

      // 5. Emit bowl_created event
      await emitSessionEvent({
        mix_session_id: sessionId,
        organization_id: params.organizationId,
        location_id: params.locationId,
        event_type: 'bowl_created',
        event_payload: { bowl_id: bowlId, bowl_number: 1, purpose: 'color' },
        source_mode: 'manual',
      }, 'active');

      // 6. Record line items for each formula ingredient
      for (const line of params.lines) {
        const quantity = line.targetWeight * line.ratio;

        // Write line item to mix_bowl_lines
        await supabase
          .from('mix_bowl_lines')
          .insert({
            bowl_id: bowlId,
            product_id: line.product.id,
            product_name_snapshot: line.product.name,
            brand_snapshot: line.product.brand,
            dispensed_quantity: quantity,
            dispensed_unit: line.product.default_unit || 'g',
            dispensed_cost_snapshot: line.product.wholesale_price || 0,
          });

        // Emit line_item_recorded event
        await emitSessionEvent({
          mix_session_id: sessionId,
          organization_id: params.organizationId,
          location_id: params.locationId,
          event_type: 'line_item_recorded',
          event_payload: {
            bowl_id: bowlId,
            product_id: line.product.id,
            dispensed_quantity: quantity,
            dispensed_cost_snapshot: line.product.wholesale_price || 0,
          },
          source_mode: 'manual',
        }, 'active');
      }

      return { sessionId, bowlId, bowlNumber: 1 };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['dock-mix-sessions', vars.appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['mix-bowls'] });
      toast.success('Bowl created');
    },
    onError: (error) => {
      console.error('[useDockMixSession] Failed:', error);
      toast.error('Failed to create bowl: ' + (error as Error).message);
    },
  });
}

/**
 * Record a dispensed weight for an existing line item.
 */
export function useRecordDispensedWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      organizationId: string;
      bowlId: string;
      lineId: string;
      actualWeight: number;
    }) => {
      // Update the line item's dispensed quantity
      const { error } = await supabase
        .from('mix_bowl_lines')
        .update({ dispensed_quantity: params.actualWeight })
        .eq('id', params.lineId);

      if (error) throw error;

      // Emit weight capture event
      await emitSessionEvent({
        mix_session_id: params.sessionId,
        organization_id: params.organizationId,
        event_type: 'weight_captured',
        event_payload: {
          bowl_id: params.bowlId,
          line_id: params.lineId,
          weight: params.actualWeight,
          unit: 'g',
          capture_method: 'manual',
        },
        source_mode: 'manual',
      }, 'active');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dock-bowl-lines'] });
    },
  });
}

/**
 * Seal a bowl (marks it done, ready for reweigh).
 */
export function useSealDockBowl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      organizationId: string;
      bowlId: string;
    }) => {
      const meta = await buildCommandMeta('ui');
      const result = await executeSealBowl({
        meta,
        organization_id: params.organizationId,
        mix_session_id: params.sessionId,
        bowl_id: params.bowlId,
      });

      if (!result.success) {
        throw new Error(result.errors?.[0]?.message || 'Failed to seal bowl');
      }

      // Update projection
      await supabase
        .from('mix_bowls')
        .update({ status: 'sealed', completed_at: new Date().toISOString() })
        .eq('id', params.bowlId);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dock-mix-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['mix-bowls'] });
      toast.success('Bowl sealed');
    },
    onError: (error) => {
      toast.error('Failed to seal bowl: ' + (error as Error).message);
    },
  });
}

/**
 * Capture reweigh for a sealed bowl.
 */
export function useReweighDockBowl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      organizationId: string;
      bowlId: string;
      leftoverWeight: number;
    }) => {
      const meta = await buildCommandMeta('ui');
      const result = await executeCaptureReweigh({
        meta,
        organization_id: params.organizationId,
        mix_session_id: params.sessionId,
        bowl_id: params.bowlId,
        weight: params.leftoverWeight,
      });

      if (!result.success) {
        throw new Error(result.errors?.[0]?.message || 'Failed to capture reweigh');
      }

      // Update projection
      await supabase
        .from('mix_bowls')
        .update({
          status: 'reweighed',
          leftover_weight: params.leftoverWeight,
          completed_at: new Date().toISOString(),
        })
        .eq('id', params.bowlId);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dock-mix-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['mix-bowls'] });
      toast.success('Reweigh captured');
    },
    onError: (error) => {
      toast.error('Failed to capture reweigh: ' + (error as Error).message);
    },
  });
}
