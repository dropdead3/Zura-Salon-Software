
## Prompt review

Strong intent — color-coded capacity in the date picker is exactly the kind of "ambient leverage signal" the platform should surface. Two clarifications would tighten it:

1. **Capacity definition**: utilization % (booked time ÷ available shift time)? Or open slots ÷ total slots? These give different signals — utilization rewards long appointments, slot-count rewards bookable gaps.
2. **Time window**: just the visible month? Next 60 days? All loaded data?

I'll proceed with **utilization %** (project already has `computeUtilizationByStylist` in `src/lib/schedule-utilization.ts` — single source of truth, consistent with DayView and ScheduleHeader staff dropdown) aggregated **org-wide for the visible month + adjacent days the calendar shows**. Calling out the assumption so you can redirect.

Teaching note: when adding ambient signals (color, badges, dots), specify the *metric*, *aggregation scope*, and *thresholds* up front — saves a round-trip and prevents the engine from guessing.

## Diagnosis & approach

The date picker in `ScheduleHeader.tsx` (centered Popover) renders `<Calendar mode="single">` from `src/components/ui/calendar.tsx`. react-day-picker supports a `modifiers` prop + `modifiersClassNames` to apply arbitrary CSS classes to specific days. This is the clean injection point — no fork of Calendar needed.

**Color thresholds (inverted from utilization — high open capacity = white/calm, low open capacity = red/urgent):**

| Utilization | Open capacity | Color | Meaning |
|---|---|---|---|
| 0–49% | High | white/default | Plenty of room |
| 50–69% | Moderate | yellow | Filling up |
| 70–89% | Low | orange | Tight |
| 90–100% | Near zero | red | Effectively booked |

Colors via design tokens: default text, `text-amber-500`, `text-orange-500`, `text-red-500` (dark-mode safe variants). Dot indicator under the day number is more luxury-aligned than coloring the whole cell — keeps the calm aesthetic, doesn't compete with selected/today states.

**Going with: small dot below day number** (4px, colored by tier). White/no-dot for high capacity (no noise when calm), colored dots only when attention-worthy.

## Fix

### 1. `src/components/dashboard/schedule/ScheduleHeader.tsx`
- Compute per-day utilization map from `appointments` + `stylists` props (already in scope based on existing code patterns) using `computeUtilizationByStylist` aggregated org-wide per date.
- Org-wide daily utilization = sum of booked minutes across all stylists ÷ sum of available minutes across all stylists for that date.
- Build `Date[]` arrays for each tier: `moderateDays`, `lowDays`, `criticalDays`.
- Pass to `<Calendar>` as `modifiers={{ moderate, low, critical }}` and `modifiersClassNames={{ moderate: '...', low: '...', critical: '...' }}`.
- Wrap the date trigger button with a `Tooltip` (or add a small info icon inside the Popover header) explaining the legend:
  > "Capacity signal — yellow: filling up · orange: tight · red: effectively booked"

### 2. `src/components/ui/calendar.tsx`
- No structural change. Tier classes will apply a `relative` day cell with an `::after` pseudo-element dot, OR simpler: add a small absolutely-positioned `<span>` via the `DayContent` component override.
- Cleanest path: use `components.DayContent` to render `{day} + <Dot tier={...} />` — but this requires looking up tier inside the component. Easier with `modifiersClassNames` + a small CSS rule.

**Decision**: use `modifiersClassNames` with Tailwind classes that add an `after:` pseudo-dot:
- `moderate`: `after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-amber-500`
- `low`: same with `after:bg-orange-500`
- `critical`: same with `after:bg-red-500`

Calendar's `cell` class already has `relative` — confirmed in current file. Day button needs to inherit relative positioning or we apply to the cell-level modifier. react-day-picker applies `modifiersClassNames` to the day button itself, so we add `relative` to the modifier class.

### 3. Legend tooltip
Inside the centered Popover (above or below the Calendar), add a compact legend strip:
```
[•yellow] Filling  [•orange] Tight  [•red] Booked
```
Plus a `MetricInfoTooltip`-style info icon next to the month caption explaining: "Dots reflect org-wide booked time vs available shift time per day. White = open. Yellow ≥50%, Orange ≥70%, Red ≥90%."

Going with **inline legend strip** under the calendar (always visible, no hover needed) — matches "calm, executive, expandable logic" doctrine. Plus a tooltip on the trigger pill itself for the broader explanation.

## Acceptance checks

1. Days with ≥50% utilization show a yellow dot under the day number.
2. Days with ≥70% show orange; ≥90% show red.
3. Days with <50% show no dot (default white/calm).
4. Past days and outside-month days do not show dots (utilization data only meaningful for current/future scheduled days).
5. Legend strip renders inside the popover, below the calendar grid.
6. Tooltip on the date trigger explains the capacity signal.
7. Selected and today states render correctly on top of dots (dot sits below day number, doesn't conflict).
8. Dark mode: dot colors remain visible against dark surface.

## Out of scope

- Per-location filtering of capacity (uses currently selected location scope from existing context).
- Hover preview of "X appointments, Y% booked" on each day — could be Phase 2.
- Coloring the day number itself — sticking with dot pattern for calm aesthetic.

## Files touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx` — compute per-day utilization tiers, pass `modifiers` + `modifiersClassNames` to `<Calendar>`, add legend strip and tooltip.
- (No changes needed to `src/components/ui/calendar.tsx` — modifier system handles it.)
