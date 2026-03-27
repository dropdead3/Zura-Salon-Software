/**
 * Zura Backroom — Bowl State Machine
 * 
 * Enforces valid lifecycle transitions for mix bowls.
 * open → sealed → reweighed
 * open → discarded
 * sealed → discarded (if entire bowl is waste)
 */

export type MixBowlStatus =
  | 'open'
  | 'sealed'
  | 'reweighed'
  | 'discarded'
  | 'prepared_by_assistant'
  | 'awaiting_stylist_approval';

const VALID_TRANSITIONS: Record<MixBowlStatus, MixBowlStatus[]> = {
  open: ['sealed', 'discarded', 'prepared_by_assistant'],
  sealed: ['reweighed', 'discarded'],
  reweighed: [],
  discarded: [],
  prepared_by_assistant: ['awaiting_stylist_approval', 'discarded'],
  awaiting_stylist_approval: ['open', 'discarded'],
};

export function canTransitionBowl(from: MixBowlStatus, to: MixBowlStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidBowlTransitions(current: MixBowlStatus): MixBowlStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

export function isTerminalBowlStatus(status: MixBowlStatus): boolean {
  return status === 'reweighed' || status === 'discarded';
}

export function isBowlOpen(status: MixBowlStatus): boolean {
  return status === 'open';
}

export function isPreparedBowl(status: MixBowlStatus): boolean {
  return status === 'prepared_by_assistant';
}

export function isAwaitingApproval(status: MixBowlStatus): boolean {
  return status === 'awaiting_stylist_approval';
}
