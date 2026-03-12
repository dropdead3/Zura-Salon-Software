/**
 * Zura Backroom — Mix Session State Machine
 * 
 * Enforces valid lifecycle transitions for mix sessions.
 *
 * Session lifecycle:
 *   draft → active → awaiting_reweigh → completed
 *                                     → unresolved_exception
 *   draft → cancelled
 *   active → cancelled
 *
 * Legacy alias: 'mixing' maps to 'active' for backward compatibility.
 */

export type MixSessionStatus =
  | 'draft'
  | 'mixing'           // legacy alias → treated as 'active'
  | 'active'
  | 'pending_reweigh'  // legacy alias → treated as 'awaiting_reweigh'
  | 'awaiting_reweigh'
  | 'awaiting_stylist_approval'
  | 'completed'
  | 'unresolved_exception'
  | 'cancelled';

/**
 * Normalize legacy status values to canonical form.
 */
export function normalizeSessionStatus(status: MixSessionStatus): MixSessionStatus {
  if (status === 'mixing') return 'active';
  if (status === 'pending_reweigh') return 'awaiting_reweigh';
  return status;
}

const VALID_TRANSITIONS: Record<string, MixSessionStatus[]> = {
  draft: ['active', 'mixing', 'cancelled'],
  active: ['awaiting_reweigh', 'pending_reweigh', 'cancelled'],
  mixing: ['awaiting_reweigh', 'pending_reweigh', 'cancelled'], // legacy alias
  awaiting_reweigh: ['completed', 'unresolved_exception'],
  pending_reweigh: ['completed', 'unresolved_exception'],       // legacy alias
  completed: [],
  unresolved_exception: [],
  cancelled: [],
};

export function canTransitionSession(from: MixSessionStatus, to: MixSessionStatus): boolean {
  const normalizedFrom = normalizeSessionStatus(from);
  const normalizedTo = normalizeSessionStatus(to);
  // Check both normalized and raw for backward compat
  return (
    VALID_TRANSITIONS[normalizedFrom]?.includes(normalizedTo) ??
    VALID_TRANSITIONS[normalizedFrom]?.includes(to) ??
    false
  );
}

export function getValidSessionTransitions(current: MixSessionStatus): MixSessionStatus[] {
  const normalized = normalizeSessionStatus(current);
  return VALID_TRANSITIONS[normalized] ?? [];
}

export function isTerminalSessionStatus(status: MixSessionStatus): boolean {
  const normalized = normalizeSessionStatus(status);
  return normalized === 'completed' || normalized === 'cancelled' || normalized === 'unresolved_exception';
}

export function requiresReweigh(status: MixSessionStatus): boolean {
  const normalized = normalizeSessionStatus(status);
  return normalized === 'awaiting_reweigh';
}

export function isActiveSession(status: MixSessionStatus): boolean {
  const normalized = normalizeSessionStatus(status);
  return normalized === 'active';
}
