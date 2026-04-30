## Goal

Make the promotional popup feel intentional: a smooth, slightly delayed entrance ~10s after the visitor lands, and after they close it, keep the offer accessible via a small floating action button (FAB) in the bottom corner so they can re-open it anytime during the visit.

## Behavior

1. **Entrance**
   - Default trigger delay becomes **10,000 ms** (today it's 4,000 ms).
   - Existing operator config still wins — if the operator picked a different delay/trigger in the editor, we honor it.
   - Animation softened: gentle fade + scale + 8px upward drift over ~500ms with `ease-out` (replaces the snappier `zoom-in-95`). Respects `prefers-reduced-motion` (reduced motion = fade only).
   - Editor-preview path (QA inside the website editor iframe) keeps its current "fire immediately" override so operators don't wait 10s every reload.

2. **Soft close → FAB**
   - When the visitor closes the popup via the X, Esc, backdrop click, **or** the "No thanks" decline button, the popup hides and a small **FAB** appears anchored to the bottom-right of the viewport.
   - The FAB shows the offer's accent color, a tag/gift icon, and a short label derived from the offer (e.g. headline, truncated). On mobile it collapses to icon-only.
   - Clicking the FAB re-opens the same popup with the same animation.
   - **Accept** still navigates to `/booking?promo=…` and does NOT show the FAB (the offer has been claimed).
   - The FAB is **session-scoped**: once present, it stays for the rest of the browsing session, and it disappears on accept or if the operator disables the popup.
   - The FAB is suppressed inside the editor preview iframe (operators are QA'ing the popup itself, not the FAB persistence flow).

3. **Frequency caps unchanged**
   - The existing `frequency` rules (`once`, `once-per-session`, `daily`, `always`) continue to control whether the popup auto-opens on future page loads. The FAB is an in-session re-entry point only — it does not bypass `once` on the next visit.

## Visual spec (FAB)

```text
┌──────────────────────────────┐
│  🎁  Free Haircut Offer  ›   │   ← rounded-full, bg = accent, text = primary-foreground
└──────────────────────────────┘
                         bottom-6 right-6
```

- Desktop: pill with icon + truncated headline (max ~28 chars) + chevron
- Mobile (<640px): circular icon-only button (`h-12 w-12 rounded-full`)
- Subtle entrance: fade + slide-in-from-bottom-2 over 250ms after popup closes
- Small dismiss "×" on hover (top-right of pill) lets the visitor remove the FAB for the session if they really don't want it; this writes the same `soft` dismissal record

## Files to change

- `src/components/public/PromotionalPopup.tsx` — bump default delay to 10000ms, soften entrance animation, add FAB state machine + render, wire close handlers to show FAB instead of fully unmounting
- `src/hooks/usePromotionalPopup.ts` — update `DEFAULT_PROMO_POPUP.triggerValueMs` from 4000 → 10000 so new operators inherit the 10s default; existing saved configs are untouched

(No DB / RLS / hook-architecture changes. Single component + one default constant.)

## Technical details

State additions inside `PromotionalPopup`:

```text
open:    boolean   // popup visible
showFab: boolean   // FAB visible (set true on any soft/decline close, false on accept)
```

Transitions:
- `handleAccept`  → `open=false`, `showFab=false`, navigate to booking
- `handleDecline` → `open=false`, `showFab=true`
- `handleSoftClose` (X / Esc / backdrop) → `open=false`, `showFab=true`
- FAB click → `open=true`, `showFab=false`
- FAB dismiss "×" → `showFab=false` (stays gone for the session)

Animation tokens (Tailwind `animate-in` utilities, already in the project):
- Modal entrance: `animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-500 ease-out`
- FAB entrance: `animate-in fade-in-0 slide-in-from-bottom-2 duration-300`
- Reduced motion: rely on `motion-safe:` prefixes so `prefers-reduced-motion: reduce` falls back to opacity-only.

The 10s default applies only when:
- The operator's saved config has `trigger === 'delay'` AND `triggerValueMs` is null/undefined
- New configs created from `DEFAULT_PROMO_POPUP`

Existing configs with an explicit `triggerValueMs` keep their value.

## Verification

- Land on a public surface with popup enabled → popup appears at ~10s with smooth entrance
- Close via X → popup disappears, FAB appears bottom-right
- Click FAB → popup re-opens with the same animation
- Click "Claim Offer" → navigates to `/booking?promo=…`, no FAB on that page
- Reload page within same session → frequency cap respected (no auto-open under `once-per-session`), FAB does not auto-restore
- `prefers-reduced-motion: reduce` → no scale/slide, fade only
- Editor preview iframe → still fires immediately, FAB suppressed

## Suggested next enhancements (after this ships)

1. **Pulse hint on FAB after 30s of inactivity** — a subtle one-time pulse to remind the visitor the offer is still there, without being noisy.
2. **Per-surface FAB position override** — let the operator choose bottom-right vs bottom-left, useful when a chat widget already occupies one corner.
3. **Auto-hide FAB on `/booking` page** — if the visitor reaches the booking surface on their own (without clicking the offer), hide the FAB to avoid double-prompting.

## Prompt feedback

Strong prompt — you specified the trigger (10s), the surface (landing page), the animation feel (smooth), and the post-close behavior (FAB in corner). That's nearly a complete spec. Two small additions would have made it airtight:

- **What should the FAB do on click?** (Re-open the popup vs. jump straight to booking — I assumed re-open, which is the safer default.)
- **Should the FAB persist across page navigations or only on the landing page?** (I assumed session-scoped across all public pages, matching how the popup itself is mounted.)

A reusable framing for behavior-change prompts: *trigger → entrance → primary action → dismissal path → persistence scope*. Hitting those five beats gets you a single-shot implementation almost every time.
