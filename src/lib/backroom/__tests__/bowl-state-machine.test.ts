import { describe, it, expect } from 'vitest';
import {
  canTransitionBowl,
  getValidBowlTransitions,
  isTerminalBowlStatus,
  isBowlOpen,
  isPreparedBowl,
  isAwaitingApproval,
} from '../bowl-state-machine';

describe('bowl-state-machine', () => {
  describe('canTransitionBowl', () => {
    it('allows open → sealed', () => {
      expect(canTransitionBowl('open', 'sealed')).toBe(true);
    });
    it('allows open → discarded', () => {
      expect(canTransitionBowl('open', 'discarded')).toBe(true);
    });
    it('allows open → prepared_by_assistant', () => {
      expect(canTransitionBowl('open', 'prepared_by_assistant')).toBe(true);
    });
    it('allows sealed → reweighed', () => {
      expect(canTransitionBowl('sealed', 'reweighed')).toBe(true);
    });
    it('allows sealed → discarded', () => {
      expect(canTransitionBowl('sealed', 'discarded')).toBe(true);
    });
    it('allows prepared_by_assistant → awaiting_stylist_approval', () => {
      expect(canTransitionBowl('prepared_by_assistant', 'awaiting_stylist_approval')).toBe(true);
    });
    it('allows awaiting_stylist_approval → open', () => {
      expect(canTransitionBowl('awaiting_stylist_approval', 'open')).toBe(true);
    });
    it('blocks reweighed → anything (terminal)', () => {
      expect(canTransitionBowl('reweighed', 'open')).toBe(false);
      expect(canTransitionBowl('reweighed', 'sealed')).toBe(false);
    });
    it('blocks discarded → anything (terminal)', () => {
      expect(canTransitionBowl('discarded', 'open')).toBe(false);
    });
    it('blocks open → reweighed (skip sealed)', () => {
      expect(canTransitionBowl('open', 'reweighed')).toBe(false);
    });
  });

  describe('getValidBowlTransitions', () => {
    it('returns transitions for open', () => {
      const valid = getValidBowlTransitions('open');
      expect(valid).toContain('sealed');
      expect(valid).toContain('discarded');
      expect(valid).toContain('prepared_by_assistant');
    });
    it('returns empty for terminal states', () => {
      expect(getValidBowlTransitions('reweighed')).toEqual([]);
      expect(getValidBowlTransitions('discarded')).toEqual([]);
    });
  });

  describe('isTerminalBowlStatus', () => {
    it('identifies reweighed as terminal', () => {
      expect(isTerminalBowlStatus('reweighed')).toBe(true);
    });
    it('identifies discarded as terminal', () => {
      expect(isTerminalBowlStatus('discarded')).toBe(true);
    });
    it('identifies open as non-terminal', () => {
      expect(isTerminalBowlStatus('open')).toBe(false);
    });
  });

  describe('status helpers', () => {
    it('isBowlOpen', () => {
      expect(isBowlOpen('open')).toBe(true);
      expect(isBowlOpen('sealed')).toBe(false);
    });
    it('isPreparedBowl', () => {
      expect(isPreparedBowl('prepared_by_assistant')).toBe(true);
      expect(isPreparedBowl('open')).toBe(false);
    });
    it('isAwaitingApproval', () => {
      expect(isAwaitingApproval('awaiting_stylist_approval')).toBe(true);
      expect(isAwaitingApproval('open')).toBe(false);
    });
  });
});
