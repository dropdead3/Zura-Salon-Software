## What's actually broken

You toggled "Show Promotional Popup" but nothing happened. Three real causes — all fixable:

**1. The toggle doesn't save until you press Save / Done.**
The switch updates local form state. Until you save, the public site still reads the old (disabled) value. There's no "unsaved changes" indicator, so it feels like the toggle did nothing.

**2. The Layout passes a hardcoded surface key (`all-public`) to the popup.**
The popup only renders when `cfg.showOn` includes the surface being viewed *or* contains `'all-public'`. The default config is `showOn: ['home']`, so `'all-public'` never matches `'home'` and the popup is suppressed everywhere — even on the homepage.

**3. The frequency cap (`once-per-session` by default) hides the popup the second time you visit a page in the editor preview.**
Once you've seen it once in the preview iframe, sessionStorage marks the session "dismissed" and you can't see it again without clearing storage.

## Fixes

### A. Route-aware surface in `Layout.tsx`
Replace the hardcoded `surface="all-public"` with a function that maps the current pathname to the right surface key:

- `/` (or `/org/:slug/`) → `home`
- `/booking*` → `booking`
- `/services*` → `services`
- everything else → `all-public` (only fires when operator opts site-wide)

Now toggling on with the default `showOn: ['home']` will actually fire on the homepage.

### B. Editor-preview QA mode in `PromotionalPopup.tsx`
When the popup is rendering inside the editor preview iframe (`useIsEditorPreview()` is true):
- Bypass the frequency cap so operators can re-trigger by reloading the iframe.
- Force the trigger to `immediate` regardless of operator config (delay/scroll/exit-intent are impossible to QA inside a scaled iframe).
- Still respect `enabled`, `showOn`, schedule window, and accent/copy — so what you see is faithful to what visitors see.
- Skip the server-side `record_promo_response` write (no analytics pollution from QA).

### C. Unsaved-changes hint in `PromotionalPopupEditor.tsx`
Track a dirty flag (form data ≠ last loaded settings). When dirty, show a small inline "Unsaved changes — press Done to publish" notice next to the enable toggle so the operator knows the toggle alone isn't enough.

## Technical details

**Files changed:**
- `src/components/layout/Layout.tsx` — add `useLocation` + `resolvePopupSurface()` helper, pass derived surface to both `<PromotionalPopup>` mounts.
- `src/components/public/PromotionalPopup.tsx` — branch on `useIsEditorPreview()` to (a) bypass `shouldRespectDismissal`, (b) force `trigger: 'immediate'`, (c) skip `recordResponse` calls.
- `src/components/dashboard/website-editor/PromotionalPopupEditor.tsx` — derive `isDirty = !isEqual(formData, settings ?? DEFAULT_PROMO_POPUP)`, render a small muted note under the enable toggle when dirty.

**No DB / migration changes.** All three fixes are pure client-side wiring — the table, RPC, and `appointments.promo_offer_code` column from the previous wave stay as-is.

**Acceptance criteria:**
1. With editor open on the homepage preview, toggling Show on → Save → popup appears in iframe within ~1s.
2. Switching to `/booking` preview with `showOn: ['booking']` shows the popup; with `showOn: ['home']` does not.
3. Reloading the editor iframe re-shows the popup (frequency cap bypassed in preview).
4. On the live public site, the once-per-session cap still applies (real visitors only see it once).
5. Toggling enable shows an "unsaved changes" hint until Save fires.
