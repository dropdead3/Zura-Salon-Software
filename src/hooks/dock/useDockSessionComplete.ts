/**
 * useDockSessionComplete — Handles session completion and unresolved flagging.
 * Wraps the command layer to finalize a mix session.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { emitSessionEvent } from '@/lib/backroom/mix-session-service';

/**
 * Complete a mix session (all bowls reweighed or accepted as-is).
 */
export function useCompleteDockSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      organizationId: string;
      locationId?: string;
      notes?: string;
    }) => {
      // Update session status
      const { error } = await supabase
        .from('mix_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: params.notes || null,
        })
        .eq('id', params.sessionId);

      if (error) throw error;

      // Emit session_completed event
      await emitSessionEvent({
        mix_session_id: params.sessionId,
        organization_id: params.organizationId,
        location_id: params.locationId,
        event_type: 'session_completed',
        event_payload: { notes: params.notes || null },
        source_mode: 'manual',
      }, 'completed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dock-mix-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['mix-bowls'] });
      toast.success('Session completed');
    },
    onError: (error) => {
      toast.error('Failed to complete session: ' + (error as Error).message);
    },
  });
}

/**
 * Mark a session as unresolved (exception requiring manager review).
 */
export function useMarkDockSessionUnresolved() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      organizationId: string;
      locationId?: string;
      reason: string;
    }) => {
      // Use 'completed' status with unresolved_flag=true since DB enum doesn't have 'unresolved_exception'
      const { error } = await supabase
        .from('mix_sessions')
        .update({
          status: 'completed',
          unresolved_flag: true,
          unresolved_reason: params.reason,
        })
        .eq('id', params.sessionId);

      if (error) throw error;

      await emitSessionEvent({
        mix_session_id: params.sessionId,
        organization_id: params.organizationId,
        location_id: params.locationId,
        event_type: 'session_marked_unresolved',
        event_payload: { reason: params.reason },
        source_mode: 'manual',
      }, 'unresolved_exception');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dock-mix-sessions'] });
      toast.success('Session flagged for review');
    },
    onError: (error) => {
      toast.error('Failed to flag session: ' + (error as Error).message);
    },
  });
}