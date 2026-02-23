

## Redesign Analytics Quick-Links as a Premium Callout Card

### Current State
The "Looking for analytics?" section is a plain inline row of ghost buttons with arrow icons -- it looks flat and utilitarian, blending into the page without visual distinction.

### New Design
A styled callout card with glass aesthetic that serves as a clear wayfinding element, featuring:

- A subtle glass card container (`bg-card/80 backdrop-blur-xl border-border/60 rounded-xl`) with a left accent gradient border
- A header row with a `BarChart3` icon in a `tokens.card.iconBox`, the prompt text "Looking for analytics?", and a muted description
- Link pills rendered as individually styled interactive chips with hover effects -- each link gets its own mini card treatment with icon + label + arrow, using a subtle background (`bg-muted/40`) that lifts on hover

### Visual Structure

```text
+---------------------------------------------------------------+
|  [icon]  Looking for analytics?                                |
|          Jump to detailed breakdowns and trend reports.        |
|                                                                |
|  [ Appointment Analytics -> ]  [ Booking Pipeline -> ]         |
|  [ Sales Overview -> ]         [ Staff Utilization -> ]        |
+---------------------------------------------------------------+
```

### Technical Changes

**Edit: `src/pages/dashboard/AppointmentsHub.tsx`** (lines 303-319)

Replace the plain flex row with a styled `Card` component:

- Import `BarChart3` from lucide-react (add to existing import)
- Card uses `tokens.card.wrapper` with glass treatment
- Header uses `tokens.card.iconBox` + icon pattern per UI Canon
- Links rendered as a grid of interactive link chips (2-column on desktop, 1-column on mobile)
- Each chip: `rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors` with `group` hover for the arrow animation
- Arrow icon slides right on hover via `group-hover:translate-x-0.5 transition-transform`
- Typography: prompt text in `font-display` (Termina), link labels in `font-sans` (Aeonik Pro)
- All within a compact padding (`p-4`) to keep it lightweight

### Files Modified

- **Edit:** `src/pages/dashboard/AppointmentsHub.tsx` -- Replace lines 303-319 with the new callout card component

