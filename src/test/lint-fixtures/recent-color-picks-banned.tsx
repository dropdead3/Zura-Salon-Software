// Fixture: a non-doctrine module attempting to dispatch the
// `zura:recent-color-picks` event. The lint rule must flag this.
//
// Excluded from `npm run lint` via the top-level `ignores`; the smoke
// test (lint-config-resolution) bypasses that with `ignore: false`.

export function leakyRecentPicksDispatch() {
  window.dispatchEvent(new CustomEvent('zura:recent-color-picks'));
}
