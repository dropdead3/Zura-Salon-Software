# Role-Aware Command Center — Phased Plan (Revised)

## Decisions locked in

1. **Customization model: role-locked, owner-authored.** Only Account Owners can customize what each role sees. Managers, stylists, front desk, etc. **cannot** personalize their own dashboards — they receive whatever the Owner has configured for their role. This is a meaningful architectural shift: customization moves from per-user to **per-role-per-org**.
2. **Deferred-yesterday lives inside the Tasks card** as a tab ("Today" / "Deferred"), not a top-of-dashboard strip.
3. **Announcement audience: location-scoped denominator, org-wide fallback.** When `location_id` is set, the read-receipt denominator is active employees with access to that location. When `location_id` is null, denominator is all active employees in the org.

## Prompt feedback

Strong, decisive answers — exactly the format that unblocks me. The role-locked customization decision in particular is high-leverage: it converts the dashboard from "personal preference" into a **governance surface** (Owner controls what each role sees), which aligns with the platform doctrine of *structure precedes intelligence*.

**Sharper next time:** When you make a decision that changes the data model (per-user → per-role), call it out explicitly — e.g. "this changes the storage model from per-user to per-role." Saves me a round-trip confirming I read the implication correctly.

**Enhancement suggestion:** Since Owners now author every role's view, add a **"Preview as [role]"** affordance in the customize menu that re-uses the existing `ViewAsContext` infrastructure. Owners need to *see* what Managers see before saving — otherwise the governance feature becomes a guess.

---

## Storage model change (consequence of decision 1)

**Today:** `dashboard_layouts` is keyed by `user_id`. Every user has their own row.

**New model:** layouts are keyed by `(organization_id, role)`. There are at most ~7 rows per org (one per app_role). User-level rows are deprecated.

- New table: `dashboard_role_layouts (id, organization_id, role app_role, layout jsonb, updated_by, updated_at)` with unique constraint on `(organization_id, role)`.
- `useDashboardLayout` resolves layout by: take effective role(s) → pick highest-precedence role with a layout row → return it. No fallback to user-level storage.
- RLS: SELECT for any org member; INSERT/UPDATE/DELETE only for `is_primary_owner = true` (Account Owner). Super admins do NOT get write access — this matches the theme governance pattern.
- Migration: existing `dashboard_layouts` rows are **not** carried over (they're per-user preferences, not org policy). Owners reset from role templates and re-customize. We keep the old table for now; flagged for removal once the new system is live.

---

## Phase 1 — Owner Command Center + governance foundation

### 1.1 Rollup ↔ single-location toggle in "Today at a glance"
- Rewire Quick Stats / Today block to read from the same `locationId` state that drives the analytics filter bar.
- `locationId === ''` → "All Locations" rollup; otherwise per-location numbers + label.
- Closed-day handling (existing) inherits the toggle.

### 1.2 Role-keyed dashboard layouts
- Create `dashboard_role_layouts` table + RLS (Owner-only writes).
- Refactor `useDashboardLayout` to resolve by `(organization_id, effective_role)` instead of `user_id`. Read path unchanged for consumers.
- Refactor `DashboardCustomizeMenu`:
  - Visible only when `is_primary_owner === true`. Hidden entirely for everyone else.
  - Adds a **role selector** at the top: "Editing dashboard for: [Account Owner ▾]" — picks which role's layout the Owner is currently editing.
  - Adds **"Preview as this role"** button that toggles `ViewAsContext` so the Owner sees the live result before saving.
  - "Reset to default" restores the seeded role template for the selected role.
- Seed role templates for: `account_owner`, `admin`, `manager`, `receptionist`, `stylist`, `stylist_assistant`, `booth_renter`. Each gets a sensible default `sectionOrder` + `pinnedCards`.

### 1.3 Tasks card — "Deferred" tab
- Inside `TasksCard.tsx`, add a tab strip: **Today** (current behavior) | **Deferred** (new).
- Deferred query: my tasks where `is_completed = false` AND (`due_date < today` OR `snoozed_until < today` OR (`snoozed_until` IS NULL AND `due_date < today`)).
- Cap at 10 rows, sorted by oldest-deferred first.
- Each row offers: **Do now** (existing detail drilldown), **Reschedule** (date picker, sets `snoozed_until`), **Drop** (mark complete with `notes` appended: "deferred — dropped").
- Tab badge shows count when > 0; tab auto-collapses to zero state at 0.
- Available to **all roles** — every user with tasks sees both tabs.

### 1.4 Announcement read receipts (author view)
- New SQL view `announcement_read_stats`:
  - For each announcement: `read_count`, `audience_count`, `oldest_unread_hours`.
  - Audience computation: if `location_id` IS NOT NULL → active employees with location access (joining whatever location-access primitive `useUserLocationAccess` resolves to on the server, e.g. `employee_locations` or equivalent). If `location_id` IS NULL → active employees in the org.
- On `/dashboard/admin/announcements`, add a "Read by N of M" column. Click row → drawer:
  - Top: read rate, oldest-unread duration.
  - Two lists: **Read** (name + read_at) and **Unread** (highlight stale > 24h on Urgent priority).
- Mark-as-read flow (already wired in `AnnouncementsDrawer`) is unchanged.

### 1.5 Mark-as-read coverage check
Audit that every announcement render path (sidebar widget, bento, drawer) writes to `announcement_reads` on view. Without this, read receipts are misleading. Currently only the drawer marks read — extend to all surfaces or document the intentional gap.

---

## Phase 2 — Manager variant

1. **Role gate**: Managers see whatever layout the Owner authored for `manager` role. Aggregate toggle hidden if they manage exactly one location.
2. **Announcement authoring**: extend RLS INSERT policy on `announcements` from `is_coach_or_admin(auth.uid())` to also include `manager` role.
3. **No customize menu**: Managers do not see `DashboardCustomizeMenu`. If they want changes, they request from the Owner.
4. **Compliance-critical hidden surfaces**: Owner's `manager` role template excludes commission summary, true profit, capital engine, billing — but Owner *can* re-add them if they choose. Defaults are conservative; explicit choice reigns.

## Phase 3 — Stylist variant

1. The `stylist` role template is a curated, narrow layout: `daily_briefing`, `todays_prep`, `level_progress`, `graduation_kpi`, `schedule_tasks` (with Deferred tab), `announcements`, `widgets`. `pinnedCards: []`.
2. Personal-only data: `locationId` forced to stylist's primary location; aggregate toggle hidden.
3. Announcements are read-only; mark-as-read tracking active.
4. No customize menu.

## Phase 4 — Polish & accountability loop

1. **Read-receipt floor**: Urgent + >24h + read rate <80% → banner on author's home with one-tap nudge action (writes notification, not re-send).
2. **Time-aware default view**: pre-open hours show Daily Briefing + Tasks (Deferred tab) + Today's Queue only; full grid expands at first appointment. Decide later.
3. **Layout audit log**: every Owner edit to a role layout writes to a layout audit table — accountability for "who hid the commission card from managers."

---

## Technical notes (non-user-facing)

- New table: `dashboard_role_layouts (id, organization_id, role app_role, layout jsonb, updated_by uuid, updated_at timestamptz)`, unique on `(organization_id, role)`.
- New SQL view: `announcement_read_stats` (location-scoped denominator with org-wide fallback).
- RLS: `dashboard_role_layouts` — SELECT for org members; write for `is_primary_owner` only. Mirror the pattern from `site_settings` org-theme keys.
- RLS update: `announcements` INSERT to include `manager` (Phase 2).
- `useDashboardLayout` rewrite: resolve by `(orgId, effectiveRole)`; precedence order if user has multiple roles: `account_owner` > `admin` > `manager` > `receptionist` > `stylist` > `stylist_assistant` > `booth_renter`.
- `DashboardCustomizeMenu`: gated on `useIsPrimaryOwner()`, adds role selector + "Preview as" button.
- `TasksCard`: add tab strip; new query for deferred.
- All currency continues to route through `BlurredAmount` per session-only privacy contract.
- Old `dashboard_layouts` (per-user) table: keep for one release, flag for removal in a follow-up migration.

## What I'm explicitly NOT doing

- Per-user customization for non-Owners (decision locked).
- Top-of-dashboard "Deferred Yesterday" strip (decision locked — it's a tab in Tasks).
- Org-wide audience denominator when `location_id` is set (decision locked — location-scoped).
- Migrating existing per-user dashboard_layouts rows into the new role table (Owner re-authors from defaults — cleaner than guessing intent).
