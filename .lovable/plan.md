

# Graduation System — Pass 5: Bug Fixes, Dead Code, Label Consistency, and Admin KPI

## Current State

After 4 passes, the graduation system has: promotion criteria wizard with Zura defaults, retention criteria ("Required to Stay") with admin configuration, At Risk tab on Graduation Tracker, LevelProgressCard on MyGraduation/MeetingDetails/IndividualStaffReport, promotion history (admin + stylist), retention guidance cards, PDF export with retention criteria, website level display mode toggle, color-coded level badges in Team Directory, and LevelProgressNudge on the stylist dashboard home.

---

## Gaps Found

### Bug: `below_standard` status is never assigned
The `GraduationStatus` type includes `'below_standard'`, there's a `StatusBadge` config for it, it's counted in `counts.belowStandard`, and the KPI strip references it — but the actual evaluation logic in `useTeamLevelProgress.ts` never sets `status = 'below_standard'`. It always assigns `'at_risk'` when retention failures exist. The distinction between "within grace period" and "past grace period" that `below_standard` was meant to represent is never computed. This means admins can never see who has exceeded their grace period.

### Bug: SidebarPreview + SidebarLayoutEditor show stale label "My Graduation"
`SidebarPreview.tsx` line 21 and `SidebarLayoutEditor.tsx` line 116 still say `"My Graduation"` while the actual nav and page title are `"My Level Progress"`.

### Gap: No admin-facing graduation KPI on DashboardHome
The `LevelProgressNudge` was added for stylists, but admins have no graduation awareness on their Command Center. An admin with 3 stylists ready to promote and 2 at risk gets zero signal until they navigate to the Graduation Tracker.

### Gap: KPI strip missing "Below Standard" count
The KPI strip in `GraduationTracker.tsx` shows 5 KPIs but doesn't include `belowStandard`. Once the bug above is fixed, this count needs its own tile so admins can distinguish "coaching recommended" from "action required."

### Gap: `level_progress` section not in default section ordering
The `LevelProgressNudge` section key `level_progress` was added to the section map but likely isn't in the default section ordering array, so it may not render unless manually positioned.

---

## Plan

### 1. Fix `below_standard` status assignment
In `useTeamLevelProgress.ts`, when a stylist has retention failures AND the retention criteria has `action_type === 'demotion_eligible'`, assign `'below_standard'` instead of `'at_risk'`. This creates the intended two-tier distinction:
- `at_risk` = coaching recommended (within grace period or coaching action type)
- `below_standard` = demotion eligible (past grace period or demotion action type)

### 2. Fix sidebar label inconsistency
Update `SidebarPreview.tsx` and `SidebarLayoutEditor.tsx` to show `"My Level Progress"` instead of `"My Graduation"`.

### 3. Add admin graduation KPI tile on DashboardHome
Create a compact `GraduationKpiTile` component for admins showing "X ready / Y at risk" with a link to the Graduation Tracker. Add it to the admin sections in `DashboardHome.tsx`.

### 4. Add "Below Standard" KPI to Graduation Tracker
Add a 6th KPI tile to the `KpiStrip` in `GraduationTracker.tsx` for `counts.belowStandard`, using `AlertCircle` icon and red styling. Update the grid from `grid-cols-5` to `grid-cols-6` (or `grid-cols-3` on smaller screens).

### 5. Add `level_progress` to default section ordering
Verify and add the `level_progress` key to the default dashboard section order array so the nudge renders without manual configuration.

---

## File Changes

| File | Action |
|------|--------|
| `src/hooks/useTeamLevelProgress.ts` | **Modify** — Assign `below_standard` when `action_type === 'demotion_eligible'` |
| `src/components/dashboard/settings/SidebarPreview.tsx` | **Modify** — Rename label to "My Level Progress" |
| `src/components/dashboard/settings/SidebarLayoutEditor.tsx` | **Modify** — Rename label to "My Level Progress" |
| `src/components/dashboard/GraduationKpiTile.tsx` | **Create** — Admin KPI tile for Command Center |
| `src/pages/dashboard/DashboardHome.tsx` | **Modify** — Add GraduationKpiTile to admin sections, verify `level_progress` in default ordering |
| `src/pages/dashboard/admin/GraduationTracker.tsx` | **Modify** — Add "Below Standard" KPI tile to strip |

**1 new file, 5 modified files, 0 migrations.**

