
## Prompt review

Clear visual-affordance instruction — you're using color as a structural signal: amber = "this filter is doing real work right now, pay attention." Good instinct, since week view's single-stylist constraint is easy to forget once the dropdown is closed.

Tighter framing for next time: specify amber *intensity* (subtle tint vs. solid fill) and *which states* (trigger only, or also dropdown rows). I'll infer the cleanest path: **amber-tinted trigger** (border + text + chevron) — visible but not alarming, since this is a structural state, not an error.

## Diagnosis

The stylist filter trigger in `ScheduleHeader.tsx` (around line ~475) is a `<Button variant="outline">` with neutral border/text. In week view it always reflects a single stylist (manual or auto-resolved), but visually it looks identical to day view's neutral multi-select state. No color signal differentiates the two modes.

## Plan

**1. Apply amber styling to the trigger when `view === 'week'`**
- In `ScheduleHeader.tsx`, add conditional classes to the stylist filter `<Button>`:
  - Border: `border-amber-500/60`
  - Text: `text-amber-600 dark:text-amber-400`
  - Hover: `hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300`
  - Chevron icon inherits via `text-amber-600` (or explicit class on the icon)
- Day view: unchanged (default outline styling).

**2. Keep `(week default)` muted suffix as-is**
- Suffix stays `text-muted-foreground` so it doesn't compete with the amber. The amber on the trigger itself is the primary signal; the suffix is the secondary explanation.

**3. Dropdown content unchanged**
- Don't tint dropdown rows amber — the trigger is the at-a-glance signal; the open dropdown is already in an active interaction state where color cues add noise.

**4. Token discipline**
- Use Tailwind amber utilities directly (no token exists for "structural-attention" state yet). If this pattern repeats elsewhere, we can promote it to a token later.
- Stay inside design system: `font-sans`, no font-bold, no uppercase additions.

## Acceptance checks

1. Week view → stylist filter trigger shows amber border, amber text, amber chevron.
2. Day view → stylist filter trigger remains neutral (default outline).
3. Switching from day → week → trigger flips to amber immediately.
4. Switching from week → day → trigger reverts to neutral.
5. `(week default)` suffix remains muted gray, not amber — preserves visual hierarchy.
6. Hover state in week view shows subtle amber-tinted background, not neutral muted.
7. Other filters (location, status) remain unchanged.

**Files to modify:**
- `src/components/dashboard/schedule/ScheduleHeader.tsx`
