/**
 * Preview refresh helpers.
 *
 * SOFT REFRESH (default — `triggerPreviewRefresh`):
 *   Tells the live iframe to invalidate its in-memory site-settings query
 *   cache via postMessage (`PREVIEW_REFRESH_DRAFT`). The iframe stays mounted,
 *   no JS/CSS cold reparse, no white flash. Use this after every editor save.
 *
 * HARD RELOAD (`triggerPreviewHardReload`):
 *   Forces the iframe to fully remount (`key` bump). Reserved for the manual
 *   Reload button, theme/layout swaps, or structural changes that require a
 *   full document re-render.
 */

export interface PreviewRefreshDetail {
  /** Optional org scope — if provided, only that org's site-settings invalidate. */
  orgId?: string;
  /** Optional setting key — narrows the invalidation to a single key. */
  key?: string;
}

/**
 * Soft refresh — invalidate iframe query caches without remounting.
 * Safe to call on every keystroke / save across all 20+ website editors.
 */
export function triggerPreviewRefresh(detail: PreviewRefreshDetail = {}) {
  window.dispatchEvent(new CustomEvent('website-preview-refresh', { detail }));
  // Also broadcast as a draft-write so the LivePreviewPanel forwards a
  // PREVIEW_REFRESH_DRAFT message into the iframe with the same scoping.
  window.dispatchEvent(new CustomEvent('site-settings-draft-write', { detail }));
}

/**
 * Hard reload — fully remount the iframe. Use sparingly.
 */
export function triggerPreviewHardReload() {
  window.dispatchEvent(new CustomEvent('website-preview-hard-reload'));
}
