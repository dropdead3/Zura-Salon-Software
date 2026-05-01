// Fixture: an unrelated CustomEvent dispatch — must NOT be flagged by
// the site-settings-event-ownership rule. Confirms the selector is
// scoped to the specific event name and doesn't false-positive on
// other CustomEvent usage.

export function dispatchUnrelated() {
  window.dispatchEvent(new CustomEvent('website-preview-refresh', { detail: {} }));
  window.dispatchEvent(new CustomEvent('editor-design-preview', { detail: {} }));
}
