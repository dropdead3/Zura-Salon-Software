/**
 * useMixSessionEvents — React hooks for the Mix Session Event Stream
 *
 * Provides query + mutation hooks for emitting and reading mix session events,
 * plus the projection read model.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import {
  emitSessionEvent,
  fetchSessionEvents,
  fetchSessionProjection,
  initializeSessionSequence,
  replayOfflineQueue,
  getOfflineQueueCount,
  type MixSessionEventInput,
  type MixSessionEvent,
  type SessionStatus,
} from '@/lib/backroom/mix-session-service';

/**
 * Fetch all events for a mix session, ordered by sequence.
 */
export function useMixSessionEvents(sessionId: string | null) {
  return useQuery({
    queryKey: ['mix-session-events', sessionId],
    queryFn: () => fetchSessionEvents(sessionId!),
    enabled: !!sessionId,
    staleTime: 10_000,
  });
}

/**
 * Fetch the projection (derived read model) for a mix session.
 */
export function useMixSessionProjection(sessionId: string | null) {
  return useQuery({
    queryKey: ['mix-session-projection', sessionId],
    queryFn: () => fetchSessionProjection(sessionId!),
    enabled: !!sessionId,
    staleTime: 5_000,
  });
}

/**
 * Mutation to emit a mix session event.
 * Automatically invalidates events + projection queries on success.
 */
export function useEmitSessionEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      currentStatus,
    }: {
      input: MixSessionEventInput;
      currentStatus?: SessionStatus;
    }) => {
      return emitSessionEvent(input, currentStatus);
    },
    onSuccess: (data, variables) => {
      const sessionId = variables.input.mix_session_id;
      queryClient.invalidateQueries({ queryKey: ['mix-session-events', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['mix-session-projection', sessionId] });
      // Also invalidate legacy session queries for backward compat
      queryClient.invalidateQueries({ queryKey: ['mix-sessions'] });
    },
    onError: (error) => {
      console.error('[useMixSessionEvents] Event emission failed:', error);
      toast.error('Failed to record event: ' + (error as Error).message);
    },
  });
}

/**
 * Initialize the sequence counter for an existing session.
 * Call when loading an in-progress session.
 */
export function useInitSessionSequence() {
  return useMutation({
    mutationFn: (sessionId: string) => initializeSessionSequence(sessionId),
  });
}

/**
 * Replay offline event queue. Returns replay stats.
 */
export function useReplayOfflineQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => replayOfflineQueue(),
    onSuccess: (result) => {
      if (result.replayed > 0) {
        queryClient.invalidateQueries({ queryKey: ['mix-session-events'] });
        queryClient.invalidateQueries({ queryKey: ['mix-session-projection'] });
        queryClient.invalidateQueries({ queryKey: ['mix-sessions'] });
        toast.success(`Synced ${result.replayed} offline events`);
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} events failed to sync`);
      }
    },
    onError: (error) => {
      console.error('[useMixSessionEvents] Offline replay failed:', error);
      toast.error('Failed to sync offline events');
    },
  });
}

/**
 * Get the count of pending offline events (non-reactive).
 */
export function usePendingOfflineCount(): number {
  return getOfflineQueueCount();
}
