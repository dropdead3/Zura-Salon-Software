import { describe, it, expect } from 'vitest';
import {
  hashBucket,
  pickVariant,
  resolvePromotionalPopupForVisitor,
  type PromoExperimentConfig,
} from './promo-experiment';
import type { PromotionalPopupSettings } from '@/hooks/usePromotionalPopup';
import type { SavedPromo } from '@/hooks/usePromoLibrary';

const baseCfg: PromotionalPopupSettings = {
  enabled: true,
  headline: 'BASE',
  body: 'base body',
  ctaAcceptLabel: 'Claim',
  ctaDeclineLabel: 'No',
  offerCode: 'TEST',
  appearance: 'modal',
  trigger: 'immediate',
  showOn: ['home'],
  audience: 'all',
  frequency: 'once-per-session',
};

const library: SavedPromo[] = [
  {
    id: 'snap-a',
    name: 'A',
    createdAt: '', updatedAt: '',
    config: { ...baseCfg, headline: 'ARM A' } as never,
  },
  {
    id: 'snap-b',
    name: 'B',
    createdAt: '', updatedAt: '',
    config: { ...baseCfg, headline: 'ARM B' } as never,
  },
];

describe('hashBucket', () => {
  it('is deterministic', () => {
    expect(hashBucket('abc')).toBe(hashBucket('abc'));
  });
  it('differs across inputs', () => {
    expect(hashBucket('a')).not.toBe(hashBucket('b'));
  });
});

describe('pickVariant', () => {
  const exp: PromoExperimentConfig = {
    enabled: true,
    version: 1,
    variants: [
      { id: 'a', label: 'A', savedPromoId: 'snap-a', weight: 1 },
      { id: 'b', label: 'B', savedPromoId: 'snap-b', weight: 1 },
    ],
  };

  it('returns null when disabled', () => {
    expect(pickVariant({ ...exp, enabled: false }, 'sess')).toBeNull();
  });
  it('returns null when no eligible variants', () => {
    expect(pickVariant({ ...exp, variants: [] }, 'sess')).toBeNull();
  });
  it('returns single variant when only one eligible', () => {
    const single = { ...exp, variants: [exp.variants[0]] };
    expect(pickVariant(single, 'sess')?.id).toBe('a');
  });
  it('is sticky for same bucketing key + version', () => {
    const a = pickVariant(exp, 'sess-1');
    const b = pickVariant(exp, 'sess-1');
    expect(a?.id).toBe(b?.id);
  });
  it('re-shuffles on version bump', () => {
    // Brute-force find a key whose assignment flips on version change.
    let flipped = false;
    for (let i = 0; i < 1000; i++) {
      const k = `s-${i}`;
      const v1 = pickVariant({ ...exp, version: 1 }, k)?.id;
      const v2 = pickVariant({ ...exp, version: 2 }, k)?.id;
      if (v1 !== v2) { flipped = true; break; }
    }
    expect(flipped).toBe(true);
  });
  it('respects weight ratios approximately', () => {
    const weighted: PromoExperimentConfig = {
      ...exp,
      variants: [
        { id: 'a', label: 'A', savedPromoId: 'snap-a', weight: 1 },
        { id: 'b', label: 'B', savedPromoId: 'snap-b', weight: 3 },
      ],
    };
    let bCount = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      if (pickVariant(weighted, `s-${i}`)?.id === 'b') bCount++;
    }
    // Expect ~75%; allow generous bounds for stochastic drift.
    expect(bCount / N).toBeGreaterThan(0.7);
    expect(bCount / N).toBeLessThan(0.8);
  });
});

describe('resolvePromotionalPopupForVisitor', () => {
  const exp: PromoExperimentConfig = {
    enabled: true,
    version: 1,
    variants: [
      { id: 'a', label: 'Headline A', savedPromoId: 'snap-a', weight: 1 },
      { id: 'b', label: 'Headline B', savedPromoId: 'snap-b', weight: 1 },
    ],
  };

  it('returns base when no experiment / no schedule', () => {
    const r = resolvePromotionalPopupForVisitor({
      cfg: baseCfg, library, bucketingKey: 'sess',
    });
    expect(r.resolved?.headline).toBe('BASE');
    expect(r.variantKey).toBeNull();
  });
  it('applies experiment variant creative + variantKey', () => {
    const r = resolvePromotionalPopupForVisitor({
      cfg: baseCfg, library, experiment: exp, bucketingKey: 'sess',
    });
    expect(['ARM A', 'ARM B']).toContain(r.resolved?.headline);
    expect(['a', 'b']).toContain(r.variantKey);
  });
  it('schedule rotation overrides experiment (and clears variantKey)', () => {
    const now = new Date('2026-05-02T12:00:00Z');
    const cfg = {
      ...baseCfg,
      schedule: [{
        id: 'sched-1',
        savedPromoId: 'snap-a',
        startsAt: '2026-05-01T00:00:00Z',
        endsAt: '2026-05-03T00:00:00Z',
      }],
    };
    const r = resolvePromotionalPopupForVisitor({
      cfg, library, experiment: exp, bucketingKey: 'sess', now,
    });
    expect(r.resolved?.headline).toBe('ARM A');
    expect(r.scheduleEntryId).toBe('sched-1');
    expect(r.variantKey).toBeNull();
  });
});
