/**
 * Sole owner of the `promo-popup-preview-reset` AND
 * `promo-popup-preview-state` CustomEvents.
 *
 * Pattern: mirrors the Site Settings Event Ownership canon
 * (`src/lib/siteSettingsDraft.ts`) — keep the event names, payload shapes,
 * and dispatchers in one file so:
 *   - the listener (`PromotionalPopup.tsx`) imports types from one place
 *     and can never drift on the event name;
 *   - an ESLint `no-restricted-syntax` rule (see `eslint.helpers.js`) bans
 *     string-literal dispatches of these events from anywhere except this
 *     module — enforced by `src/test/lint-rule-promo-popup-events.test.ts`;
 *   - the in-editor "Restart popup preview" affordance never has to
 *     hard-reload the iframe to re-run the lifecycle;
 *   - the editor button label can echo the popup's lifecycle phase
 *     (idle / open / fab) without each side guessing the other's state.
 *
 * Why this exists: `triggerPreviewRefresh()` reloads the entire preview
 * iframe, which is heavyweight when the operator is mid-edit on a
 * long-form section. The popup's full lifecycle (open → countdown →
 * soft-close → FAB → re-open via FAB) only needs local React state
 * resets — not a fresh iframe.
 */

// ── Reset event ──────────────────────────────────────────────────────────
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
  dispatchOwnedEvent<PromoPopupPreviewResetDetail>(
    PROMO_POPUP_PREVIEW_RESET_EVENT,
    detail,
  );
}

// ── State echo event ─────────────────────────────────────────────────────
// The popup echoes its lifecycle phase back so the editor can render a
// context-aware button label ("Trigger popup" / "Restart preview" /
// "Reopen from FAB") without duplicating the state machine. One-way
// signal: editor listens, popup dispatches. Replays last state on
// listener-attach via the `getLastPromoPopupPreviewPhase()` getter so
// late mounts don't have to wait for the next transition.
export const PROMO_POPUP_PREVIEW_STATE_EVENT = 'promo-popup-preview-state';

export type PromoPopupPreviewPhase = 'idle' | 'open' | 'fab';

export interface PromoPopupPreviewStateDetail {
  phase: PromoPopupPreviewPhase;
}

let lastPhase: PromoPopupPreviewPhase = 'idle';

/**
 * Read the most recently broadcast phase. Lets the editor button render
 * the correct label on first paint without waiting for a transition.
 */
export function getLastPromoPopupPreviewPhase(): PromoPopupPreviewPhase {
  return lastPhase;
}

/**
 * Dispatch the lifecycle phase. Call sites: PromotionalPopup only.
 * No-ops when phase hasn't changed so we don't spam re-renders.
 */
export function dispatchPromoPopupPreviewState(phase: PromoPopupPreviewPhase): void {
  if (typeof window === 'undefined') return;
  if (phase === lastPhase) return;
  lastPhase = phase;
  dispatchOwnedEvent<PromoPopupPreviewStateDetail>(
    PROMO_POPUP_PREVIEW_STATE_EVENT,
    { phase },
  );
}
