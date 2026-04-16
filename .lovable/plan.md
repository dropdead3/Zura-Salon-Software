

## Prompt review

Good catch — you reported the symptom precisely (booking wizard covered by God Mode bar) and the screenshot makes the clipping unmistakable. Teaching note: when reporting overlay/z-index bugs, the surface name ("the panel-mode QuickBookingPopover") and which mode you're in (God Mode vs normal) speeds diagnosis. Micro-improvement: the platform's `PremiumFloatingPanel` already solves this — calling that out ("does this use the canonical panel?") would have pre-confirmed my fix path.

## Diagnosis

`QuickBookingPopover.tsx` does **not** use the canonical `PremiumFloatingPanel`. It hand-rolls its own floating container with hardcoded positioning that ignores the God Mode bar:

**Panel mode** (lines 2410–2426):
- Backdrop: `fixed inset-0 z-40` — covers the bar.
- Panel: `fixed z-50 top-3 right-3 bottom-3` — top edge sits at 12px, but the God Mode bar occupies the top 44px → panel header (progress bar, "Thu, Apr 16 at 9:00 AM", close button) is hidden behind the bar.

**Popover mode** (lines 2438–2455): same backdrop issue, plus a centered modal at `top-1/2`. Less affected (centered ≠ clipped) but the backdrop still covers the bar.

The God Mode bar is `z-[60]` (`GodModeBar.tsx` line 33), so even though the panel renders below it, the panel's own top edge is geometrically beneath the bar — the bar wins visually but the panel's interactive controls become unreachable.

`PremiumFloatingPanel` already handles this exact case (lines 91–102 of `premium-floating-panel.tsx`): adds 44px top offset when `isImpersonating`, and shifts the backdrop down so it doesn't darken the bar.

## Fix

Mirror the `PremiumFloatingPanel` God Mode logic inside `QuickBookingPopover.tsx`. Minimal, surgical — no API change, no refactor to `PremiumFloatingPanel` (separate concern, the inner content has its own header/scroll system that doesn't drop into the canonical panel cleanly).

### 1. Read God Mode state

Add inside the component body (near other context hooks):
```ts
const { isImpersonating } = useOrganizationContext();
const godModeOffset = isImpersonating ? 44 : 0;
```

### 2. Panel mode (the failing case in the screenshot)

- **Backdrop** (line 2411): add inline `style={{ top: godModeOffset }}` so the dimmer starts below the bar.
- **Panel** (line 2419): swap `top-3` for an inline `style={{ top: godModeOffset + 12 }}` (preserves the 12px gap on normal screens, gives 56px in God Mode → 12px breathing room below the 44px bar). Keep `right-3 bottom-3` as-is.

### 3. Popover mode (centered)

- **Backdrop** (line 2440): same `style={{ top: godModeOffset }}` shift.
- **Centered card** (line 2452): no position change needed — centered modal already sits well below the bar at typical viewport heights. Backdrop fix alone is sufficient.

### 4. Mobile parity

`useIsMobile` already exists in the file (used elsewhere). On mobile in God Mode, the panel's `top-3` similarly clips. The same `godModeOffset` math handles both — `44px` on mobile, `44px` on desktop (bar height is `40` mobile / `44` desktop per `GodModeBar.tsx`). Use `44` for both — the 4px difference on mobile becomes a tiny extra gap, imperceptible and safe.

## Acceptance checks

1. Open booking wizard in God Mode → top edge sits ~12px below the violet bar; full header (progress dots, datetime, close X) is visible and clickable.
2. Open booking wizard with God Mode off → no visual change vs today (still `top: 12px`).
3. Backdrop in God Mode does not darken the violet bar — bar stays fully readable.
4. Centered popover mode in God Mode → backdrop clears the bar; modal still centered.
5. Mobile God Mode → panel slides in below the bar, no header clipping.
6. No regression on `Sheet`/`Dialog` siblings (`NewClientDialog`, `BannedClientWarningDialog`) — they're shadcn primitives unaffected by this change.

## Out of scope

- Migrating `QuickBookingPopover` to `PremiumFloatingPanel` (heavier refactor; the inner shell has bespoke step/progress chrome that doesn't drop in cleanly).
- Auditing every other hand-rolled `fixed` overlay in the codebase for God Mode awareness (separate sweep — file a follow-up if you want platform-wide compliance).
- Changing the bar height or z-index hierarchy.

## Files touched

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — add `useOrganizationContext` import (already imported elsewhere; verify), compute `godModeOffset`, apply `style={{ top: ... }}` to the two backdrops + the panel container.

