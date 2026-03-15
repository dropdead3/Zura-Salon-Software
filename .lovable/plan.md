

# Backroom Coach Assignments + Coach Dashboard

## Architecture

A lightweight assignment table links platform users to the organizations they coach. No new role type — coaches are existing platform team members with org-scoped assignments.

```text
platform_roles (identity)        backroom_coach_assignments (scope)
┌─────────────┐                  ┌──────────────────────┐
│ user_id     │──────────────────│ coach_user_id        │
│ role        │                  │ organization_id      │
└─────────────┘                  │ is_primary (bool)    │
                                 │ assigned_at          │
                                 │ assigned_by          │
                                 └──────────────────────┘
```

## Changes

### 1. Database: `backroom_coach_assignments` table

New migration:
- `id`, `coach_user_id` (references auth.users), `organization_id` (references organizations), `is_primary` (boolean, default true), `assigned_at`, `assigned_by`
- Unique constraint on `(coach_user_id, organization_id)`
- RLS: platform users can SELECT; platform_admin/owner can INSERT/UPDATE/DELETE
- Index on `organization_id` and `coach_user_id`

### 2. Admin UI: Coach assignment in Analytics tab

Update `BackroomAnalyticsTab.tsx`:
- Add "Assigned Coach" column to the coaching signals table showing the coach's name (or "Unassigned" badge)
- Add an "Assign" button/dropdown on each org row to pick a platform team member as coach
- Use a small popover with a list of platform team members (from `usePlatformTeam()`)

### 3. Coach Dashboard page

New page: `src/pages/dashboard/platform/CoachDashboard.tsx`
- Fetches `backroom_coach_assignments` for the current user to get their assigned org IDs
- Renders the same KPI cards, coaching signals, and history — but filtered to only their assigned orgs
- Add route in `App.tsx` under `/dashboard/platform/coach`
- Add nav entry in the platform sidebar for users who have coach assignments

### 4. Hook: `useCoachAssignments`

New hook: `src/hooks/platform/useCoachAssignments.ts`
- `useCoachAssignments()` — fetch all assignments (for admin view)
- `useMyCoachAssignments()` — fetch assignments for the current user (for coach dashboard)
- `useAssignCoach()` / `useUnassignCoach()` — mutations

### 5. Platform sidebar update

Update `PlatformSidebar.tsx`:
- Add "My Orgs" or "Coach Dashboard" nav item, visible only when the current user has at least one coach assignment

## Files

| File | Action |
|------|--------|
| Migration SQL | **New** — `backroom_coach_assignments` table + RLS |
| `src/hooks/platform/useCoachAssignments.ts` | **New** — CRUD hooks for assignments |
| `src/pages/dashboard/platform/CoachDashboard.tsx` | **New** — Coach-scoped analytics view |
| `src/components/platform/backroom/BackroomAnalyticsTab.tsx` | Add coach column + assign action |
| `src/components/platform/layout/PlatformSidebar.tsx` | Add coach dashboard nav item |
| `src/App.tsx` | Register `/dashboard/platform/coach` route |

