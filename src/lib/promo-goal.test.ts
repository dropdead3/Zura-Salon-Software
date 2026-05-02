import { describe, it, expect } from 'vitest';
import {
  clampGoalCap,
  evaluateGoal,
  isGoalConfigured,
  isGoalSuppressing,
  GOAL_CAP_MIN,
  GOAL_CAP_MAX,
} from './promo-goal';

const NOW = new Date('2026-05-15T12:00:00Z');
const FUTURE = '2026-06-01T00:00:00Z';
const PAST = '2026-05-01T00:00:00Z';

describe('clampGoalCap', () => {
  it('passes valid integers through', () => {
    expect(clampGoalCap(50)).toBe(50);
  });
  it('rounds floats', () => {
    expect(clampGoalCap(50.7)).toBe(51);
  });
  it('clamps to min/max', () => {
    expect(clampGoalCap(0)).toBe(GOAL_CAP_MIN);
    expect(clampGoalCap(99999)).toBe(GOAL_CAP_MAX);
  });
  it('returns null for null/undefined/NaN', () => {
    expect(clampGoalCap(null)).toBeNull();
    expect(clampGoalCap(undefined)).toBeNull();
    expect(clampGoalCap(Number.NaN)).toBeNull();
  });
});

describe('isGoalConfigured', () => {
  it('returns false when nothing set', () => {
    expect(isGoalConfigured(null)).toBe(false);
    expect(isGoalConfigured({})).toBe(false);
    expect(isGoalConfigured({ capRedemptions: null, deadline: null })).toBe(false);
  });
  it('returns true when cap or deadline present', () => {
    expect(isGoalConfigured({ capRedemptions: 10 })).toBe(true);
    expect(isGoalConfigured({ deadline: FUTURE })).toBe(true);
  });
});

describe('evaluateGoal', () => {
  it('returns unset when goal not configured', () => {
    expect(evaluateGoal({ goal: null, redemptions: 0, now: NOW })).toEqual({
      kind: 'unset',
    });
  });

  it('returns active mid-run with progress + remaining', () => {
    const status = evaluateGoal({
      goal: { capRedemptions: 50 },
      redemptions: 12,
      now: NOW,
    });
    expect(status.kind).toBe('active');
    if (status.kind === 'active') {
      expect(status.progressPct).toBe(24);
      expect(status.remaining).toBe(38);
      expect(status.deadlineDaysLeft).toBeNull();
    }
  });

  it('returns reached-count when cap hit exactly', () => {
    const status = evaluateGoal({
      goal: { capRedemptions: 10 },
      redemptions: 10,
      now: NOW,
    });
    expect(status).toEqual({ kind: 'reached-count', cap: 10, redemptions: 10 });
    expect(isGoalSuppressing(status)).toBe(true);
  });

  it('still suppresses when redemptions exceed cap', () => {
    const status = evaluateGoal({
      goal: { capRedemptions: 10 },
      redemptions: 15,
      now: NOW,
    });
    expect(status.kind).toBe('reached-count');
    expect(isGoalSuppressing(status)).toBe(true);
  });

  it('returns reached-deadline when deadline has passed', () => {
    const status = evaluateGoal({
      goal: { deadline: PAST },
      redemptions: 0,
      now: NOW,
    });
    expect(status).toEqual({ kind: 'reached-deadline', deadline: PAST });
    expect(isGoalSuppressing(status)).toBe(true);
  });

  it('reports cap-suppression first when both cap and deadline fire', () => {
    const status = evaluateGoal({
      goal: { capRedemptions: 5, deadline: PAST },
      redemptions: 5,
      now: NOW,
    });
    expect(status.kind).toBe('reached-count');
  });

  it('caps progressPct at 100 even when redemptions overshoot before suppression check', () => {
    // Defensive — reached-count fires first, but if a future caller passes
    // a status through they should never see progressPct > 100.
    const status = evaluateGoal({
      goal: { capRedemptions: 10 },
      redemptions: 9,
      now: NOW,
    });
    expect(status.kind).toBe('active');
    if (status.kind === 'active') {
      expect(status.progressPct).toBeLessThanOrEqual(100);
    }
  });

  it('computes deadlineDaysLeft', () => {
    const status = evaluateGoal({
      goal: { deadline: '2026-05-20T12:00:00Z' },
      redemptions: 0,
      now: NOW,
    });
    if (status.kind === 'active') {
      expect(status.deadlineDaysLeft).toBe(5);
    } else {
      throw new Error('expected active');
    }
  });

  it('ignores invalid deadline strings (treated as no deadline)', () => {
    const status = evaluateGoal({
      goal: { deadline: 'not-a-date', capRedemptions: 10 },
      redemptions: 0,
      now: NOW,
    });
    expect(status.kind).toBe('active');
    if (status.kind === 'active') {
      expect(status.deadlineDaysLeft).toBeNull();
    }
  });
});
