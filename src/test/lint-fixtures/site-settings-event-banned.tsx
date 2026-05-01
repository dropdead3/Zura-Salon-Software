// Fixture: a non-doctrine module attempting to dispatch the
// `site-settings-draft-write` event. The lint rule must flag this.
//
// This file deliberately violates the rule and is excluded from
// `npm run lint` via the top-level `ignores` in eslint.config.js.

export function leakyDispatch() {
  // This is the exact pattern that caused the May 2026 promo-popup
  // snap-back regression — an empty-detail dispatch outside the
  // owning module. The lint rule must catch this.
  window.dispatchEvent(
    new CustomEvent('site-settings-draft-write', { detail: {} }),
  );
}
