import { describe, it, expect } from 'vitest';
import { ctrSignificance } from './promo-stats';

describe('ctrSignificance', () => {
  it('flags control as control regardless of stats', () => {
    expect(ctrSignificance({ impressions: 0, ctaClicks: 0 }, { impressions: 0, ctaClicks: 0 }, true).kind).toBe('control');
  });

  it('returns insufficient when below per-arm n threshold', () => {
    const r = ctrSignificance({ impressions: 50, ctaClicks: 10 }, { impressions: 200, ctaClicks: 20 }, false);
    expect(r.kind).toBe('insufficient');
    if (r.kind === 'insufficient') expect(r.needed).toBe(50);
  });

  it('returns inconclusive when CI straddles zero', () => {
    // 12% vs 10% on 100 impressions each — CI wide enough to straddle 0.
    const r = ctrSignificance({ impressions: 100, ctaClicks: 12 }, { impressions: 100, ctaClicks: 10 }, false);
    expect(r.kind).toBe('inconclusive');
  });

  it('flags significant-up on a clear win', () => {
    const r = ctrSignificance({ impressions: 1000, ctaClicks: 200 }, { impressions: 1000, ctaClicks: 100 }, false);
    expect(r.kind).toBe('significant-up');
  });

  it('flags significant-down on a clear loss', () => {
    const r = ctrSignificance({ impressions: 1000, ctaClicks: 50 }, { impressions: 1000, ctaClicks: 150 }, false);
    expect(r.kind).toBe('significant-down');
  });
});
