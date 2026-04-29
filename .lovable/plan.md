# Rename "Other Roles" → "No Roles Assigned" (with surfaced warning)

## The actual bug

The "Other Roles" bucket on **Team Members** and on **Settings → Roles** appears whenever `primaryRoleOf(member.roles)` returns `null`. Since `ROLE_RANK` already covers every operational role in the `app_role` enum, in practice **100% of the members shown there have `roles.length === 0`** — they're not "other," they're **unassigned**.

That mislabel is a governance issue, not a copy nit:

- "Other Roles" reads as benign — "yeah, they have a role, just not a common one."
- Reality is the opposite: these users can't be scheduled, can't be paid, can't access anything role-gated. They are an **onboarding gap that demands operator action**.
- Per Visibility Contracts, silence is valid output; **mis-labeling a problem as a neutral state is not**.

## What changes

Split the bucket honestly:

| Member shape | Section header | Tone |
|---|---|---|
| `roles.length === 0` | `NO ROLES ASSIGNED` + amber warning icon + "Action required" hint | warning |
| `roles.length > 0` but none in `ROLE_RANK` | `OTHER ROLES` (kept, but only renders when truly non-empty) | neutral |

In practice the second bucket is almost always empty, so the visual default becomes the honest one.

## File 1 — `src/pages/dashboard/admin/TeamMembers.tsx`

1. Update the `grouped` memo (line ~268-292) to produce **two** terminal buckets:
   ```ts
   const noRoles: OrganizationUser[] = [];
   const otherRoles: OrganizationUser[] = [];
   for (const m of filtered) {
     const primary = primaryRoleOf(m.roles);
     if (primary) { /* push into byRole */ }
     else if (m.roles.length === 0) noRoles.push(m);
     else otherRoles.push(m);
   }
   ```
2. Render order at the bottom of the page (after ranked sections):
   - `noRoles` block first (the warning surface — operators should act on this).
   - `otherRoles` block second, conditional on length > 0.
3. Visual treatment for the `noRoles` header:
   - Replace `Users` icon with `AlertCircle` (`text-amber-500`).
   - Header text `NO ROLES ASSIGNED` in `font-display`.
   - Trailing helper: `<span className="text-xs text-muted-foreground">Action required — assign a role to enable scheduling and access.</span>`
   - Header border tinted amber: `border-amber-500/30`.

## File 2 — `src/components/dashboard/settings/SettingsCategoryDetail.tsx`

Mirror the same split inside the `(() => { … })()` IIFE at line ~711:
- Compute `noRoleUsers = users.filter(u => !u.role || u.role === '')` (this surface uses a single `u.role` field — verify the empty/null shape during execution).
- Compute `otherRoleUsers = users.filter(u => u.role && !categorizedRoles.includes(u.role))`.
- Render two distinct sections with the same visual treatment as File 1 (`AlertCircle` + amber border for the "no roles" block).

## What stays the same

- The `OTHER ROLES` block is preserved — it's a real safety net for the case where an org adds a custom role before the rank registry is updated. It just becomes accurate (only shown when truly populated).
- No schema changes, no migration, no copy/policy registry edits.
- Click-through behavior, sort order, member rows — unchanged.

## Files touched

- **Edit:** `src/pages/dashboard/admin/TeamMembers.tsx`
- **Edit:** `src/components/dashboard/settings/SettingsCategoryDetail.tsx`
