import { describe, it, expect } from 'vitest';
import {
  recentDailyVelocity,
  forecastDaysToCap,
  suggestCapBump,
  summarizeGoalHistory,
  MIN_GOAL_RUNS_FOR_NUDGE,
  type PromoGoalRun,
} from './promo-goal-velocity';

describe('recentDailyVelocity', () => {
  it('returns null on empty series', () => {
    expect(recentDailyVelocity([])).toBeNull();
  });

  it('returns null when fewer than 3 non-zero days in the closed window', () => {
    // last bucket = today (dropped). Closed window: [0,0,1,0]. Only 1 non-zero.
    expect(recentDailyVelocity([0, 0, 1, 0, 5])).toBeNull();
  });

  it('drops today (last bucket) from the average', () => {
    // Closed: [2,2,2,2,2,2,2,2,2,2,2,2,2] avg=2. Today's spike of 100 ignored.
    const series = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 100];
    expect(recentDailyVelocity(series)).toBe(2);
  });

  it('averages across the closed window when 3+ non-zero days exist', () => {
    // Closed: [0,0,3,0,3,0,3,0,0,0,0,0,0]. Sum 9, len 13, avg ≈ 0.692.
    const series = [0, 0, 3, 0, 3, 0, 3, 0, 0, 0, 0, 0, 0, 0];
    const v = recentDailyVelocity(series);
    expect(v).toBeCloseTo(9 / 13, 5);
  });
});

describe('forecastDaysToCap', () => {
  const flatSeries = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0]; // 2/day, today=0
  it('returns no-cap when cap is null/undefined', () => {
    expect(
      forecastDaysToCap({ cap: null, redemptions: 0, series: flatSeries }),
    ).toEqual({ kind: 'unavailable', reason: 'no-cap' });
  });

  it('returns cap-already-hit when redemptions >= cap', () => {
    expect(
      forecastDaysToCap({ cap: 10, redemptions: 10, series: flatSeries }),
    ).toEqual({ kind: 'unavailable', reason: 'cap-already-hit' });
  });

  it('returns no-velocity when series is too thin', () => {
    expect(
      forecastDaysToCap({ cap: 50, redemptions: 0, series: [0, 0, 0] }),
    ).toEqual({ kind: 'unavailable', reason: 'no-velocity' });
  });

  it('extrapolates remaining/dailyRate, ceil to whole days', () => {
    const result = forecastDaysToCap({
      cap: 20,
      redemptions: 8,
      series: flatSeries,
    });
    expect(result).toEqual({ kind: 'on-pace', daysUntilCap: 6, dailyRate: 2 });
  });
});

describe('suggestCapBump', () => {
  const flatSeries = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0]; // 2/day
  it('returns null with no velocity', () => {
    expect(suggestCapBump({ series: [0, 0, 0] })).toBeNull();
  });

  it('aims for ~7 days headroom rounded up to nearest 5', () => {
    // 2/day * 7 = 14 → round up to 15.
    expect(suggestCapBump({ series: flatSeries })).toBe(15);
  });

  it('honours custom target days', () => {
    // 2/day * 14 = 28 → round to 30.
    expect(
      suggestCapBump({ series: flatSeries, targetDaysOfHeadroom: 14 }),
    ).toBe(30);
  });

  it('floors at 10 even for very low velocity', () => {
    // 1/day spread thin: avg ≈ 0.23 * 7 = 1.6 → floored to 10.
    const tinySeries = [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0];
    expect(suggestCapBump({ series: tinySeries })).toBe(10);
  });
});

describe('summarizeGoalHistory', () => {
  function run(daysTaken: number | null, cap: number, idx = 0): PromoGoalRun {
    return {
      id: `r${idx}`,
      offerCode: 'FREEHAIR',
      cap,
      redemptionsAtHit: cap,
      startedAt: null,
      hitAt: '2026-05-01T00:00:00Z',
      daysTaken,
    };
  }

  it('is silent below MIN_GOAL_RUNS_FOR_NUDGE', () => {
    expect(summarizeGoalHistory([run(1, 50, 0), run(1, 50, 1)])).toEqual({
      kind: 'silent',
    });
  });

  it('is silent when most runs lack daysTaken', () => {
    expect(
      summarizeGoalHistory([
        run(null, 50, 0),
        run(null, 50, 1),
        run(1, 50, 2),
      ]),
    ).toEqual({ kind: 'silent' });
  });

  it('is silent when median days-taken > 2', () => {
    expect(
      summarizeGoalHistory([run(5, 50, 0), run(7, 50, 1), run(6, 50, 2)]),
    ).toEqual({ kind: 'silent' });
  });

  it('nudges upward when 3+ runs hit cap in <=2 days median', () => {
    const result = summarizeGoalHistory([
      run(1, 50, 0),
      run(2, 50, 1),
      run(1, 50, 2),
    ]);
    expect(result.kind).toBe('recalibrate-up');
    if (result.kind === 'recalibrate-up') {
      expect(result.runs).toBe(MIN_GOAL_RUNS_FOR_NUDGE);
      expect(result.medianDaysTaken).toBe(1);
      expect(result.medianCap).toBe(50);
      expect(result.suggestedNextCap).toBe(100); // 50 * 2 = 100, already on 5
    }
  });

  it('rounds suggested cap up to nearest 5', () => {
    const result = summarizeGoalHistory([
      run(1, 33, 0),
      run(1, 33, 1),
      run(1, 33, 2),
    ]);
    if (result.kind === 'recalibrate-up') {
      expect(result.suggestedNextCap).toBe(70); // 66 → 70
    } else {
      throw new Error('expected nudge');
    }
  });
});
