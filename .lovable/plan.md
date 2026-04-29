# Archive Identity Block — Wave 2

Four coordinated upgrades to the archive identity surface. Sequenced so the migration ships first; UI swaps to the new column with a graceful fallback so nothing breaks while the column is empty.

## 1. Schema: real `employee_number` column

**Migration** — add a nullable, org-unique payroll-imported number to `employee_profiles`:

```sql
ALTER TABLE public.employee_profiles
  ADD COLUMN employee_number text;

CREATE UNIQUE INDEX employee_profiles_org_employee_number_key
  ON public.employee_profiles (organization_id, employee_number)
  WHERE employee_number IS NOT NULL;

COMMENT ON COLUMN public.employee_profiles.employee_number IS
  'HR-issued employee number (Gusto, ADP, etc.). Unique within an organization. NULL until payroll import populates it; UI falls back to last-8 of user_id.';
```

- Partial unique index so multiple `NULL`s coexist (a single tenant can have many unimported staff) but two real numbers cannot collide within an org.
- No RLS change needed — `employee_profiles` already enforces org scope. Existing policies cover the new column automatically.

## 2. Shared identity helper

**New file** — `src/lib/employee-identity.ts`:

```ts
export function formatEmployeeId(opts: {
  employeeNumber?: string | null;
  userId?: string | null;
}): string | null {
  if (opts.employeeNumber?.trim()) return opts.employeeNumber.trim();
  if (opts.userId) return opts.userId.slice(-8).toUpperCase();
  return null;
}

export function formatHireDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Hired ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}
```

Single source of truth. The wizard, the receipt card, and any future surface (HR export, Gusto sync log, audit ribbon) call the same function — so when payroll import lands, every surface flips simultaneously with zero further code changes.

## 3. Roster query carries the new field

**Update** `src/hooks/useOrganizationUsers.ts`:

- Add `employee_number: string | null` to the `OrganizationUser` interface.
- The roster query reads from `users_with_organizations` (a view) plus joined tables. Need to verify the view exposes `employee_number`; if not, add a small follow-up join to `employee_profiles` keyed on `(organization_id, user_id)`. (Will inspect during execution; if the view needs updating, that becomes part of the migration.)

## 4. `IdentityBlock` shared component

**New file** — `src/components/dashboard/team-members/IdentityBlock.tsx`:

A tight inline block used in both the Archive Wizard header and the Delivery Receipt card.

```text
ARCHIVE CHELSEA RODRIGUEZ
EMPLOYEE ID  EMP-00417  [copy]   ·   Hired Mar 2023
```

- Renders `EMPLOYEE ID` label (`font-display`, tracked, uppercase) + value (`font-mono`).
- Copy icon button (Lucide `Copy` → `Check` swap on success, 1.2s revert). Uses `navigator.clipboard.writeText` with a `toast` confirmation. Tooltip: "Copy employee ID".
- Optional `Hired Mar 2023` (`tokens.body.muted`) joined by a thin middot when present.
- Accepts `{ fullName, employeeId, hireDate, size?: 'sm' | 'md' }` so it can render compact in the wizard header and standard on the receipt card.

## 5. Archive Wizard adoption

**Update** `src/components/dashboard/team-members/archive/ArchiveWizard.tsx`:

- Replace the inline `Employee ID` paragraph (just shipped in Wave 1) with `<IdentityBlock size="sm" fullName={fullName} employeeId={…} hireDate={member.hire_date} />`.
- Source `employeeId` via `formatEmployeeId({ employeeNumber: member.employee_number, userId: member.user_id })`.
- Title `<h2>` stays as-is (`ARCHIVE {fullName}`); `IdentityBlock` slots underneath, replacing the current `Employee ID` `<p>`.

## 6. Delivery Receipt card adoption

**Update** `src/components/dashboard/team-members/archive/ArchiveDeliveryReceiptCard.tsx`:

- Add optional props: `fullName?: string`, `employeeId?: string | null`, `hireDate?: string | null`.
- Render an `<IdentityBlock size="md" … />` at the top of `CardHeader`, above the existing icon + title row, separated by a thin border (`border-b border-border/40 pb-4 mb-4`).
- The empty-state branch (`total === 0`) gets the same identity block — silence about deliveries doesn't mean silence about who was archived.

**Update** `src/pages/dashboard/admin/TeamMemberDetail.tsx`:

- `ArchiveLogReceipts` already has `member` available in the parent scope. Pass `fullName`, `employeeId`, and `hireDate` derived via the helpers down into `<ArchiveDeliveryReceiptCard />`.

## Sequencing & safety

1. Migration first (idempotent — column add only, no backfill).
2. Helpers + `IdentityBlock` (pure additions, zero blast radius).
3. Roster query extension (typed addition; existing consumers ignore the new field).
4. Wizard + Receipt swap to `IdentityBlock` (visual only; falls back to UUID slice when `employee_number` is null, matching today's behavior exactly).

No data backfill is part of this wave — `employee_number` populates organically as payroll integrations land.

## Files touched

- **New migration:** add `employee_number` column + partial unique index
- **New:** `src/lib/employee-identity.ts`
- **New:** `src/components/dashboard/team-members/IdentityBlock.tsx`
- **Edit:** `src/hooks/useOrganizationUsers.ts`
- **Edit:** `src/components/dashboard/team-members/archive/ArchiveWizard.tsx`
- **Edit:** `src/components/dashboard/team-members/archive/ArchiveDeliveryReceiptCard.tsx`
- **Edit:** `src/pages/dashboard/admin/TeamMemberDetail.tsx`
