

## Why prior attempts failed
You're right to call this out — the design pattern already exists in the codebase. `AgendaContent` line 443 renders exactly what your screenshot shows:

```tsx
<div className={cn('w-1 self-stretch rounded-full', statusConfig.bg)} />
```

A clean **inset pill** — full color, rounded ends, padded in from the card edge. No corner-wrapping, no taper, no SVG. The previous three attempts overengineered an "edge-bleed" shape when the reference was a standard inset bar that already exists in the agenda variant.

## The pattern (matches the screenshot exactly)

Looking at the screenshot:
- Bar sits **inset** from the left edge (~6px in), not flush
- Bar is **inset from top and bottom** (~6px), not full-height
- Bar uses a **fully saturated status color** (mint green for confirmed, etc.)
- Bar is `rounded-full` (pill shape)
- Card content padding shifts right to clear the bar
- No corner wrapping. No taper. No SVG.

## Implementation

### File
`src/components/dashboard/schedule/AppointmentCardContent.tsx`

### Step 1 — Add a `LeadingAccentBar` component (above `GridContent`)

```tsx
function LeadingAccentBar({ colorClass }: { colorClass: string }) {
  return (
    <div
      className={cn(
        'absolute left-1.5 top-1.5 bottom-1.5 w-1 rounded-full pointer-events-none z-[5]',
        colorClass
      )}
      aria-hidden
    />
  );
}
```

- `left-1.5 top-1.5 bottom-1.5` → 6px inset on left, top, bottom
- `w-1` → 4px wide pill
- `rounded-full` → pill ends
- `z-[5]` → above service bands and overlays, below interactive content
- `pointer-events-none` → no drag/click interference

### Step 2 — Resolve the bar color from one source

Inside the main card component, just before `gridContent`:

```tsx
// Status-based saturated color for the leading accent bar.
// Always uses status color regardless of category coloring — the bar is
// the canonical status signal.
const statusKey = (appointment.status || 'booked') as keyof typeof APPOINTMENT_STATUS_COLORS;
const accentColorClass = APPOINTMENT_STATUS_COLORS[statusKey]?.bg || APPOINTMENT_STATUS_COLORS.booked.bg;
```

This reuses the existing canonical status map (already imported on line 28). No new tokens, no `currentColor`, no per-card color drift.

### Step 3 — Render once inside `gridContent`

After `<CardOverlays />`, before service bands:

```tsx
<CardOverlays ... />

{!BLOCKED_CATEGORIES.includes(appointment.service_category || '') && size !== 'compact' && (
  <LeadingAccentBar colorClass={accentColorClass} />
)}

{/* Multi-service color bands */}
...
```

Exclusions:
- Skip on **blocked / break** cards (cross overlay reads cleanly without it)
- Skip on **compact** cards (28px tall — bar would dominate)

### Step 4 — Shift content padding to clear the bar

In `GridContent`, the wrapper currently uses `px-2 py-1`. Change to `pl-3.5 pr-2 py-1` so client name / service text doesn't overlap the bar:

- `px-2` → `pl-3.5 pr-2` (12px left padding, was 8px → +4px to clear the 4px bar + 6px inset)

Apply to all three render paths: `compact` block, `showStylistBadge` (week) block, and day-view block. Compact stays at `px-2` since no bar renders.

## What stays the same
- Card padding everywhere else, radius, shadow, hover lift, sheen
- Category fill behavior (the bar overlays the category color cleanly)
- Service bands render underneath at `z-0`/`z-[3]`; bar sits above at `z-[5]`
- Cancelled cards inherit `opacity-60` from the parent
- No-show ring, selected ring, gradient consultation cards — all untouched
- Drag/resize hit area (bar is `pointer-events-none`)
- Agenda variant (already has its own divider — no change)

## QA checklist
- Bar is inset 6px from left, top, and bottom (matches screenshot)
- Bar is fully saturated status color (mint green for confirmed, amber for unconfirmed, etc.)
- Bar is a clean rounded pill — no taper, no corner wrap
- Content text starts to the right of the bar with no overlap
- Compact cards: no bar (no room)
- Blocked / break cards: no bar (cross overlay clean)
- Cancelled cards: bar dims with parent opacity
- Selected cards: primary ring renders cleanly above the bar
- Card shadows and hover lift unchanged
- Light mode + dark mode: status color matches the existing dot in the status badge

## Enhancement suggestion
After this lands, expose `LeadingAccentBar` as a reusable primitive in `src/components/dashboard/schedule/primitives/` with one prop (`status`). Same primitive can then power drag-preview ghosts and AI suggestion ghost cards with a single source of truth. That ends the "rebuild from scratch" cycle that caused the last three iterations.

