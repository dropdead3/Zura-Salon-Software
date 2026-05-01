// Fixture: a non-doctrine module attempting to dispatch the
// `promo-popup-preview-reset` and `promo-popup-preview-state` events.
// The lint rule must flag both. Mirrors the site-settings fixture.
//
// Excluded from `npm run lint` via the top-level `ignores`; the smoke
// test bypasses that with `ignore: false`.

export function leakyResetDispatch() {
  window.dispatchEvent(
    new CustomEvent('promo-popup-preview-reset', { detail: {} }),
  );
}

export function leakyStateDispatch() {
  window.dispatchEvent(
    new CustomEvent('promo-popup-preview-state', { detail: { phase: 'idle' } }),
  );
}
