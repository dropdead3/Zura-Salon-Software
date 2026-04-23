

## Goal
Replace the flat top cap with a **corner-wrapping frame** — the accent color traces the rounded top-left and top-right corners and runs a short distance down each side, matching the reference screenshot.

## What changes
File: `src/components/dashboard/schedule/AppointmentCardContent.tsx`

### 1. Category-color cards — swap flat cap for corner frame
Replace the current flat horizontal strip (`absolute left-1 right-1 top-0 h-[3px]`) with a true frame that wraps the top corners. Implementation: a single absolutely-positioned `<div>` filling the card, styled as a transparent box with **top + partial left/right borders** and matching `border-radius` so the stroke naturally follows the rounded corners.

```jsx
<div
  className="absolute inset-0 pointer-events-none z-[3] rounded-[10px]"
  style={{
    border: '1.5px solid transparent',
    borderTopColor: catColor.text,
    // partial side wrap — fades out ~14px down each side
    borderImage: `linear-gradient(
      to bottom,
      ${catColor.text} 0px,
      ${catColor.text} 14px,
      transparent 14px
    ) 1 / 1.5px / 0 stretch`,
    opacity: 0.75,
  }}
/>
```

If `border-image` proves fiddly with rounded corners, fall back to **two stacked elements**:
- One absolute `inset-0` div with `rounded-[10px]`, transparent fill, and a 1.5px top border in `catColor.text` (gives the full top wrap including corners).
- Two short vertical strips (`absolute top-0 left-0 w-[1.5px] h-3.5` and same on right) in `catColor.text` to extend the wrap a touch down each side.

The two-element fallback is more reliable across browsers and respects the existing `rounded-[10px]` perfectly.

### 2. Status-color cards — same treatment
Currently uses `border-t-4` on the main grid container (line 685). Drop the `border-t-4` and instead render the same corner-frame element conditionally for status-colored cards, using `statusColors.border` resolved to a CSS color. This keeps both code paths visually unified.

### 3. Tuning values
- Stroke weight: `1.5px` (matches reference — thinner than current 3px cap, reads as a frame not a slab)
- Side wrap depth: `14px` (about 1/3 of a standard card's visible top region — matches the reference proportion)
- Opacity: `0.75` for category color, full opacity for status color (status colors are already muted)
- Corner radius on the frame element matches the card: `rounded-[10px]`

## What stays exactly the same
- Card radius, shadow stack, hover lift, sheen overlay, lit-edge inner ring
- 1px overlap gap math in `schedule-utils.ts`
- All status pills, NC/RC chips, stylist avatars, multi-service bands
- Cancelled hatch, no-show ring/dot, selected glow
- Day / Week / Agenda variant structure

## QA
- Top corners show the colored stroke wrapping cleanly around the radius (no square bleed past the curve)
- Stroke continues ~14px down the left and right edges, then stops cleanly
- Bottom of card has no accent — frame is open at the bottom
- Both category cards (pastel) and status cards (Conf/Unconf/etc.) use the same wrap treatment
- 1px overlap gap between adjacent cards is preserved — the frame does not bleed across the gap
- Selected ring sits cleanly inside the frame; no-show dot still anchors top-left without colliding with the wrap

## Enhancement suggestion
After this lands, the corner-wrap is the natural moment to introduce a `<CardCornerFrame color={...} wrapDepth={14} />` primitive. Then drag previews, coverage blocks, break overlays, and AI suggestion ghosts can all share the same accent grammar with one prop change — and the wrap depth becomes a single design token (`tokens.schedule.cornerWrapPx`) instead of a magic number scattered across files.

