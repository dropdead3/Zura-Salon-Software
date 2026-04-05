

# Graduation System — Full UX/UI Audit and Enhancement Plan

## System Inventory

The graduation system currently spans these surfaces:
- **Admin: Graduation Tracker** (`GraduationTracker.tsx`) — KPI strip, All Stylists / Ready / Assistants / Requirements tabs
- **Admin: Stylist Levels** (`StylistLevels.tsx`) — Level configurator with GraduationWizard for criteria per level
- **Admin: Level Requirements PDF** — exportable document of all level criteria
- **Stylist-Facing: My Graduation** (`MyGraduation.tsx`) — assistant checklist submission page
- **Coaching: LevelProgressCard** — embedded in MeetingDetails and IndividualStaffReport
- **Hooks: useLevelProgress** (single user) / **useTeamLevelProgress** (bulk team)
- **Payroll: usePayrollForecasting** — tierProgress wired from level_promotion_criteria

---

## Bugs Found

### 1. No "Approve Promotion" action exists
The plan called for an "Approve Promotion" button on the Ready to Graduate tab when `requires_manual_approval` is true. It was never built. The `StylistProgressRow` shows the badge and expand data but has no actionable CTA. There is no mutation to update `employee_profiles.stylist_level` from this page.

### 2. "My Graduation" page has no level progress
The stylist-facing `MyGraduation.tsx` only shows the legacy checklist system (submit proof, get coach feedback). It does not show the `LevelProgressCard` or any KPI-based graduation progress. A stylist at level 3 approaching level 4 sees nothing about their revenue/rebooking progress.

### 3. KPI strip shows when data is loaded but no criteria configured
When an org has levels but hasn't configured any graduation criteria yet, the KPI strip shows all zeros with no guidance. Should show a setup prompt linking to Settings > Stylist Levels.

### 4. `no_criteria` stylists shown mixed in with tracked stylists
Stylists whose next level has no criteria configured appear in "All Stylists" with a bland "No Criteria" badge. This pollutes the actionable view. They should either be filterable or grouped separately.

### 5. ManagementHub stat query is wrong
`ManagementHub.tsx` queries `stylist_program_enrollment` for `inProgressGraduations` count — this is the client engine program, not graduation. The stat label says "in progress" but doesn't reflect actual graduation readiness counts.

### 6. `useTeamLevelProgress` may hit 1000-row limit
The batch queries to `phorest_daily_sales_summary` and `appointments` use `.in('user_id', userIds)` without pagination. For orgs with 50+ stylists and 90-day windows, this can silently truncate data.

---

## Enhancements

### 7. Add "Approve Promotion" action to Ready tab
- Add a mutation to update `employee_profiles.stylist_level` to the next level's slug
- Show "Approve Promotion" button on each qualified row when `requiresApproval` is true
- On approval: update the level, invalidate queries, show success toast
- Add confirmation dialog ("Promote {name} from {current} to {next}?")

### 8. Add LevelProgressCard to MyGraduation
- Surface the level-based progress card at the top of the stylist's My Graduation page
- Shows them their real-time progress toward their next level alongside the legacy checklist
- Uses existing `useLevelProgress(effectiveUserId)` hook

### 9. Empty state with setup CTA on Graduation Tracker
- When `counts.total === 0` or all are `no_criteria`, show a structured empty state
- "No graduation criteria configured yet" with a button linking to Settings > Stylist Levels
- Follows `tokens.empty` pattern

### 10. Wire ManagementHub graduation stat correctly
- Replace the `stylist_program_enrollment` query with actual `useTeamLevelProgress` counts
- Show `counts.ready` as the stat ("ready to graduate") instead of unrelated program enrollments

### 11. Add status filter to All Stylists tab
- Add a status filter dropdown (All / Ready / In Progress / Needs Attention / No Criteria / Top Level)
- Works alongside existing level filter and search
- Lets admins quickly isolate actionable groups

### 12. Promotion history tracking
- When a promotion is approved, record it in a new `level_promotions` table (user_id, from_level, to_level, promoted_by, promoted_at)
- Show promotion history in the expanded row and on the individual staff report
- This creates an audit trail per the governance doctrine

---

## File Changes

| File | Action |
|------|--------|
| Migration SQL | **Create** — `level_promotions` table for audit trail |
| `src/hooks/useTeamLevelProgress.ts` | **Modify** — Add pagination guard for large datasets |
| `src/hooks/usePromoteLevel.ts` | **Create** — Mutation to promote stylist + record in audit table |
| `src/pages/dashboard/admin/GraduationTracker.tsx` | **Modify** — Add Approve Promotion CTA, status filter, empty state with setup CTA |
| `src/pages/dashboard/MyGraduation.tsx` | **Modify** — Add LevelProgressCard at top of page |
| `src/pages/dashboard/admin/ManagementHub.tsx` | **Modify** — Fix graduation stat to use real counts |

**1 migration, 1 new file, 4 modified files.**

