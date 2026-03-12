/**
 * Zura Backroom — Mix Session Event Stream Service
 *
 * Thin client-side service that:
 * 1. Validates events against current session/bowl state
 * 2. Assigns sequence_number + idempotency_key
 * 3. INSERTs into mix_session_events (append-only ledger)
 * 4. Falls back to local queue if offline
 * 5. Replays queued events on reconnect
 *
 * The UI calls emitSessionEvent() instead of directly mutating tables.
 * The DB trigger on mix_session_events updates mix_session_projections.
 * Existing tables (mix_sessions, mix_bowls, mix_bowl_lines) are updated
 * via dual-write in the service layer for backward compatibility.
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Event Types ─────────────────────────────────────
export type MixSessionEventType =
  | 'session_created'
  | 'session_started'
  | 'bowl_created'
  | 'product_selected'
  | 'weight_captured'
  | 'weight_adjusted'
  | 'line_item_recorded'
  | 'line_item_removed'
  | 'bowl_sealed'
  | 'bowl_discarded'
  | 'reweigh_captured'
  | 'waste_recorded'
  | 'session_awaiting_reweigh'
  | 'session_completed'
  | 'session_marked_unresolved'
  | 'manual_override_used'
  | 'station_changed'
  | 'device_disconnected'
  | 'device_reconnected'
  | 'sync_reconciled'
  | 'prep_mode_enabled'
  | 'prep_approved';

export type SourceMode = 'scale' | 'manual' | 'system' | 'offline_sync';

export type SessionStatus = 'draft' | 'active' | 'awaiting_reweigh' | 'completed' | 'unresolved_exception' | 'cancelled';

// ─── Valid event types per session status ─────────────
const VALID_EVENTS_BY_STATUS: Record<SessionStatus, MixSessionEventType[]> = {
  draft: ['session_started', 'bowl_created', 'prep_mode_enabled'],
  active: [
    'bowl_created', 'product_selected', 'weight_captured', 'weight_adjusted',
    'line_item_recorded', 'line_item_removed', 'bowl_sealed', 'bowl_discarded',
    'waste_recorded', 'session_awaiting_reweigh', 'station_changed',
    'device_disconnected', 'device_reconnected', 'manual_override_used',
  ],
  awaiting_reweigh: [
    'reweigh_captured', 'session_completed', 'session_marked_unresolved',
  ],
  completed: [],
  unresolved_exception: [],
  cancelled: [],
};

// ─── Event Payload Interfaces ────────────────────────
export interface MixSessionEventInput {
  mix_session_id: string;
  organization_id: string;
  location_id?: string | null;
  event_type: MixSessionEventType;
  event_payload?: Record<string, unknown>;
  source_mode?: SourceMode;
  device_id?: string | null;
  station_id?: string | null;
}

export interface MixSessionEvent extends MixSessionEventInput {
  id: string;
  sequence_number: number;
  idempotency_key: string;
  created_at: string;
  created_by: string | null;
}

// ─── Offline Queue ───────────────────────────────────
const OFFLINE_QUEUE_KEY = 'zura-mix-session-event-queue';

interface QueuedEvent {
  input: MixSessionEventInput;
  sequence_number: number;
  idempotency_key: string;
  queued_at: number;
}

// ─── Sequence Counter (per session, in-memory) ───────
const sessionSequences = new Map<string, number>();

function getNextSequence(sessionId: string): number {
  const current = sessionSequences.get(sessionId) ?? 0;
  const next = current + 1;
  sessionSequences.set(sessionId, next);
  return next;
}

/**
 * Initialize the sequence counter for a session from the last known event.
 * Call this when loading an existing session.
 */
export async function initializeSessionSequence(sessionId: string): Promise<number> {
  const { data } = await supabase
    .from('mix_session_events' as any)
    .select('sequence_number')
    .eq('mix_session_id', sessionId)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .single();

  const lastSeq = (data as any)?.sequence_number ?? 0;
  sessionSequences.set(sessionId, lastSeq);
  return lastSeq;
}

// ─── Validation ──────────────────────────────────────
export function validateEventForStatus(
  currentStatus: SessionStatus,
  eventType: MixSessionEventType
): { valid: boolean; reason?: string } {
  const allowed = VALID_EVENTS_BY_STATUS[currentStatus];
  if (!allowed) {
    return { valid: false, reason: `Unknown session status: ${currentStatus}` };
  }
  if (!allowed.includes(eventType)) {
    return {
      valid: false,
      reason: `Event "${eventType}" not allowed in session status "${currentStatus}"`,
    };
  }
  return { valid: true };
}

// ─── Offline Queue Management ────────────────────────
function loadOfflineQueue(): QueuedEvent[] {
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: QueuedEvent[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[MixSessionService] Failed to save offline queue:', error);
  }
}

function enqueueOffline(event: QueuedEvent): void {
  const queue = loadOfflineQueue();
  queue.push(event);
  saveOfflineQueue(queue);
  console.log('[MixSessionService] Event queued offline:', event.idempotency_key);
}

// ─── Core: Emit Event ────────────────────────────────
/**
 * Emit a mix session event.
 *
 * 1. Validates event type against current session status (if provided)
 * 2. Assigns sequence_number and idempotency_key
 * 3. INSERTs into mix_session_events
 * 4. If offline, queues locally for later replay
 *
 * @param input - Event data
 * @param currentStatus - Current session status for validation (optional, skips validation if not provided)
 * @returns The inserted event or null if queued offline
 */
export async function emitSessionEvent(
  input: MixSessionEventInput,
  currentStatus?: SessionStatus
): Promise<MixSessionEvent | null> {
  // Validate if status provided
  if (currentStatus) {
    const validation = validateEventForStatus(currentStatus, input.event_type);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }
  }

  const sequenceNumber = getNextSequence(input.mix_session_id);
  const idempotencyKey = crypto.randomUUID();
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;

  const eventRow = {
    mix_session_id: input.mix_session_id,
    organization_id: input.organization_id,
    location_id: input.location_id ?? null,
    event_type: input.event_type,
    event_payload: input.event_payload ?? {},
    sequence_number: sequenceNumber,
    source_mode: input.source_mode ?? 'manual',
    device_id: input.device_id ?? null,
    station_id: input.station_id ?? null,
    idempotency_key: idempotencyKey,
    created_by: userId,
  };

  // Check online status
  if (!navigator.onLine) {
    enqueueOffline({
      input,
      sequence_number: sequenceNumber,
      idempotency_key: idempotencyKey,
      queued_at: Date.now(),
    });
    return null;
  }

  const { data, error } = await supabase
    .from('mix_session_events' as any)
    .insert(eventRow as any)
    .select()
    .single();

  if (error) {
    // If unique violation on idempotency_key, event was already processed (safe to ignore)
    if (error.code === '23505' && error.message?.includes('idempotency')) {
      console.warn('[MixSessionService] Duplicate event ignored:', idempotencyKey);
      return null;
    }
    throw error;
  }

  console.log('[MixSessionService] Event emitted:', input.event_type, sequenceNumber);
  return data as unknown as MixSessionEvent;
}

// ─── Replay Offline Queue ────────────────────────────
/**
 * Replay all queued offline events.
 * Uses idempotency_key to prevent duplicates.
 * Returns count of successfully replayed events.
 */
export async function replayOfflineQueue(): Promise<{ replayed: number; failed: number }> {
  const queue = loadOfflineQueue();
  if (queue.length === 0) return { replayed: 0, failed: 0 };

  console.log('[MixSessionService] Replaying', queue.length, 'offline events');

  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  let replayed = 0;
  let failed = 0;
  const remaining: QueuedEvent[] = [];

  for (const queued of queue) {
    const eventRow = {
      mix_session_id: queued.input.mix_session_id,
      organization_id: queued.input.organization_id,
      location_id: queued.input.location_id ?? null,
      event_type: queued.input.event_type,
      event_payload: queued.input.event_payload ?? {},
      sequence_number: queued.sequence_number,
      source_mode: 'offline_sync' as SourceMode,
      device_id: queued.input.device_id ?? null,
      station_id: queued.input.station_id ?? null,
      idempotency_key: queued.idempotency_key,
      created_by: userId,
    };

    const { error } = await supabase
      .from('mix_session_events' as any)
      .insert(eventRow as any);

    if (error) {
      // Duplicate = already synced, count as success
      if (error.code === '23505') {
        replayed++;
      } else {
        console.error('[MixSessionService] Failed to replay event:', error);
        remaining.push(queued);
        failed++;
      }
    } else {
      replayed++;
    }
  }

  // Emit sync_reconciled event for each session that had offline events
  const sessionIds = new Set(queue.map(q => q.input.mix_session_id));
  for (const sessionId of sessionIds) {
    const orgId = queue.find(q => q.input.mix_session_id === sessionId)?.input.organization_id;
    if (orgId) {
      await emitSessionEvent({
        mix_session_id: sessionId,
        organization_id: orgId,
        event_type: 'sync_reconciled',
        event_payload: { replayed_count: replayed, failed_count: failed },
        source_mode: 'system',
      });
    }
  }

  saveOfflineQueue(remaining);
  console.log('[MixSessionService] Replay complete:', replayed, 'replayed,', failed, 'failed');

  return { replayed, failed };
}

/**
 * Get count of pending offline events.
 */
export function getOfflineQueueCount(): number {
  return loadOfflineQueue().length;
}

/**
 * Clear the offline queue (use with caution).
 */
export function clearOfflineQueue(): void {
  saveOfflineQueue([]);
}

// ─── Query Helpers ───────────────────────────────────
/**
 * Fetch all events for a session, ordered by sequence.
 */
export async function fetchSessionEvents(sessionId: string): Promise<MixSessionEvent[]> {
  const { data, error } = await supabase
    .from('mix_session_events' as any)
    .select('*')
    .eq('mix_session_id', sessionId)
    .order('sequence_number', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as MixSessionEvent[];
}

/**
 * Fetch the projection for a session.
 */
export async function fetchSessionProjection(sessionId: string) {
  const { data, error } = await supabase
    .from('mix_session_projections' as any)
    .select('*')
    .eq('mix_session_id', sessionId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data as unknown as {
    mix_session_id: string;
    organization_id: string;
    current_status: SessionStatus;
    active_bowl_count: number;
    sealed_bowl_count: number;
    reweighed_bowl_count: number;
    total_line_items: number;
    running_dispensed_weight: number;
    running_estimated_cost: number;
    has_manual_override: boolean;
    has_device_disconnect: boolean;
    awaiting_reweigh_count: number;
    unresolved_flag: boolean;
    last_event_sequence: number;
    last_event_at: string | null;
    updated_at: string;
  } | null;
}
