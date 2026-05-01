// Fixture: a non-doctrine module attempting to dispatch the
// `editor-section-hover` event. The lint rule must flag this.
//
// Excluded from `npm run lint` via the top-level `ignores`; the smoke
// test (lint-config-resolution) bypasses that with `ignore: false`.

export function leakyHoverDispatch() {
  window.dispatchEvent(
    new CustomEvent('editor-section-hover', { detail: { sectionId: null } }),
  );
}
