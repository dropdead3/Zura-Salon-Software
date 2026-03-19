

# Inventory Audit Reminder & Compliance Tracker

## What We're Building

Two connected features: (1) configurable audit schedule with automated reminders for backroom managers/inventory managers, and (2) an audit compliance tracker that shows whether audits are being completed on time.

---

## Part 1: Database — New Table + Settings Columns

**Migration:**

1. Add columns to `inventory_alert_settings`:
   - `audit_frequency` (text, default `'monthly'`) — options: `weekly`, `biweekly`, `monthly`, `quarterly`
   - `audit_reminder_enabled` (boolean, default `true`)
   - `audit_reminder_days_before` (integer, default `3`) — how many days before due date to send reminder
   - `audit_notify_roles` (text[], default `'{inventory_manager,manager}'`)

2. Create `inventory_audit_schedule` table:
   - `id` (uuid PK)
   - `organization_id` (FK → organizations)
   - `location_id` (text, nullable)
   - `due_date` (date, not null)
   - `status` (text, default `'pending'`) — `pending`, `completed`, `overdue`, `skipped`
   - `completed_by` (uuid, nullable, FK → auth.users)
   - `completed_at` (timestamptz, nullable)
   - `count_session_id` (uuid, nullable, FK → count_sessions) — links to the actual count session
   - `reminder_sent_at` (timestamptz, nullable)
   - `notes` (text, nullable)
   - `created_at` / `updated_at`
   - RLS: org members can read, admins/managers/inventory_managers can write

---

## Part 2: Audit Schedule Settings UI

**Edit `AlertSettingsCard.tsx`** — add a new "Audit Schedule" section below dead stock:
- Toggle: "Enable scheduled audit reminders"
- Frequency selector: Weekly / Biweekly / Monthly / Quarterly
- "Remind X days before due date" slider (1–7)
- Notify roles checkboxes (inventory_manager, manager, admin)

**Update `useInventoryAlertSettings.ts`** — add the 4 new fields to the interface and sync logic.

---

## Part 3: Audit Compliance Tracker Component

**New file: `src/components/dashboard/backroom-settings/inventory/AuditComplianceTracker.tsx`**

A card/table view showing:
- Upcoming & past audit dates with status badges (Pending, Completed, Overdue, Skipped)
- Who completed it (linked to `completed_by` profile)
- Completion date vs due date (on-time / late indicator)
- Compliance rate KPI strip: % on-time last 6 months, streak count, average days late
- "Mark Complete" action button that links to an existing count session or prompts starting one
- "Skip" with mandatory reason

**New hook: `src/hooks/inventory/useAuditSchedule.ts`**
- `useAuditSchedule(filters)` — fetches schedule entries
- `useMarkAuditComplete()` — marks an audit done, links count_session_id
- `useSkipAudit()` — marks as skipped with notes
- `useGenerateNextAudit()` — creates the next due date based on frequency

---

## Part 4: Surface in Backroom Inventory

**Edit `CountsTab.tsx`** — add an "Audit Schedule" sub-tab alongside Sessions and Shrinkage, rendering `AuditComplianceTracker`.

---

## Part 5: Dashboard & Notification Integration

**Edit `InventoryManagerDashboardCard.tsx`** — add a "Next Audit Due" indicator showing the next pending audit date with overdue highlighting.

**Edit `control-tower-engine.ts`** — add an `audit_overdue` alert type that surfaces when an audit passes its due date without completion.

---

## Summary

| Change | Type |
|--------|------|
| Add 4 columns to `inventory_alert_settings` | Migration |
| Create `inventory_audit_schedule` table + RLS | Migration |
| `useAuditSchedule.ts` hook | New file |
| `AuditComplianceTracker.tsx` component | New file |
| `AlertSettingsCard.tsx` — audit schedule section | Edit |
| `useInventoryAlertSettings.ts` — new fields | Edit |
| `CountsTab.tsx` — new sub-tab | Edit |
| `InventoryManagerDashboardCard.tsx` — next audit due | Edit |
| `control-tower-engine.ts` — audit_overdue alert | Edit |

1 migration, 2 new files, 5 edits.

