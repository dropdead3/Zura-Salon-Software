import { describe, it, expect } from 'vitest';
import {
  canTransitionSession,
  getValidSessionTransitions,
  isTerminalSessionStatus,
  requiresReweigh,
  isActiveSession,
  normalizeSessionStatus,
  type MixSessionStatus,
} from '../session-state-machine';

describe('session-state-machine', () => {
  describe('normalizeSessionStatus', () => {
    it('normalizes "mixing" to "active"', () => {
      expect(normalizeSessionStatus('mixing')).toBe('active');
    });
    it('normalizes "pending_reweigh" to "awaiting_reweigh"', () => {
      expect(normalizeSessionStatus('pending_reweigh')).toBe('awaiting_reweigh');
    });
    it('leaves canonical statuses unchanged', () => {
      expect(normalizeSessionStatus('draft')).toBe('draft');
      expect(normalizeSessionStatus('active')).toBe('active');
      expect(normalizeSessionStatus('completed')).toBe('completed');
    });
  });

  describe('canTransitionSession', () => {
    it('allows draft → active', () => {
      expect(canTransitionSession('draft', 'active')).toBe(true);
    });
    it('allows draft → mixing (legacy)', () => {
      expect(canTransitionSession('draft', 'mixing')).toBe(true);
    });
    it('allows draft → cancelled', () => {
      expect(canTransitionSession('draft', 'cancelled')).toBe(true);
    });
    it('allows active → awaiting_reweigh', () => {
      expect(canTransitionSession('active', 'awaiting_reweigh')).toBe(true);
    });
    it('allows awaiting_reweigh → completed', () => {
      expect(canTransitionSession('awaiting_reweigh', 'completed')).toBe(true);
    });
    it('allows awaiting_reweigh → unresolved_exception', () => {
      expect(canTransitionSession('awaiting_reweigh', 'unresolved_exception')).toBe(true);
    });
    it('blocks completed → active (terminal)', () => {
      expect(canTransitionSession('completed', 'active')).toBe(false);
    });
    it('blocks cancelled → active (terminal)', () => {
      expect(canTransitionSession('cancelled', 'active')).toBe(false);
    });
    it('blocks draft → completed (skip states)', () => {
      expect(canTransitionSession('draft', 'completed')).toBe(false);
    });
    it('handles legacy mixing → pending_reweigh', () => {
      expect(canTransitionSession('mixing', 'pending_reweigh')).toBe(true);
    });
  });

  describe('getValidSessionTransitions', () => {
    it('returns valid transitions for draft', () => {
      const valid = getValidSessionTransitions('draft');
      expect(valid).toContain('active');
      expect(valid).toContain('cancelled');
    });
    it('returns empty for terminal states', () => {
      expect(getValidSessionTransitions('completed')).toEqual([]);
      expect(getValidSessionTransitions('cancelled')).toEqual([]);
    });
  });

  describe('isTerminalSessionStatus', () => {
    it('identifies completed as terminal', () => {
      expect(isTerminalSessionStatus('completed')).toBe(true);
    });
    it('identifies cancelled as terminal', () => {
      expect(isTerminalSessionStatus('cancelled')).toBe(true);
    });
    it('identifies unresolved_exception as terminal', () => {
      expect(isTerminalSessionStatus('unresolved_exception')).toBe(true);
    });
    it('identifies active as non-terminal', () => {
      expect(isTerminalSessionStatus('active')).toBe(false);
    });
    it('identifies draft as non-terminal', () => {
      expect(isTerminalSessionStatus('draft')).toBe(false);
    });
  });

  describe('requiresReweigh', () => {
    it('returns true for awaiting_reweigh', () => {
      expect(requiresReweigh('awaiting_reweigh')).toBe(true);
    });
    it('returns true for legacy pending_reweigh', () => {
      expect(requiresReweigh('pending_reweigh')).toBe(true);
    });
    it('returns false for active', () => {
      expect(requiresReweigh('active')).toBe(false);
    });
  });

  describe('isActiveSession', () => {
    it('returns true for active', () => {
      expect(isActiveSession('active')).toBe(true);
    });
    it('returns true for legacy mixing', () => {
      expect(isActiveSession('mixing')).toBe(true);
    });
    it('returns false for draft', () => {
      expect(isActiveSession('draft')).toBe(false);
    });
  });
});
