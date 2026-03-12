/**
 * useMixSession — Query + Command-layer mutations for mix sessions.
 *
 * Mutations route through the event stream (emitSessionEvent) first,
 * then write to the projection table (mix_sessions) for backward compat.
 * The event stream is the source of truth.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { MixSessionStatus } from '@/lib/backroom/session-state-machine';
import { canTransitionSession } from '@/lib/backroom/session-state-machine';
import { emitSessionEvent, type SessionStatus } from '@/lib/backroom/mix-session-service';
import {
  executeStartMixSession,
  executeCompleteSession,
  executeMarkSessionUnresolved,
} from '@/lib/backroom/commands/mixing-commands';
import { buildCommandMeta } from '@/lib/backroom/commands/types';

export interface MixSession {
  id: string;
  organization_id: string;
  appointment_id: string | null;
  appointment_service_id: string | null;
  client_id: string | null;
  mixed_by_staff_id: string | null;
  service_performed_by_staff_id: string | null;
  station_id: string | null;
  location_id: string | null;
  started_at: string;
  completed_at: string | null;
  status: MixSessionStatus;
  is_manual_override: boolean;
  unresolved_flag: boolean;
  unresolved_reason: string | null;
  notes: string | null;
  is_prep_mode: boolean;
  prep_approved_by: string | null;
  prep_approved_at: string | null;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export function useMixSession(appointmentId: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['mix-sessions', orgId, appointmentId],
    queryFn: async (): Promise<MixSession[]> => {
      const { data, error } = await supabase
        .from('mix_sessions')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('appointment_id', appointmentId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as MixSession[];
    },
    enabled: !!orgId && !!appointmentId,
    staleTime: 30_000,
  });
}

/**
 * Create a mix session: emit session_created event → write projection.
 */
export function useCreateMixSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      appointment_id: string;
      appointment_service_id?: string;
      client_id?: string;
      mixed_by_staff_id?: string;
      service_performed_by_staff_id?: string;
      station_id?: string;
      location_id?: string;
    }) => {
      // 1. Write projection (mix_sessions) — need the ID first for event emission
      const { data, error } = await supabase
        .from('mix_sessions')
        .insert({
          organization_id: params.organization_id,
          appointment_id: params.appointment_id,
          appointment_service_id: params.appointment_service_id || null,
          client_id: params.client_id || null,
          mixed_by_staff_id: params.mixed_by_staff_id || null,
          service_performed_by_staff_id: params.service_performed_by_staff_id || null,
          station_id: params.station_id || null,
          location_id: params.location_id || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      const session = data as unknown as MixSession;

      // 2. Emit event (source of truth)
      await emitSessionEvent({
        mix_session_id: session.id,
        organization_id: params.organization_id,
        location_id: params.location_id,
        event_type: 'session_created',
        event_payload: {
          appointment_id: params.appointment_id,
          appointment_service_id: params.appointment_service_id,
          client_id: params.client_id,
          mixed_by_staff_id: params.mixed_by_staff_id,
          station_id: params.station_id,
        },
        source_mode: 'manual',
      });

      return session;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mix-sessions', vars.organization_id, vars.appointment_id] });
      toast.success('Mix session started');
    },
    onError: (error) => {
      toast.error('Failed to start mix session: ' + error.message);
    },
  });
}

/**
 * Update session status: emit event via command layer → write projection.
 */
export function useUpdateMixSessionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, organizationId, currentStatus, newStatus, unresolvedReason, locationId }: {
      id: string;
      organizationId: string;
      currentStatus: MixSessionStatus;
      newStatus: MixSessionStatus;
      unresolvedReason?: string;
      locationId?: string;
    }) => {
      if (!canTransitionSession(currentStatus, newStatus)) {
        throw new Error(`Invalid transition: ${currentStatus} → ${newStatus}`);
      }

      const meta = await buildCommandMeta('ui');

      // 1. Emit event via command layer (source of truth)
      if (newStatus === 'completed') {
        const result = await executeCompleteSession({
          meta,
          organization_id: organizationId,
          mix_session_id: id,
        });
        if (!result.success) {
          // Fall back to direct event if command validation fails (e.g. bowls not terminal)
          await emitSessionEvent({
            mix_session_id: id,
            organization_id: organizationId,
            location_id: locationId,
            event_type: 'session_completed',
            source_mode: 'manual',
          });
        }
      } else if (newStatus === 'mixing') {
        await executeStartMixSession({
          meta,
          organization_id: organizationId,
          mix_session_id: id,
        });
      } else if (newStatus === 'pending_reweigh') {
        await emitSessionEvent({
          mix_session_id: id,
          organization_id: organizationId,
          location_id: locationId,
          event_type: 'session_awaiting_reweigh',
          source_mode: 'manual',
        }, currentStatus as unknown as SessionStatus);
      } else if (unresolvedReason) {
        await executeMarkSessionUnresolved({
          meta,
          organization_id: organizationId,
          mix_session_id: id,
          reason: unresolvedReason,
        });
      }

      // 2. Write projection (mix_sessions)
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
        if (unresolvedReason) {
          updates.unresolved_flag = true;
          updates.unresolved_reason = unresolvedReason;
        }
      }

      const { data, error } = await supabase
        .from('mix_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as MixSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mix-sessions'] });
    },
    onError: (error) => {
      toast.error('Failed to update session: ' + error.message);
    },
  });
}
