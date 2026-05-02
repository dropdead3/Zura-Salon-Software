import { describe, it, expect } from 'vitest';
import {
  pickActiveEntry,
  applyScheduledSnapshot,
  resolvePromotionalPopupForNow,
  detectScheduleConflicts,
} from './promo-schedule';
import { DEFAULT_PROMO_POPUP } from '@/hooks/usePromotionalPopup';
import type { SavedPromo } from '@/hooks/usePromoLibrary';

const entry = (id: string, startsAt: string, endsAt: string, savedPromoId = id) => ({
  id,
  savedPromoId,
  startsAt,
  endsAt,
});

describe('pickActiveEntry', () => {
  it('returns null when schedule is empty/undefined', () => {
    expect(pickActiveEntry(undefined, new Date())).toBeNull();
    expect(pickActiveEntry([], new Date())).toBeNull();
  });

  it('returns the entry whose window covers now', () => {
    const now = new Date('2026-06-01T12:00:00Z');
    const e = entry('a', '2026-05-01T00:00:00Z', '2026-07-01T00:00:00Z');
    expect(pickActiveEntry([e], now)?.id).toBe('a');
  });

  it('on overlap, later startsAt wins', () => {
    const now = new Date('2026-06-15T00:00:00Z');
    const older = entry('a', '2026-06-01T00:00:00Z', '2026-07-01T00:00:00Z');
    const newer = entry('b', '2026-06-10T00:00:00Z', '2026-06-20T00:00:00Z');
    expect(pickActiveEntry([older, newer], now)?.id).toBe('b');
  });

  it('returns null when now sits outside every window', () => {
    const now = new Date('2026-08-01T00:00:00Z');
    const e = entry('a', '2026-06-01T00:00:00Z', '2026-07-01T00:00:00Z');
    expect(pickActiveEntry([e], now)).toBeNull();
  });
});

describe('applyScheduledSnapshot', () => {
  it('returns base untouched when snapshot is null', () => {
    expect(applyScheduledSnapshot(DEFAULT_PROMO_POPUP, null)).toEqual(DEFAULT_PROMO_POPUP);
  });

  it('overrides creative fields, keeps targeting/lifecycle', () => {
    const base = { ...DEFAULT_PROMO_POPUP, headline: 'BASE', offerCode: 'WRAP' };
    const snap = { ...DEFAULT_PROMO_POPUP, headline: 'SNAP', offerCode: 'IGNORED' };
    const merged = applyScheduledSnapshot(base, snap);
    expect(merged.headline).toBe('SNAP');
    expect(merged.offerCode).toBe('WRAP'); // wrapper wins on offerCode
  });
});

describe('resolvePromotionalPopupForNow', () => {
  it('returns null for null config', () => {
    expect(resolvePromotionalPopupForNow(null, [])).toBeNull();
  });

  it('returns base when schedule empty', () => {
    const cfg = { ...DEFAULT_PROMO_POPUP, headline: 'A' };
    expect(resolvePromotionalPopupForNow(cfg, [])?.headline).toBe('A');
  });

  it('swaps in the active snapshot when in window', () => {
    const lib: SavedPromo[] = [
      {
        id: 'lib1',
        name: 'Spring',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        config: { ...DEFAULT_PROMO_POPUP, headline: 'SPRING' },
      },
    ];
    const cfg = {
      ...DEFAULT_PROMO_POPUP,
      headline: 'BASE',
      schedule: [entry('e1', '2026-05-01T00:00:00Z', '2026-07-01T00:00:00Z', 'lib1')],
    };
    const out = resolvePromotionalPopupForNow(cfg, lib, new Date('2026-06-01T00:00:00Z'));
    expect(out?.headline).toBe('SPRING');
  });

  it('falls back to base when snapshot id is missing from library', () => {
    const cfg = {
      ...DEFAULT_PROMO_POPUP,
      headline: 'BASE',
      schedule: [entry('e1', '2026-05-01T00:00:00Z', '2026-07-01T00:00:00Z', 'nope')],
    };
    const out = resolvePromotionalPopupForNow(cfg, [], new Date('2026-06-01T00:00:00Z'));
    expect(out?.headline).toBe('BASE');
  });
});

describe('detectScheduleConflicts', () => {
  it('returns empty set for 0 or 1 entries', () => {
    expect(detectScheduleConflicts(undefined).size).toBe(0);
    expect(detectScheduleConflicts([]).size).toBe(0);
    expect(detectScheduleConflicts([entry('a', '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z')]).size).toBe(0);
  });

  it('flags both entries when windows overlap', () => {
    const a = entry('a', '2026-06-01T00:00:00Z', '2026-06-15T00:00:00Z');
    const b = entry('b', '2026-06-10T00:00:00Z', '2026-06-20T00:00:00Z');
    const out = detectScheduleConflicts([a, b]);
    expect(out.has('a')).toBe(true);
    expect(out.has('b')).toBe(true);
  });

  it('does not flag back-to-back (touching) windows', () => {
    const a = entry('a', '2026-06-01T00:00:00Z', '2026-06-10T00:00:00Z');
    const b = entry('b', '2026-06-10T00:00:00Z', '2026-06-20T00:00:00Z');
    expect(detectScheduleConflicts([a, b]).size).toBe(0);
  });

  it('ignores invalid windows', () => {
    const a = entry('a', '2026-06-01T00:00:00Z', '2026-06-15T00:00:00Z');
    const b = entry('b', 'not-a-date', 'also-not');
    expect(detectScheduleConflicts([a, b]).size).toBe(0);
  });
});
