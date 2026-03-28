

## Problem

The top bar wrapper (`dashboard-top-bar`) has `z-30` in sticky mode, but the popover's backdrop overlay is `z-[45]`. Since the overlay sits above the top bar in the stacking order, it darkens the padding area around the rounded-full pill — which has a white/background color in light mode. This creates the appearance of a flat white bar above the content.

## Plan

**File:** `src/components/dashboard/SuperAdminTopBar.tsx`

Raise the top bar's z-index above the backdrop overlay so the entire top bar area (including its padding) floats over the darkened content:

- Change `z-30` to `z-[48]` on the outer wrapper (line 148)
- This keeps it below the popover content (`z-[46]`) — wait, we need it above the overlay (`z-[45]`) but below the popover (`z-[46]`). Actually the popover is already portaled and at `z-[46]`, so the top bar at `z-[48]` would cover the popover. Instead, raise it to exactly `z-[46]` — same plane as the popover, which is fine since the popover is portaled and positioned absolutely.

Actually, simplest approach:

**File:** `src/components/dashboard/ViewAsPopover.tsx`

- Change the backdrop overlay to start from `top: 0` instead of measuring the top bar bottom
- Lower the overlay z-index to `z-[28]` (below the top bar's `z-30`)
- The top bar naturally sits above the overlay, and the rounded-full pill floats cleanly over the darkened page
- Keep the popover content at `z-[46]` (already above everything)

This way:
- Overlay: `z-[28]` — below top bar, covers full page
- Top bar: `z-30` — above overlay, pill floats naturally
- Popover: `z-[46]` — above everything

The darkened/blurred effect covers the full viewport behind the top bar, and the top bar's transparent padding area is no longer affected.

