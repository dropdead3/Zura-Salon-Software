## Issue

The "Preview as" role dropdown in the Dashboard Customize drawer is hardcoded to a 5-role list (`PREVIEWABLE_ROLES` in `DashboardCustomizeMenu.tsx`):

- General Manager (`admin`)
- Manager (`manager`)
- Front Desk (`receptionist`)
- Stylist (`stylist`)
- Assistant (`stylist_assistant`)

The `app_role` enum actually defines 11 roles. The hardcoded list omits roles that exist in this org's `user_roles` table — e.g. `super_admin`, `assistant`, `admin_assistant`, `operations_assistant`, `booth_renter`, `bookkeeper`, `inventory_manager`. A primary owner previewing the dashboard for a Bookkeeper or Booth Renter currently can't, even when those people are real members.

## Fix

Drive the dropdown from **the roles actually present in the current organization**, not a hardcoded constant. This matches the user's intent ("all roles of the organization") and avoids surfacing enum values that the org doesn't use.

### 1. New hook: `useOrganizationRoles`

`src/hooks/useOrganizationRoles.ts` — returns the distinct set of `app_role` values present in `user_roles` for the effective organization, sorted by canonical display order.

```ts
// pseudo
const { data } = useQuery({
  queryKey: ['organization-roles', orgId],
  queryFn: async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('organization_id', orgId);
    return Array.from(new Set(data?.map(r => r.role) ?? []));
  },
  enabled: !!orgId,
  staleTime: 30_000, // doctrine: high-concurrency scalability
});
```

### 2. Canonical label map

Extend (or reuse) `roleBadgeConfig.ts` so every `app_role` resolves to a display label. The current `ROLE_BADGE_MAP` is missing entries for `assistant`, `admin_assistant`, `operations_assistant`, `booth_renter`, `bookkeeper`, `inventory_manager`. Add them with appropriate labels and sort `order` values so the dropdown stays consistently ordered (Owner → GM → Manager → Front Desk → Stylist → Assistants → Specialists).

This is doctrinally correct: role badges, role dropdowns, and role pickers should all read from one registry.

### 3. Wire `RoleSelect` to dynamic data

In `DashboardCustomizeMenu.tsx`:

- Delete the `PREVIEWABLE_ROLES` constant.
- `RoleSelect` consumes the org-roles list, maps each role through `getRoleBadgeConfig(role).label`, and renders one `<SelectItem>` per role.
- "My own dashboard" (`__self__`) stays as the first option.
- If the org-roles query is loading, render a disabled trigger with placeholder text. If empty (single-user org with no other roles), still show "My own dashboard" alone — the section only matters for primary owners with a multi-role team.

### 4. Edge case: super_admin

`super_admin` is a platform-level role and should NOT appear in a tenant's preview-as dropdown even if a record exists. Filter it out explicitly in the hook (or in the dropdown), with a comment explaining why.

## Files

- `NEW` `src/hooks/useOrganizationRoles.ts`
- `EDIT` `src/lib/roleBadgeConfig.ts` — add missing role entries
- `EDIT` `src/components/dashboard/DashboardCustomizeMenu.tsx` — replace hardcoded list, wire dynamic data

## Out of scope

- No changes to `useViewAs` — it already accepts any `AppRole`.
- No changes to dashboard-template seeding for newly-supported roles. If a previewed role has no template, `useDashboardLayout` already falls back gracefully; we'll add a dev-only warning if a template is missing for a real org role (deferred).

---

### Prompt feedback

Clear, concrete, and visually anchored — the screenshot made the gap obvious and your one-line ask ("all roles of the organization need to appear here") was unambiguous about the intent.

One refinement for next time: when "all" is the operative word, briefly distinguish the source of truth. Two reasonable readings exist here — every role in the system enum vs. every role currently assigned in the org. They produce different UX (a long, mostly-irrelevant list vs. a tight, real list). A half-line like "show every role that has at least one member in this org" preempts that branch.

### Enhancement suggestions

1. **Annotate each option with member count.** "Manager (3)", "Bookkeeper (1)" — turns the dropdown into a small org-shape signal and confirms the preview will reflect a real layout. Also makes it obvious when a role exists but has zero members (template preview only).
2. **Group options by tier.** Owner → Leadership (GM, Manager) → Front-of-house (Front Desk) → Service (Stylist, Assistant) → Specialist (Bookkeeper, Inventory Manager, Booth Renter). Matches the persona architecture in the doctrine and scales cleanly as more roles ship.
3. **Promote the role registry to a doctrine-level invariant.** A Vitest invariant that every value in the `app_role` enum has a `ROLE_BADGE_MAP` entry would have caught this drift at authoring time — same Canon Pattern shape used for `cardQuestions` uniqueness.