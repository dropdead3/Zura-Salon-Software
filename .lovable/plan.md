# Onboarding Completeness — Sequenced Rollout

Per doctrine ("P0s ship in separate waves, never bundled"), I'm splitting your four suggestions into two waves. Wave 1 ships the visibility + workflow improvements that are unambiguous and zero-risk. Wave 2 (enforcement + audit log) needs your input first because it touches data-layer guarantees and net-new infrastructure.

## Wave 1 — Ship Now (Visibility + Workflow)

### 1. Onboarding completeness counter in page header

Add a compact counter next to the Team Members page title, materiality-gated:

- **When all members onboarded:** render nothing (silence-when-clean per visibility contract doctrine).
- **When ≥1 member has zero roles:** render `28 of 30 onboarded · 2 missing roles` as a subtitle/badge in `DashboardPageHeader`.
- Click target: scrolls to the "No Roles Assigned" section (anchor link), so the header signal is operationally connected to the resolution surface.
- Token compliance: `font-display` for the count, amber `text-amber-600` for the missing-roles fragment, no `font-bold`.

### 2. Quick-assign role chip inline in No-Roles `MemberRow`

Inside the `noRoles.map(...)` render block (line 519 of `TeamMembers.tsx`), add an `Assign role →` button on the right side of each row:

- Opens a lightweight `Popover` with a role picker (reuses the same role list from `UserRolesTab`).
- Single click → role assignment via existing `user_roles` insert path → optimistic UI update → toast confirmation.
- `e.stopPropagation()` so clicking the chip doesn't navigate into `TeamMemberDetail`.
- Compresses 3 clicks (row → detail → roles tab → assign) down to 1.

### Wave 1 Files
- `src/pages/dashboard/admin/TeamMembers.tsx` — counter in header `actions`/subtitle slot, chip in `noRoles` render block.
- `src/components/dashboard/team-members/QuickAssignRoleChip.tsx` (new) — popover + role picker + mutation.

---

## Wave 2 — Needs Your Input (Enforcement + Governance)

### 3. Block scheduling for unassigned users

This is **operational enforcement** and per doctrine should land at the data layer, not as a UI toast alone. Three open decisions:

- **Behavior:** soft warn (toast, allow proceed) or hard block (disable selection)? Soft warn is reversible and operator-respectful; hard block is structurally cleaner.
- **Surface coverage:** there are ~15 appointment creation entry points (calendar drag, agenda quick-add, booking pipeline, Phorest sync, public booking, etc.). Should this gate apply universally, or only operator-initiated flows (excluding sync/public)?
- **Anchor:** ideally a shared `useStaffSchedulability(userId)` hook returning `{ schedulable, reason }`, consumed by every entry point. This is a 2-3 day effort across surfaces.

I recommend: **soft warn on operator-initiated flows only**, via the shared hook. Public booking and Phorest sync should continue working (they're upstream of role assignment in real onboarding sequences).

### 4. Audit log for `role_initial_assignment`

There is **no existing `team_member_audit_log` table** in the codebase (verified — zero references in migrations or src). Building this means net-new infrastructure:

- New table `team_member_audit_log` with columns: `id`, `organization_id`, `target_user_id`, `actor_user_id`, `event` (enum/text), `payload` (jsonb), `created_at`.
- RLS: `is_org_member` for read, `is_org_admin` for insert (per tenant isolation doctrine).
- Trigger or app-layer write on the first role insert (trigger is cleaner — survives all entry points including future bulk imports).
- Initial event taxonomy: `role_initial_assignment`, plus reserve slots for `role_added`, `role_removed`, `archived`, `restored` so the offboarding wizard can reuse it.

This is a foundational audit surface — worth doing right. Recommend pairing with a future `TeamMemberAuditTrailTab` so the data is actually visible somewhere.

---

## Recommended Sequencing

1. **Today:** Approve Wave 1 — ship counter + quick-assign chip.
2. **Next:** Confirm Wave 2 design decisions above (soft vs. hard, surface coverage), then I'll plan + ship the schedulability hook.
3. **After:** Ship the audit log table + trigger + first event, with the offboarding wizard's existing flow as the second consumer.

Approving this plan ships **Wave 1 only**. Wave 2 items become separate planned work once you answer the decisions above.
