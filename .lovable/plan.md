## Wave 1.5 — Quick-Assign Polish

### A. Default-select most common role
In `QuickAssignRoleChip`, pre-focus the most-assigned non-admin role across the org so a single Enter assigns it.

- Derive `defaultRoleSuggestion` from existing `useOrganizationUsers` data (count role frequency across active members, exclude `admin` / `super_admin`, fallback to `staff` or first available).
- Show the suggested role as the first item with a subtle "Suggested" label; auto-focus it on popover open via `autoFocus` on its button.
- No new query — reuse the data already loaded by `TeamMembers.tsx` and pass `suggestedRole` as a prop to the chip.

### B. AccessHub badge for missing roles
The "Team Members" surface is reached from `AccessHub.tsx`, not a global sidebar. Add a small amber dot + count badge to the Team Members tile when `missingRolesCount > 0`.

- Reuse `useOrganizationUsers` (already cached by TanStack Query — no extra request).
- Materiality-gated: render nothing when count is 0 (silence-when-clean).
- Count is also exposed via the existing header counter on the destination page, so the two surfaces stay in sync.

Multi-select bulk assignment is **deferred** — single-click default-selection already collapses the common case to one keystroke; bulk UI adds drawer + confirm dialog complexity that isn't justified until we see >5 unassigned members regularly.

---

## Wave 2 — Schedulability Gate (Soft Warn, Operator Flows Only)

Per your earlier confirmation: **soft warn**, **operator-initiated only**, public booking + Phorest sync bypass.

### Shared hook
Create `src/hooks/useStaffSchedulability.ts`:

```ts
function useStaffSchedulability(userId: string | null | undefined): {
  schedulable: boolean;
  reason: 'no_roles' | 'archived' | 'inactive' | null;
  warning: string | null;
}
```

- Reads from the already-cached `organization-users` query (no new round-trip).
- A user is **not schedulable** when: `roles.length === 0`, `archived_at !== null`, or `is_active === false`.
- Returns a copy-governed message: *"This member has no role assigned yet. Schedule anyway?"* — calm, advisory tone per copy doctrine.

### Surface integration (operator-initiated only)
Wire the warning into the operator-side staff-picker entry points. We do **not** touch:
- Public booking surfaces (`src/pages/BookingSurface.tsx`, embed)
- Phorest sync edge functions
- Auto-replenishment / system-generated holds

Operator surfaces to gate (toast on submit, no hard block):
- `AddTimeBlockForm`
- `MeetingSchedulerWizard`
- `DockNewBookingSheet`
- Calendar quick-add staff picker

Pattern: on submit, if `!schedulable && reason === 'no_roles'`, show a `sonner` toast with a "Continue anyway" action that re-submits, OR an "Assign role" action that deep-links to `admin/team-members?missing-roles=1#user-{id}`. Default behavior on dismiss is to allow the operation (soft warn).

### Telemetry hook (lightweight)
Log dismissals to console in dev only (kebab-case taxonomy: `staff-schedulability.no-role-warned`) so we can later promote to a real event if the pattern persists. No new table.

---

## Wave 3 — Audit Surface (Reuse `account_approval_logs`)

Verified: `useUserRoles.ts` already writes `role_added:<role>` and `role_removed:<role>` to `account_approval_logs` on every role mutation. **No new table needed.**

### Schema gap
`account_approval_logs` currently has `(id, user_id, action, performed_by, created_at)` — no `organization_id`. This is acceptable because:
- The `user_id` resolves to a single org via `employee_profiles`.
- RLS already restricts reads to admins via `is_coach_or_admin`.
- Adding `organization_id` would be a nice-to-have but isn't required for the audit tab to work.

We will **not** alter the table in this wave to keep blast radius small.

### New hook
`src/hooks/useTeamMemberAuditTrail.ts`:
- Fetches from `account_approval_logs` filtered by `user_id` (per-member view) or by `user_id IN (org members)` (org-wide view).
- Joins `performed_by` against `employee_profiles` to render actor name + photo.
- Parses `action` strings (`role_added:stylist`, `role_removed:admin`, `approved`, `super_admin_granted`, etc.) into a typed `AuditEvent` discriminated union with a human-readable label.
- Derives `role_initial_assignment` events at read-time: for each `user_id`, the **first** `role_added:*` row chronologically is flagged `isInitialAssignment: true`. No SQL view required — done in the hook.

### New tab on TeamMemberDetail
Add an `Audit` tab to `src/pages/dashboard/admin/TeamMemberDetail.tsx`:
- Timeline view, newest first.
- Each entry: actor avatar + name, action label ("Assigned Stylist role", "Removed Admin role", "Account approved"), relative timestamp, and a "First role assignment" pill on the initial event.
- Empty state when no events: "No role or access changes recorded yet."
- Token compliance: `font-display` for the section header, `font-sans` for body, `tokens.empty.*` for empty state.

### Future-proofing notes (not built now)
- When the offboarding wizard ships, it should write `archived:<reason>` and `restored` actions to the same table — taxonomy slot reserved.
- Adding `organization_id` + `metadata jsonb` to `account_approval_logs` is a P2 schema enhancement; not needed for this wave but documented for the future.

---

## Sequencing & Files

**Wave 1.5** (UI-only, ship first):
- `src/components/dashboard/team-members/QuickAssignRoleChip.tsx` (modify — add suggestion logic + autoFocus)
- `src/pages/dashboard/admin/TeamMembers.tsx` (modify — compute + pass `suggestedRole`)
- `src/pages/dashboard/admin/AccessHub.tsx` (modify — render amber dot on Team Members tile)

**Wave 2** (hook + 4 surface integrations):
- `src/hooks/useStaffSchedulability.ts` (new)
- 4 operator surfaces listed above (modify — add toast warning on submit)

**Wave 3** (read-only audit surface):
- `src/hooks/useTeamMemberAuditTrail.ts` (new)
- `src/components/dashboard/team-members/tabs/AuditTrailTab.tsx` (new)
- `src/pages/dashboard/admin/TeamMemberDetail.tsx` (modify — register new tab)

**No database migrations.** All three waves are additive on top of existing schema and the existing `account_approval_logs` writers.

### Open question before I implement
The schedulability soft-warn pattern uses a `sonner` toast with action buttons. Confirm you want **toast-with-action** (non-blocking, operator can ignore) versus a small **inline confirm dialog** (one-extra-click but more deliberate). Toast is closer to the "soft warn" you asked for; dialog is closer to a structural gate. I'll default to toast-with-action unless you say otherwise.