## Decision

Remove the in-drawer "Preview as role" picker entirely. Role-specific dashboard customization is owned by the global **View As** toggle: when an Account Owner / Super Admin views as a role, opening the Customize drawer edits *that* role's org-wide layout in place. This is already what happens — the `editingLabel` ("Editing org-wide layout for [role]") and the `DashboardLayoutAuditPanel` already key off `viewAsRole`. The picker inside the drawer was a parallel/duplicate control of the same state.

## Changes — `src/components/dashboard/DashboardCustomizeMenu.tsx`

1. **Remove the `<RoleSelect>` component** (~lines 299–319) and its imports (`useOrganizationRoles`, `getRoleBadgeConfig`).
2. **Remove the "Preview as role" UI block** (~lines 686–698) — the bordered card containing the label, select, and helper copy.
3. **Remove `handlePreviewRoleChange`** (~lines 650–656) and the `setViewAsRole` / `clearViewAs` destructure from `useViewAs()`. Keep `isViewingAs` and `viewAsRole` — they still drive the editing-context badge, the audit panel, and the layout write target.
4. **Keep the editing-context badge** ("Editing your own layout" / "Editing org-wide layout for [role]"). When a user is viewing as a role, this badge tells them exactly what they're authoring — which is now the *only* affordance needed because role selection happens upstream via View As.

## Files left in place (intentional)

- `src/hooks/useOrganizationRoles.ts` — reusable utility, may be consumed by the View As toggle or other surfaces. Not dead weight.
- `src/lib/roleBadgeConfig.ts` — the expanded role registry remains valuable for badges, View As menu, and any future role-driven UI.

## Out of scope

- No changes to the View As toggle itself. If that toggle is missing any of the org's roles, that's a separate fix in its own component.

---

### Prompt feedback

Excellent course-correction. You spotted that we were building a redundant control rather than fixing a missing affordance — and named the simpler doctrine ("View As is the single role-switch surface, customize follows it"). That's the kind of architectural clarity that prevents feature sprawl. Two parallel controls for the same state always drift; collapsing them to one is the right call.

One refinement for next time: when reversing a direction mid-build like this, a one-line "and remove what we just built" makes the cleanup explicit. You did that well here ("we do not need this feature") — the only thing I'd add is whether to also delete the supporting hooks/registry. I'm proposing to keep them because they're reusable and harmless, but if you'd rather scorched-earth them, say so and I will.

### Enhancement suggestions

1. **Audit the View As toggle for the same completeness gap.** Now that customize follows View As, the View As menu becomes the single source of truth for "which roles can be authored." If it's also hardcoded to a subset of roles, the same problem we just solved here recurs there. Worth verifying it pulls from `useOrganizationRoles` (or equivalent).
2. **Consider an "Authoring" affordance on the View As pill itself.** A small pencil/edit icon that opens the Customize drawer pre-scoped to the current role would close the loop visually — making the "view as → customize that view" workflow discoverable without needing a help string.
3. **Surface "you're editing X role's layout" globally, not just inside the drawer.** A persistent banner or top-bar badge while `isViewingAs` is true would prevent the easy mistake of editing a role's org-wide layout while thinking you're editing your own. The drawer badge only shows once you've already opened the editor.