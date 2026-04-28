## Goal

Convert the `level_progress` dashboard section from a small "go-to-page" nudge into a proper analytic card that reads like every other Command Center analytic — header + four KPI buckets:

1. **Ready to Level Up** — stylists who are fully qualified for promotion
2. **On Pace** — stylists actively progressing (not at risk, not yet ready)
3. **At Risk** — stylists who have fallen below retention minimums (coaching flag)
4. **Needs Review for Level Down** — stylists whose retention failures triggered demotion-eligible status

The whole card stays linkable to `/admin/graduation-tracker` so leadership can drill in.

## What changes

### 1. Rebuild `src/components/dashboard/LevelProgressNudge.tsx` as `LevelProgressCard`

Replace the current single-stylist pill with a leadership-oriented 4-bucket KPI card following the **Card Header Layout canon**:

- Wrap in `Card` using `tokens.card.wrapper`
- Header: `tokens.card.iconBox` (GraduationCap icon) + `CardTitle` with `tokens.card.title` ("LEVEL PROGRESS") + `MetricInfoTooltip` inline + total-stylists badge on the right
- Body: 4 KPI tiles in a responsive grid (`grid-cols-2 md:grid-cols-4`) — each tile shows count + label + colored status dot
  - Ready to Level Up — emerald
  - On Pace — primary/blue
  - At Risk — amber
  - Needs Review for Level Down — rose/destructive
- Footer: subtle "View Team Progress →" link to `dashPath('/admin/graduation-tracker')` using `tokens.button.cardFooter` style
- Counts pulled from `useTeamLevelProgress().counts`:
  - readyToLevelUp = `counts.ready`
  - onPace = `counts.inProgress`
  - atRisk = `counts.atRisk`
  - needsReview = `counts.belowStandard`
- Loading: skeleton state matching layout
- Empty: when `counts.total === 0`, return `null` (visibility-contract canon — silence is valid)

### 2. Keep stylist-side experience intact

The current `LevelProgressNudge` was meant for individual stylists ("your" career progression). Since the section is now leadership-oriented and aggregate, I'll:

- Keep a thin stylist-only branch inside the new card: when `hasStylistRole && !isLeadership`, render the existing single-user nudge UI (move the old logic into a small `MyLevelProgressNudge` sub-component).
- When `isLeadership` (owner/admin/manager), render the new 4-bucket aggregate card.
- This preserves stylist privacy contract — stylists never see org-wide counts.

### 3. Wire role-aware rendering in `DashboardHome.tsx`

`level_progress` already renders for `hasStylistRole || isLeadership` (from the prior change). The new component handles both branches internally — no change needed at the section map.

### 4. Customize menu copy

Update the description in `DashboardCustomizeMenu.tsx` from "Your career level trajectory" to "Team level readiness — promotions, pace, risk" so leadership understands what they're enabling.

## Files edited

- `src/components/dashboard/LevelProgressNudge.tsx` — rebuilt as dual-mode (stylist nudge + leadership 4-bucket KPI card)
- `src/components/dashboard/DashboardCustomizeMenu.tsx` — updated description text

## Open question

**Should this also become pinnable in the Analytics Hub** (wrapped in `PinnableCard` like `LevelReadinessCard`), so owners can pin it to Command Center the same way they pin other analytic cards?

- If **yes**: I'll wrap it in `PinnableCard` with `elementKey="level_progress_kpi"` so it shows up in the customize menu's pinnable-cards list too.
- If **no**: It stays a regular dashboard section toggled via the existing `level_progress` switch.

I recommend **yes** — it matches your direction that this "belongs in the analytic card section." Confirm and I'll include `PinnableCard` wrapping in the build.
