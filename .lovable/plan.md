# Onboarding Completeness — Waves 1.5 / 2 / 3 Shipped

## Wave 1.5 — Quick-Assign Polish ✅
- `QuickAssignRoleChip` now accepts `suggestedRole` and surfaces it at the top of the list with a Sparkles icon, "Suggested" label, and `autoFocus` so a single Enter assigns it.
- `TeamMembers.tsx` derives `suggestedRole` from the most-frequently-assigned non-elevated role across active members (excludes `admin`/`super_admin`), falls back to `stylist`.

**Deferred (with rationale):**
- AccessHub / Settings-card badge — Settings.tsx renders cards from a generic `categoriesMap` registry without per-card badge support. Plumbing badge state through that registry just for this one signal is overkill; the existing TeamMembers header counter already surfaces this gap on the destination page. Revisit if a second badge consumer (notifications, sidebar, command palette) emerges.
- Multi-select bulk assignment — single-click default-selection collapses the common case to one keystroke. Revisit when >5 unassigned members regularly.

## Wave 2 — Schedulability Soft Warn ✅
- New `useStaffSchedulability(userId)` hook returns `{ schedulable, reason, warning }` over the already-cached `organization-users` query. Reasons: `no_roles`, `archived`, `inactive`, `unknown`.
- Wired into `NewBookingSheet.tsx` (the main operator appointment-create flow) at the datetime→confirm transition: shows a `sonner` toast with "Continue anyway" action, tracks `schedulabilityAcknowledged` so a second click proceeds. Acknowledgement resets when the stylist selection changes.
- Dev-only suppression log via kebab-case taxonomy: `staff-schedulability.warned`.

**Surfaces NOT wired (with rationale):**
- `AddTimeBlockForm` — schedules breaks/blocks for the user themselves, not stylist-for-service. Schedulability semantics don't apply.
- `MeetingSchedulerWizard` — meetings don't require service-eligibility roles. Attending a meeting ≠ being booked for a service.
- `DockNewBookingSheet` — already filters team list to stylist/assistant roles only at line 220, so unassigned users don't surface.
- Public booking + Phorest sync — explicitly out of scope per upstream-of-onboarding doctrine.

## Wave 3 — Audit Trail Tab ✅
- New `useTeamMemberAuditTrail(userId)` hook reads `account_approval_logs` (the existing table that `useUserRoles.ts` already writes `role_added:<role>` / `role_removed:<role>` to). Joins `performed_by` against `employee_profiles` for actor display.
- Parses `action` strings into a typed `AuditEvent` discriminated union with human-readable labels.
- Derives `isInitialAssignment: true` at read-time on the chronologically-first `role_added:*` row per user — no SQL view, no schema changes.
- New `AuditTrailTab.tsx` renders a newest-first timeline with actor avatar/name, action label, relative timestamp, color-toned by event kind (emerald for grants, amber for revokes), and a "First role" Sparkles pill on the initial assignment.
- Registered as a new `Audit` tab on `TeamMemberDetail.tsx`.

**No database migrations.** All three waves are additive on top of existing schema.

## Future-Proofing (Not Built)
- When the offboarding wizard ships, write `archived:<reason>` and `restored` actions to the same `account_approval_logs` table — the audit hook's `parseAction` will need two new branches but the rendering layer is already generic.
- Adding `organization_id` + `metadata jsonb` to `account_approval_logs` is a P2 schema enhancement — not needed for the current audit tab to work.
