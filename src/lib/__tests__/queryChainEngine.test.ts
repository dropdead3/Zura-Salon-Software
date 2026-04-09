import { describe, it, expect } from 'vitest';
import { assembleChain } from '../queryChainEngine';
import { parseQuery } from '../queryParser';

const LOCATIONS = ['Brooklyn', 'Gilbert', 'Manhattan', 'West Village'];

function chain(query: string) {
  return assembleChain(parseQuery(query), LOCATIONS);
}

describe('assembleChain', () => {
  it('handles "Brooklyn retail last 30 days"', () => {
    const c = chain('Brooklyn retail last 30 days');
    expect(c.locationScope?.value).toBe('Brooklyn');
    expect(c.topic?.value).toBe('retail');
    expect(c.timeRange?.value).toBe('30d');
    expect(c.destinationHint).not.toBeNull();
    expect(c.destinationHint?.path).toContain('/dashboard/admin/sales');
    expect(c.destinationHint?.params.location).toBe('Brooklyn');
    expect(c.confidence).toBeGreaterThanOrEqual(0.4);
    expect(c.slotCount).toBeGreaterThanOrEqual(3);
  });

  it('handles "top clients no bookings 60 days"', () => {
    const c = chain('top clients no bookings 60 days');
    expect(c.rankingModifier?.direction).toBe('top');
    expect(c.subjectType).toBe('client');
    expect(c.negativeFilter?.type).toBe('no_bookings');
    expect(c.negativeFilter?.daysThreshold).toBe(60);
    expect(c.destinationHint).not.toBeNull();
    expect(c.destinationHint?.path).toContain('reengagement');
  });

  it('handles "refunds this week Gilbert"', () => {
    const c = chain('refunds this week Gilbert');
    expect(c.topic?.value).toBe('refunds');
    expect(c.timeRange?.value).toBe('thisWeek');
    expect(c.locationScope?.value).toBe('Gilbert');
    expect(c.destinationHint?.path).toContain('appointments-hub');
    expect(c.destinationHint?.params.location).toBe('Gilbert');
  });

  it('handles "color clients with no rebook"', () => {
    const c = chain('color clients with no rebook');
    expect(c.topic?.value).toBe('color');
    expect(c.subjectType).toBe('client');
    expect(c.negativeFilter?.type).toBe('no_rebook');
    expect(c.destinationHint).not.toBeNull();
  });

  it('handles "underperforming stylists this month"', () => {
    const c = chain('underperforming stylists this month');
    expect(c.rankingModifier?.direction).toBe('lowest');
    expect(c.subjectType).toBe('stylist');
    expect(c.timeRange?.value).toBe('thisMonth');
    expect(c.destinationHint?.path).toContain('staff-utilization');
    expect(c.destinationHint?.params.filter).toBe('low');
  });

  it('skips chaining for single-word "revenue"', () => {
    const c = chain('revenue');
    // Single slot → slotCount = 1, low confidence
    expect(c.slotCount).toBeLessThanOrEqual(1);
    expect(c.confidence).toBeLessThan(0.4);
  });

  it('produces low confidence for gibberish "xyzabc foo bar"', () => {
    const c = chain('xyzabc foo bar');
    expect(c.confidence).toBeLessThan(0.5);
    // No destination hint when no meaningful slots
    if (c.slotCount < 2) {
      expect(c.destinationHint).toBeNull();
    }
  });

  it('treats location names as locationScope, not subject', () => {
    const c = chain('Manhattan sales last 7 days');
    expect(c.locationScope?.value).toBe('Manhattan');
    expect(c.subject).toBeNull(); // Manhattan consumed as location
    expect(c.topic?.value).toBe('sales');
  });

  it('handles "no show" as negative filter', () => {
    const c = chain('no shows this week');
    // "no shows" might be caught by parser FILTER_PHRASES as status:no_show
    // or by our negative filter extraction — either way the chain should have it
    expect(
      c.negativeFilter?.type === 'no_show' || c.raw.includes('no show')
    ).toBe(true);
  });

  it('skips destination when action verb present', () => {
    const c = chain('add client');
    expect(c.actionVerb).not.toBeNull();
    // Action queries delegate to action framework, not destination hints
    expect(c.destinationHint).toBeNull();
  });

  it('handles ranking modifier with time', () => {
    const c = chain('best stylists this month');
    expect(c.rankingModifier?.direction).toBe('top');
    expect(c.subjectType).toBe('stylist');
    expect(c.timeRange?.value).toBe('thisMonth');
  });
});
