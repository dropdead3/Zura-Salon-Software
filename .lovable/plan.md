

## Goal
Restyle the "Suggested Script" card to read as an **amber alert** — high-attention, warning-tinted surface that demands the stylist's eye.

## Change
**File:** `src/components/dashboard/schedule/NextVisitRecommendation.tsx` (lines 70–90)

### Style swap (primary → amber)
- Container border: `border-primary/30 border-l-2 border-l-primary/50` → `border-amber-500/40 border-l-4 border-l-amber-500`
- Background gradient: `from-primary/[0.06] to-primary/[0.02]` → `from-amber-500/[0.10] to-amber-500/[0.04]`
- Add subtle amber glow: `shadow-sm` → `shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_4px_12px_-2px_rgba(245,158,11,0.15)]`
- Quote glyph color: `text-primary/40` → `text-amber-500/60`
- Eyebrow label: `text-primary/60` → `text-amber-500` (and rename copy from "Suggested Script" → "Say This")
- Bound variables (`{selectedWeeks}`, `{dayLabel}`, `{timeLabel}`): `text-primary` → `text-amber-500` (still `font-medium`, no bold)
- Add a small `AlertTriangle` (or keep `Quote`) — sticking with `Quote` keeps semantic intent (it IS a script), amber color carries the alert weight

### Optional micro-detail
- Add a subtle pulsing dot next to "Say This" eyebrow (`h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse`) to reinforce attention without being noisy

### Token compliance
- Amber is a Tailwind palette color — used here as a semantic **warning/attention** state, not a brand swap. Consistent with `text-destructive` usage pattern already in the anti-pattern tooltip.
- All weights stay ≤ `font-medium`. Eyebrow keeps `font-display` uppercase + tracking.
- No `font-bold`, no hex codes outside the shadow rgba (which mirrors amber-500).

## Out of scope
- No changes to interval toggle, CTAs, or anti-pattern tooltip
- No changes to the underlying primary button (stays brand-tinted — the card is the alert, the action is the brand)

