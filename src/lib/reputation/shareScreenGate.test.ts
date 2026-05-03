/**
 * Non-Gating Doctrine regression test.
 *
 * Locks the rule: the public share screen is decided ONLY by link availability,
 * never by rating. If a future contributor adds a `rating` parameter to
 * `shouldShowPublicShareScreen` to "only send happy clients to Google", this
 * suite is the trip-wire.
 */
import { describe, it, expect } from 'vitest';
import { shouldShowPublicShareScreen } from './shareScreenGate';

describe('shouldShowPublicShareScreen — non-gating doctrine', () => {
  it('returns false when no links are configured', () => {
    expect(shouldShowPublicShareScreen({})).toBe(false);
    expect(shouldShowPublicShareScreen(null)).toBe(false);
    expect(shouldShowPublicShareScreen(undefined)).toBe(false);
  });

  it('returns true when ANY single link is configured', () => {
    expect(shouldShowPublicShareScreen({ googleReviewUrl: 'https://g.co/r' })).toBe(true);
    expect(shouldShowPublicShareScreen({ appleReviewUrl: 'https://maps.apple.com/r' })).toBe(true);
    expect(shouldShowPublicShareScreen({ yelpReviewUrl: 'https://yelp.com/r' })).toBe(true);
    expect(shouldShowPublicShareScreen({ facebookReviewUrl: 'https://fb.com/r' })).toBe(true);
  });

  it('treats empty strings as missing (not configured)', () => {
    expect(
      shouldShowPublicShareScreen({
        googleReviewUrl: '',
        appleReviewUrl: '',
        yelpReviewUrl: '',
        facebookReviewUrl: '',
      }),
    ).toBe(false);
  });

  it('signature has NO rating parameter — adding one re-introduces review gating', () => {
    // Compile-time + runtime guard. If someone adds `rating` to the signature,
    // `length` will change and this assertion will fail loudly.
    expect(shouldShowPublicShareScreen.length).toBe(1);
  });
});
