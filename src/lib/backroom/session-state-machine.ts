/**
 * Zura Backroom — Mix Session State Machine
 * 
 * Enforces valid lifecycle transitions for mix sessions.
 * draft → mixing → pending_reweigh → completed
 * draft | mixing → cancelled
 */

export type MixSessionStatus = 'draft' | 'mixing' | 'pending_reweigh' | 'completed' | 'cancelled';

const VALID_TRANSITIONS: Record<MixSessionStatus, MixSessionStatus[]> = {
  draft: ['mixing', 'cancelled'],
  mixing: ['pending_reweigh', 'cancelled'],
  pending_reweigh: ['completed'],
  completed: [],
  cancelled: [],
};

export function canTransitionSession(from: MixSessionStatus, to: MixSessionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidSessionTransitions(current: MixSessionStatus): MixSessionStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

export function isTerminalSessionStatus(status: MixSessionStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

export function requiresReweigh(status: MixSessionStatus): boolean {
  return status === 'pending_reweigh';
}
