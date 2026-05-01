/**
 * Sole owner of the `promo-popup-preview-reset` CustomEvent.
 *
 * Pattern: mirrors the Site Settings Event Ownership canon
 * (`src/lib/siteSettingsDraft.ts`) — keep the event name + payload shape
 * + dispatcher in one file so:
 *   - the listener (`PromotionalPopup.tsx`) imports the type from one
 *     place and can never drift on the event name;
 *   - a future ESLint rule can ban string-literal dispatches of this
 *     event from anywhere except this module;
 *   - the in-editor "Restart popup preview" affordance never has to
 *     hard-reload the iframe to re-run the lifecycle.
 *
 * Why this exists: `triggerPreviewRefresh()` reloads the entire preview
 * iframe, which is heavyweight when the operator is mid-edit on a
 * long-form section. The popup's full lifecycle (open → countdown →
 * soft-close → FAB → re-open via FAB) only needs local React state
 * resets — not a fresh iframe.
 */

export const PROMO_POPUP_PREVIEW_RESET_EVENT = 'promo-popup-preview-reset';

export interface PromoPopupPreviewResetDetail {
  /** Optional reason — surfaces in devtools for debugging only. */
  reason?: 'editor-button' | 'config-change' | 'manual';
}

/**
 * Dispatch the reset event. Safe to call from any editor surface; the
 * listener in `PromotionalPopup` no-ops when the popup isn't mounted in
 * preview mode.
 */
export function dispatchPromoPopupPreviewReset(
  detail: PromoPopupPreviewResetDetail = {},
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<PromoPopupPreviewResetDetail>(PROMO_POPUP_PREVIEW_RESET_EVENT, {
      detail,
    }),
  );
}
