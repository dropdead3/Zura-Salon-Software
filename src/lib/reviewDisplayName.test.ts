import { describe, it, expect } from 'vitest';
import { resolveReviewDisplayName } from './reviewDisplayName';

describe('resolveReviewDisplayName', () => {
  it('uses operator override above all', () => {
    expect(
      resolveReviewDisplayName({
        override: 'Sarah B.',
        preference: 'anonymous',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    ).toBe('Sarah B.');
  });

  it('returns Anonymous when preference is anonymous', () => {
    expect(
      resolveReviewDisplayName({
        preference: 'anonymous',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    ).toBe('Anonymous');
  });

  it('returns first only when preference is first_only', () => {
    expect(
      resolveReviewDisplayName({
        preference: 'first_only',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    ).toBe('Jane');
  });

  it('returns first + last initial when preference is first_initial', () => {
    expect(
      resolveReviewDisplayName({
        preference: 'first_initial',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    ).toBe('Jane D.');
  });

  it('falls back to first + initial when no preference is set', () => {
    expect(
      resolveReviewDisplayName({
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    ).toBe('Jane D.');
  });

  it('handles missing last name gracefully', () => {
    expect(
      resolveReviewDisplayName({ preference: 'first_initial', firstName: 'Jane' }),
    ).toBe('Jane');
  });

  it('returns Anonymous when no name data exists', () => {
    expect(resolveReviewDisplayName({})).toBe('Anonymous');
  });

  it('treats whitespace-only override as empty', () => {
    expect(
      resolveReviewDisplayName({
        override: '   ',
        preference: 'first_only',
        firstName: 'Jane',
      }),
    ).toBe('Jane');
  });
});
