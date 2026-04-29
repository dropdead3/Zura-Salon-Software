# Archive UX Refinements — Wave 4

Four small, additive changes that tighten the archive flow without changing the underlying wizard or mutations. All four reuse existing infrastructure (`ArchiveWizard`, `useUnarchiveTeamMember`, `useAuth`, `selectedUsers` set in `UserRolesTab`).

---

## 1. Hover-reveal the archive chip (Card mode)

**File:** `src/components/dashboard/team-members/ArchiveMemberChip.tsx`

Add `opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity` to the button. Keyboard focus must still reveal it (a11y), so include `focus-visible:opacity-100`.

**File:** `src/pages/dashboard/admin/TeamMembers.tsx` — MemberRow

Add the `group` class to the row button so Tailwind's `group-hover` resolves. The Quick-Assign chip in the No-Roles section stays always-visible (it's a primary CTA, not a destructive one) — only the archive chip fades.

Calm-at-rest: roster reads as identity + role, not a wall of destructive icons.

---

## 2. Self-archive guard

**File:** `src/pages/dashboard/admin/TeamMembers.tsx`

Pull `user` from `useAuth()` (already imported). Tighten the existing chip predicate at all four MemberRow callsites:

```ts
canManage && m.is_active && !m.is_super_admin && m.user_id !== user?.id
```

Rationale: prevents accidental self-lockout. Owners must use a different operator's session (or platform support) to archive themselves — a deliberate friction point, not a bug.

---

## 3. Bulk archive in Table mode

**File:** `src/components/access-hub/UserRolesTab.tsx`

The Bulk Actions Bar (lines 668-704) already exists and already filters out super_admin in role assignment. Add an "Archive selected (N)…" button next to "Clear PINs":

- Resolves the selected user_ids to `OrganizationUser` records from the in-scope `users` array.
- Excludes the current user, super_admins, and already-archived members from the selection (toast a one-line summary if any were dropped: "Skipped 2: 1 self, 1 owner").
- Opens a new `BulkArchiveWizard` (see Technical section) — **not** N copies of the single-member wizard.

**Out of scope for this wave:** running the full per-member dependency-reassignment flow N times. The wizard architecture today is built around one member's dependency buckets; making it batch-aware is a Phase-2 effort. For Wave 4, the bulk flow handles the two cleanest cases:

- **Reason + effective date are uniform across the batch** (seasonal layoff, location closure).
- **Reassignment defaults to "drop" or single shared destination** (one supervisor inherits everything, or work just gets cancelled).

If an operator needs per-member nuance, they fall back to the per-row chip. The bulk flow is for the homogeneous case it actually solves.

---

## 4. Inline Restore on Archived tab

**File:** `src/pages/dashboard/admin/TeamMembers.tsx` — `ArchivedView`

Add a `RestoreMemberChip` trailing slot to each archived row, mirroring the symmetry of the live roster's archive chip. Same hover-reveal treatment.

- Uses existing `useUnarchiveTeamMember(orgId)` from `src/hooks/useArchiveTeamMember.ts`.
- One-click restore (no wizard) — restoring is non-destructive and reversible by re-archiving.
- Confirms with a sonner toast: "Restored {name}. Reassigned work was not undone."
- Disabled (with tooltip "Restore window expired") when the member was archived more than 90 days ago, matching the existing SecurityTab copy: "Available for 90 days after archive."

---

## Technical Section

### New files

- `src/components/dashboard/team-members/RestoreMemberChip.tsx` — mirrors `ArchiveMemberChip` shape; calls `useUnarchiveTeamMember.mutate(userId)`; 90-day gate computed from `archived_at`.
- `src/components/dashboard/team-members/archive/BulkArchiveWizard.tsx` — slim wizard (one step) with shared reason, effective date, and a single fallback action (`drop` | `reassign-to-one-person`). On submit, loops `useArchiveTeamMember` per member with the shared payload. Shows per-member success/failure in a final receipt list.

### Modified files

- `src/components/dashboard/team-members/ArchiveMemberChip.tsx` — add hover-reveal classes.
- `src/pages/dashboard/admin/TeamMembers.tsx` — destructure `user` from `useAuth`; tighten chip predicate (4 callsites); add `group` class to MemberRow button; render `RestoreMemberChip` in `ArchivedView`.
- `src/components/access-hub/UserRolesTab.tsx` — add Archive button to Bulk Actions Bar + state for `bulkArchiveOpen`; render `BulkArchiveWizard`.

### Doctrine alignment

- **Visibility contract:** chip is silent at rest (hover-only), surfaces on intent.
- **Governance:** self-archive guard + super_admin exclusion preserves owner-protection.
- **Audit trail:** unchanged — `account_approval_logs` continues to receive `archive_*` / `restore_*` events from existing mutations.
- **No new RLS, no new tables, no new edge functions.**

### Deferred (with revisit triggers)

| Deferred | Revisit when |
|---|---|
| Per-member dependency picker inside `BulkArchiveWizard` | First operator complaint that bulk forces over-cancellation, OR a batch ≥ 5 members triggers the bulk path more than 3 times in 30 days |
| Restore-with-reason audit field on inline restore | Compliance review or a restore-then-re-archive loop pattern shows up in `account_approval_logs` |

---

## What stays unchanged

- `ArchiveWizard.tsx` (single-member flow) — untouched.
- `useArchiveTeamMember`, `useUnarchiveTeamMember` hooks — untouched.
- DB schema, RLS, edge functions — untouched.
- The `is_super_admin` permission model — untouched.
