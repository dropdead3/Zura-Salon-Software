

# Coach Assignment Notification + Coach Performance View

## 1. In-app notification on coach assignment

When a coach is assigned to an organization via `useAssignCoach`, fire an in-app notification to the assigned coach using the existing `createNotification` pattern from `_shared/notify.ts`.

**Approach**: Add an edge function call (or direct insert via service role in the existing `send-coaching-email` function pattern) is overkill here. Simpler: after the successful `insert` in `useAssignCoach`, invoke a lightweight notification insert client-side. However, since `platform_notifications` likely requires a service role or has RLS restrictions, the cleaner path is to add a database trigger on `backroom_coach_assignments` INSERT that creates a `platform_notifications` row for the coach.

**Changes**:
- **Migration**: Create a trigger function `notify_coach_on_assignment()` on `backroom_coach_assignments` INSERT that inserts into `platform_notifications` with type `coach_assigned`, targeting the `coach_user_id`, including the org name in metadata.

## 2. Coach Performance view

Add a "Performance" tab or section to the Coach Dashboard (or a new tab in BackroomAdmin) showing per-coach metrics:

- **Coaching email frequency**: Count of `platform_audit_log` entries where `action = 'coaching_email_sent'`, grouped by the `user_id` (sender) — this is the coach.
- **Org improvement trends**: For each coach's assigned orgs, show the change in avg waste % and reweigh % over the last 30/60/90 days (delta from `staff_backroom_performance` snapshots).

**Changes**:
- **New component**: `src/components/platform/backroom/CoachPerformanceTab.tsx` — table of coaches with columns: Name, Assigned Orgs count, Emails Sent (30d), Avg Waste Δ (trend), Avg Reweigh Δ (trend).
- **New hook**: `src/hooks/platform/useCoachPerformance.ts` — queries `backroom_coach_assignments` joined with `platform_audit_log` counts and `staff_backroom_performance` trend deltas.
- **BackroomAdmin.tsx**: Add a "Coach Performance" tab to the Backroom admin tabs.

## Files

| File | Action |
|------|--------|
| Migration SQL | **New** — trigger `notify_coach_on_assignment` on `backroom_coach_assignments` |
| `src/hooks/platform/useCoachPerformance.ts` | **New** — per-coach metrics (email count, org improvement deltas) |
| `src/components/platform/backroom/CoachPerformanceTab.tsx` | **New** — performance table with sparklines |
| `src/pages/dashboard/platform/BackroomAdmin.tsx` | Add "Coach Performance" tab |

