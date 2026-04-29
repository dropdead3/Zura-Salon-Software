## Goal

Replace the today's instant `is_active` toggle and "Remove" button with a guided, audit-safe **Deactivate → Reassign → Archive** flow on the Team Member detail page. Archiving must never orphan upcoming work (appointments, assistant assignments, tasks, swaps, schedules), and reassignment must respect role compatibility (stylist assistant work can only move to another stylist assistant, etc.).

## Doctrine alignment

- Semi-autonomous: **Recommend → Simulate (impact preview) → Approve → Execute**. No silent destructive moves.
- Structural gate: an archive cannot complete while a "blocking dependency" exists unless the user explicitly chooses to release/cancel it.
- Audit logged. Historical data (sales, payroll, completed appointments) is preserved untouched.
- Tenant-scoped, RLS-safe; only `super_admin` / `admin` can archive.

---

## Lifecycle states (new contract)

```text
active  ──► deactivated  ──► archived
                ▲   │              │
                └───┴── reactivate ┘
```

- **active** — `is_active = true`, can log in, gets new work.
- **deactivated** — `is_active = false`, can no longer log in, **cannot be assigned new work**, but still owns existing assignments. Reversible in 1 click. (This is what the toggle gives today, but with proper guardrails added.)
- **archived** — `archived_at` set, removed from rosters/pickers/auto-assign, all *future* assignments must already be reassigned or cancelled. Reversible by an admin (un-archive restores to deactivated).

We add columns to `employee_profiles`:
- `archived_at timestamptz`
- `archived_by uuid`
- `archive_reason text` (enum-ish: `terminated`, `resigned`, `seasonal`, `transferred`, `other`)
- `deactivated_at timestamptz`, `deactivated_by uuid`

---

## The Archive Wizard (new UI)

Triggered from `SecurityTab` → Account Status, replacing the current "Remove" button with **"Archive team member…"**. Opens a `PremiumFloatingPanel` drawer with 4 steps:

**Step 1 — Reason & effective date**
- Reason (required), effective date (default: today), final-day note for payroll.
- Auto-deactivates immediately on confirm of the wizard's final step.

**Step 2 — Dependency scan (the impact preview)**
We run a single edge function `scan-team-member-dependencies` that returns counts + samples for, scoped to this user and the org:

| Bucket | Source | Action options |
|---|---|---|
| Upcoming appointments (as stylist) | `appointments` where `staff_user_id = user AND start_time >= now() AND status NOT IN ('completed','cancelled','no_show')` | Reassign to another stylist · Cancel & notify clients · Leave on books (block archive) |
| Upcoming service-line assignments | `appointment_service_assignments.assigned_user_id` for future appts | Reassign · Drop line |
| Upcoming assistant pairings | `appointment_assistants.assistant_user_id` future | Reassign to another **stylist assistant** · Drop |
| Pending assistant requests | `assistant_requests` where stylist_id or assistant_id = user AND status = pending/accepted AND request_date >= today | Reassign · Cancel |
| Open operational tasks | `operational_tasks.assigned_to` AND status open | Reassign to user/role · Reassign to manager · Mark cancelled |
| Open SEO tasks | `seo_tasks.assigned_to` AND status open | Same |
| Open shift swaps | `shift_swaps` where requester or claimer or manager = user, status open | Cancel/reassign manager |
| Pending meeting requests | `meeting_requests` where manager or team_member = user, status open | Cancel/reassign |
| Recurring schedule | `employee_location_schedules` future | End-date the schedule |
| Active commission/comp plan | `compensation_plans` linkage via `employee_payroll_settings` | Show — payroll will mark final-period only, no auto-delete |
| Walk-in / waitlist preferences | `walk_in_queue.assigned_stylist_id`, `clients.preferred_stylist_id`, `waitlist_entries.preferred_stylist_id` | Bulk-clear or reassign |

**Step 3 — Reassignment picker (per bucket)**
- Group items by bucket; each row shows date/title/client and a destination dropdown.
- **Role-compatible filter is mandatory:** assistant work → assistant pickers only; stylist work → stylist pickers only; manager-owned items → manager-eligible roles.
- Bulk action per bucket: "Reassign all to ___".
- Soft conflict check: if the destination stylist isn't scheduled at the same location/time, show an amber warning ("Outside their schedule — confirm before continuing").
- Stylist assistant special rule: if the archived user is the *only* assistant configured for the location and there are upcoming assistant pairings, surface a structural warning ("No remaining assistant at this location — consider hiring before archiving").

**Step 4 — Review & confirm**
- Plain-English summary: "12 appointments → Hayleigh · 4 tasks → Manager (Kristi) · 1 schedule ended 5/2 · 23 historical records preserved."
- Confirm copy: "Archive Eric Day. He'll be removed from rosters and pickers. Historical data stays intact. You can un-archive within 90 days."
- Big confirm button. Destructive only after explicit checkbox: "I've reviewed the reassignments above."

---

## Server side

New edge function: `archive-team-member`
- Auth: requires `is_org_admin`.
- Accepts `{ userId, reason, effectiveDate, reassignments: [{bucket, itemId, destinationUserId|null, action}] }`.
- Transaction:
  1. Apply each reassignment (UPDATE the right table/column).
  2. End-date `employee_location_schedules` future rows.
  3. Set `is_active=false`, `deactivated_at`, `archived_at`, `archived_by`, `archive_reason`.
  4. Revoke session: call existing PIN/session invalidation path; set `employee_pins.login_pin = NULL`.
  5. Strip `user_roles` rows for this org? **No** — keep them for audit; gate visibility via `archived_at IS NULL` in roster query instead. (Roles re-apply on un-archive without rebuild.)
  6. Insert one row into a new `team_member_archive_log` table capturing the reassignment ledger (JSONB) + reason + actor.
  7. Insert one `operational_tasks` notification to the archiver: "Archive complete — review summary."
- Idempotent via `idempotency_key` on the request.

New edge function: `scan-team-member-dependencies`
- Read-only; returns counts + first-N samples per bucket for the wizard.

New edge function: `unarchive-team-member`
- Reverses status flags only (no auto-restore of cancelled work). Within 90 days.

---

## Roster & picker side-effects (must-do)

To keep the absence-signal contract clean, we filter archived users out of:
- `useOrganizationUsers` default (add `includeArchived?: boolean`).
- All staff pickers: appointment booking, task assignment, swap claim, assistant request, meeting request, walk-in assignment, kiosk self-booking, public booking (`booking/branded-surfaces`), payroll add-employee.
- Leaderboards and stylist-level grouping.
- Login: existing auth gate already blocks `is_active=false`; archived implies inactive.

**Surface for archived members:** Team Members page gets a new view `?view=archived` (alongside Roster / Invitations) showing archived members with un-archive CTA, archived date, reason, and the saved reassignment ledger.

---

## UX details

- The Account Status card on the detail page is rewritten:
  - **Active** toggle stays for the soft case (e.g., "on leave for two weeks") but adds a confirmation dialog when flipping off, listing future assignments and offering to open the Archive wizard.
  - "Remove" button → renamed **"Archive team member…"**, opens the wizard.
  - When already archived: card shows status, reason, archived-by, and **"Un-archive"** button.
- Empty/zero-dependency archive: wizard skips Step 3 and goes straight to Review.
- Stylist privacy: stylist self-view never sees this card (already true).

---

## Database migration (one)

```sql
ALTER TABLE employee_profiles
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archived_by uuid,
  ADD COLUMN archive_reason text,
  ADD COLUMN deactivated_at timestamptz,
  ADD COLUMN deactivated_by uuid;

CREATE TABLE team_member_archive_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  archived_by uuid NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  reassignment_ledger jsonb NOT NULL DEFAULT '[]',
  unarchived_at timestamptz,
  unarchived_by uuid
);
ALTER TABLE team_member_archive_log ENABLE ROW LEVEL SECURITY;
-- Tenant-scoped policies via is_org_member / is_org_admin.

CREATE INDEX idx_employee_profiles_archived ON employee_profiles(organization_id, archived_at);
```

---

## Files to add / change

**New**
- `supabase/migrations/<ts>_team_member_archive.sql`
- `supabase/functions/scan-team-member-dependencies/index.ts`
- `supabase/functions/archive-team-member/index.ts`
- `supabase/functions/unarchive-team-member/index.ts`
- `src/components/dashboard/team-members/archive/ArchiveWizard.tsx` (drawer)
- `src/components/dashboard/team-members/archive/DependencyBucket.tsx`
- `src/components/dashboard/team-members/archive/ReassignRow.tsx`
- `src/hooks/useArchiveTeamMember.ts` (scan / archive / unarchive)
- `src/pages/dashboard/admin/TeamMembersArchived.tsx` view (or inline `?view=archived` in `TeamMembers.tsx`)

**Edited**
- `src/components/dashboard/team-members/tabs/SecurityTab.tsx` — replace Remove with Archive wizard launcher; add archived-state card.
- `src/hooks/useOrganizationUsers.ts` — exclude archived by default; add `includeArchived` opt-in; `useToggleUserActive` adds a soft confirm via consumer (the consumer handles the dialog).
- `src/pages/dashboard/admin/TeamMembers.tsx` — add Archived sub-view; filter archived from roster.
- All staff pickers identified above — switch to filtered roster (most already use `useOrganizationUsers`, so this is mostly free; the public/kiosk booking ones need explicit verification).

---

## Out of scope (call out, don't build now)

- Auto-rebooking client-preferred stylists (covered by `clients.preferred_stylist_id` clear; smart re-pairing is a Marketing OS / Phase 2 problem).
- Payroll final-paycheck automation (left to existing payroll flow; we just freeze new accruals).
- Document/handbook re-acknowledgment cleanup.
- Hard delete (GDPR right-to-erasure) — separate, heavier flow, not requested here.

---

## Prompt-craft feedback (per project doctrine)

**What worked well in your prompt:** you framed the *behavior* (deactivate → archive → reassign), called out the role-compatibility nuance (assistant → assistant), and explicitly invited me to expand the analysis. That's high-signal scoping.

**Even sharper next time:**
1. State the **lifecycle** you want (does deactivated == archived, or are they two states?). I assumed two — confirm.
2. Name the **actor** (who can archive — admins only? GMs?).
3. Name the **reversibility window** (un-archive forever, 90 days, never?).
4. Call out **edge cases up front** (last-remaining-assistant, sole owner, currently-clocked-in).

A tighter version: *"Add a two-state lifecycle (deactivated = soft, archived = hard) on Team Members, gated to super_admin/admin. Archiving must run a dependency scan across upcoming appointments, assistant pairings, tasks, swaps, schedules, and force role-compatible reassignment before completing. Un-archive available 90 days. Preserve all historical data."*

## Enhancement suggestions

- Add a **"Last day worked"** field that drives the cutoff for payroll, schedule end-dating, and commission accrual freeze.
- Surface an **archived-employee analytics tile** on the Operations Hub: count, reason mix, avg tenure at archive, reassignment lead time.
- Wire a **Zura advisory** that flags when an active employee has zero upcoming assignments for >30 days — silent prompt to consider archiving.
- For Phase 2: **batch archive** (seasonal closures), and an **AI lever** ("Archiving Eric leaves no assistant at Val Vista Lakes — propose hiring or reassigning Mallori as assistant cover").