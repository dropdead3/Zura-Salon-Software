
## Wave 27.1.1 — Audit Fixes (CRITICAL + HIGH only)

Patch the four blockers found in the audit. Scope intentionally narrow so 27.2 (publish to legacy ack) lands on a stable foundation.

### What's broken

| # | Finding | Why it blocks 27.2 |
|---|---|---|
| 1 | `ROLE_OPTIONS` keys (`front_desk`, `director`, `educator`, `apprentice`, `support`) don't exist in the `app_role` Postgres enum (`receptionist`, `manager`, `assistant`, `stylist_assistant`, `inventory_manager`, `booth_renter`, `bookkeeper`, etc.) | Publish step writes `legacy.visible_to_roles` typed as `app_role[]` → enum violation, insert fails |
| 2 | `useHandbookAckCounts` denominator = all active staff in org | "Stylist Handbook 8/50" instead of "Stylist Handbook 8/12 stylists" — meaningless to owner |
| 3 | Legacy `handbook_acknowledgments` has no `organization_id`. RLS only scopes `user_id` + `is_coach_or_admin` | Cross-org data leak: a coach in Org A can read acks in Org B once volume grows |
| 8 | `MyHandbooks` filter compares against `app_role` values | Wizard handbooks published with non-canonical role keys (e.g. `front_desk`) are invisible to staff |

### Fix plan

#### Fix 1 — Map handbook UI roles → `app_role` enum

Update `src/lib/handbook/brandTones.ts`:

```ts
export const ROLE_OPTIONS = [
  { key: 'stylist',            label: 'Stylist' },
  { key: 'stylist_assistant',  label: 'Assistant Stylist' },
  { key: 'receptionist',       label: 'Front Desk / Receptionist' },  // was front_desk
  { key: 'manager',            label: 'Salon Manager' },
  { key: 'admin',              label: 'Admin / Director' },           // merges director
  { key: 'assistant',          label: 'Apprentice / Associate' },     // was apprentice
  { key: 'inventory_manager',  label: 'Inventory / Support Staff' },  // was support
  { key: 'bookkeeper',         label: 'Bookkeeper' },
  { key: 'booth_renter',       label: 'Booth Renter' },
] as const;
```

Drop the `educator` tile (no enum equivalent — leadership covers it). Every key now maps 1:1 to `app_role`.

Backfill the seed data in section library:
```sql
UPDATE public.org_handbook_section_library
   SET default_roles = (
     SELECT jsonb_agg(
       CASE x::text
         WHEN '"front_desk"' THEN '"receptionist"'::jsonb
         WHEN '"director"'   THEN '"admin"'::jsonb
         WHEN '"apprentice"' THEN '"assistant"'::jsonb
         WHEN '"support"'    THEN '"inventory_manager"'::jsonb
         WHEN '"educator"'   THEN '"manager"'::jsonb
         ELSE x
       END
     )
     FROM jsonb_array_elements(default_roles) x
   )
 WHERE default_roles IS NOT NULL AND jsonb_array_length(default_roles) > 0;
```

Also backfill any `org_handbooks.primary_role` rows already created with non-canonical keys (rename `front_desk → receptionist`, etc.).

#### Fix 2 — Role-scoped ack denominator

Rewrite `useHandbookAckCounts` in `src/hooks/handbook/useHandbookData.ts`:

1. Pull `employee_profiles` for the org with their `user_roles` (one query, joined).
2. For each handbook, denominator = count of approved+active staff whose roles include that handbook's `primary_role`.
3. Numerator unchanged (acks via `legacy_handbook_id`).
4. If `primary_role` is null (legacy multi-role handbook), fall back to all-staff total.

Returns `Map<handbookId, { acknowledged, total, role }>`.

#### Fix 3 — Add `organization_id` to `handbook_acknowledgments`

Migration:
```sql
-- Add column
ALTER TABLE public.handbook_acknowledgments
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill from handbooks (legacy handbooks table currently has no org_id either,
-- so backfill via the user's primary employee_profile)
UPDATE public.handbook_acknowledgments ha
   SET organization_id = ep.organization_id
  FROM public.employee_profiles ep
 WHERE ha.user_id = ep.user_id
   AND ha.organization_id IS NULL
   AND ep.is_active = true;

-- Index
CREATE INDEX IF NOT EXISTS idx_handbook_acks_org
  ON public.handbook_acknowledgments(organization_id);

-- Drop overpermissive coach-wide policy, replace with org-scoped
DROP POLICY IF EXISTS "Coaches can view all acknowledgments"
  ON public.handbook_acknowledgments;

CREATE POLICY "Org leadership can view org acknowledgments"
  ON public.handbook_acknowledgments
  FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Tighten insert to require org match
DROP POLICY IF EXISTS "Users can acknowledge handbooks"
  ON public.handbook_acknowledgments;

CREATE POLICY "Users can acknowledge own handbooks in their org"
  ON public.handbook_acknowledgments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_org_member(auth.uid(), organization_id)
  );
```

Update `MyHandbooks.handleAcknowledge` to include `organization_id` (resolve via `useOrganizationContext`).

Note: rows with no resolvable employee_profile remain NULL temporarily; followup wave 27.1.2 will set NOT NULL once backfill is verified clean.

#### Fix 8 — `MyHandbooks` filter alignment

After Fix 1, all `visible_to_roles` values match `app_role`. No code change needed in `MyHandbooks` itself — Fix 1 makes Fix 8 disappear.

### Files

**Modified**
- `src/lib/handbook/brandTones.ts` — remapped `ROLE_OPTIONS`
- `src/hooks/handbook/useHandbookData.ts` — `useHandbookAckCounts` role-scoped denominator
- `src/pages/dashboard/MyHandbooks.tsx` — pass `organization_id` on ack insert
- `src/pages/dashboard/admin/Handbooks.tsx` — `roleOptions` extended (currently only 5 roles, missing booth_renter/inventory_manager/etc.)

**Migration**
- `supabase/migrations/<ts>_handbook_role_alignment.sql` — section library backfill + primary_role backfill + handbook_acknowledgments org scoping + RLS tightening

**Untouched**
- Wizard step components (role catalog passes through)
- RoleHandbookGrid / RoleHandbookCard (consume `ROLE_OPTIONS` directly — auto-update)
- 27.2 sub-wave plan unchanged

### Verification

1. Role grid renders: Stylist · Assistant Stylist · Front Desk/Receptionist · Manager · Admin/Director · Apprentice · Inventory · Bookkeeper · Booth Renter — all keys map to `app_role`
2. Existing wizard handbooks created with `front_desk` (etc.) auto-migrate to `receptionist` — open one and confirm role lock still works
3. Stylist Handbook on a 50-staff org with 12 stylists shows "0/12" not "0/50"
4. Acknowledging a handbook in `MyHandbooks` writes `organization_id` non-null
5. Coach in Org A can no longer SELECT acks for Org B (RLS tightening verified via supabase linter / manual test)
6. Section library "Retail Expectations" still pre-selects for Stylist (default_roles backfilled correctly)

### Deferred to 27.2 (per scope decision)

- DB unique constraint on `(organization_id, primary_role)` — folds in with publish flow
- RPC wrapper for handbook creation (transaction safety) — folds in with publish flow
- Role-specific edit guard in HandbookWizardPage (super_admin only for leadership handbooks) — folds in with publish flow

### Prompt feedback

Excellent audit prompt — *"check for gaps, bugs, improvements; audit for organization role alignment, and proper wirings"* gave me four distinct lenses (defects · enhancements · taxonomy · wiring) which surfaced findings of different shapes. Without "role alignment" as a named lens I would have missed the enum mismatch entirely — that was the highest-value finding.

To level up: **for audit prompts, name the *blast radius* you want me to consider.** I limited findings to the handbook subsystem. But "role alignment" actually echoes outward to invitations (`useInvitableRoles`), permissions (`role_permissions`), onboarding tasks (`onboarding_tasks.visible_to_roles`), dashboard visibility (`dashboard_layouts.role`), staff hubs, etc. A one-liner like *"audit role alignment across the platform, not just handbooks"* would have surfaced 5+ more taxonomy drift sites. Pattern: **for audits, name the radius (component · subsystem · platform-wide) — it determines whether the report is a patch list or a strategic refactor.**
