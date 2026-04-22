

# Consolidate Roster + Bulk Roles into a single unified team list

## Diagnosis (Surface → Assertion → Lever → Gap → Affordance)

- **Surface**: `/dashboard/admin/team-members` — the Team Members section currently splits a single concept ("the list of people in this org") across two tabs.
- **Assertion**: The two tabs imply they answer different questions. They don't. Both are *"the team, listed."* One reads-only and drills in; the other shows the same people with role switches inline.
- **Gap**: Operators see two list-of-people tabs and have to pick. The Roster's hidden value (location grouping, role-stat tiles, bulk role-flip) lives only in Bulk Roles. The Bulk Roles surface is dense, intimidating, and never the obvious starting point.
- **Desired affordance**: One list. The Roster is the canonical surface. It gains the things from Bulk Roles that are operationally valuable (table mode for ≥15 members, location grouping, multi-select with bulk role actions, role-stat tiles) — but stays readable when those features aren't in use.

## What the consolidated tab becomes

The `bulk-roles` view goes away. The `roster` view absorbs its features and stays the default. Final Team Members tabs drop from 4 → 3:

```
[ Roster ]   [ Invitations ]   [ PIN Management ]
```

The Roster surface, top-to-bottom:

1. **Search + filter bar** (existing search input, plus role/location chips and a "Show unassigned" toggle pulled from `UserRolesFilterBar`).
2. **Role-stat tiles** (compact row: Total + one tile per role with counts) — collapsed by default; toggle to expand. Pulled from `UserRolesTab`.
3. **View-mode toggle** (Card · Table) — auto-defaults to Table at 15+ members, persisted in localStorage. Existing logic.
4. **Bulk-select action bar** — appears when ≥1 row selected in Table mode (assign/remove role buttons). Existing logic.
5. **The list itself**:
   - **Card mode** (default for small teams): the existing categorized Roster sections (Leadership / Operations / Stylists / Other), where each row is the existing `MemberRow` component — clickable, drills into the team member detail page. *Inline role chips show, but role editing is not done here* — that lives in Table mode and on the detail page.
   - **Table mode** (default for ≥15 members or when location-grouped): the existing `UserRolesTableView` with role switches inline, multi-select checkbox column, and a row-click that drills into the detail page. Location grouping engages automatically when the org has 2+ locations.

The single rule that resolves the redundancy: **clicking a person always goes to their detail page.** Inline role toggles in Table mode are an accelerator, not a replacement for the detail page's full Role & Access tab.

## URL & redirect

- Default URL stays `/admin/team-members` (no `?view=` param).
- `?view=bulk-roles` redirects to `/admin/team-members?mode=table` so old bookmarks land in Table mode (which is what Bulk Roles really was).
- `mode=card | table` becomes the new query param for the view-mode toggle (replaces the localStorage-only persistence with URL state, so the choice is shareable).
- `?view=invitations` and `?view=pins` keep working unchanged.

## Files affected

| File | Change |
|---|---|
| `src/pages/dashboard/admin/TeamMembers.tsx` | Drop the `bulk-roles` tab. Roster view absorbs filter bar, role-stat tiles, view-mode toggle, bulk action bar, and conditionally renders categorized cards OR `UserRolesTableView`. Add `mode` URL param + legacy `view=bulk-roles` redirect. |
| `src/components/access-hub/UserRolesTab.tsx` | **Refactor, not delete.** Extract the reusable subcomponents (filter bar usage, role-stat tiles, role-overview legend, bulk action bar, list-rendering branches) into smaller pieces consumed by `TeamMembers.tsx`. The `UserRolesTab` wrapper itself becomes a thin re-export for any remaining external consumer (we'll verify there isn't one and remove if dead). |
| `src/components/access-hub/UserRolesTableView.tsx` | No structural change — reused as-is by Roster. |
| `src/components/access-hub/UserRolesFilterBar.tsx` | No change — reused. |
| `src/components/access-hub/index.ts` | Update exports if `UserRolesTab` is removed. |

I'll verify before deleting `UserRolesTab.tsx` that nothing else imports it (search for `UserRolesTab` across the codebase). If something does, the file stays as a thin alias that mounts the new consolidated Roster content.

## Two design decisions worth naming

1. **Role editing happens in two places, intentionally.** The detail page is the canonical, audited, single-person editor. The Roster's Table mode is a *fast-path bulk accelerator* for "promote 5 stylists to lead overnight" workflows. Both write to the same `user_roles` table — no duplicate source of truth.
2. **Card mode keeps the categorized section headers (Leadership / Operations / Stylists).** That's the primary value of today's Roster — it organizes a long list into scannable groups. We don't lose that when we add Bulk Roles' density features; we just hide them behind the view-mode toggle.

## Acceptance

1. Open `/admin/team-members` → see **3 tabs**: Roster · Invitations · PIN Management. No Bulk Roles tab.
2. Roster default view: search bar, filter chips, role-stat tiles row (collapsible), view-mode toggle, and the categorized member groups (Leadership / Operations / Stylists / Other) exactly as today.
3. Switching to Table view shows the cross-team grid with role switches and multi-select. URL becomes `?mode=table`.
4. With 15+ team members, Table mode is the default (existing auto-switch logic preserved).
5. With 2+ active locations, Table view groups by location automatically (existing logic preserved).
6. Clicking any row (in either view) navigates to the team member detail page.
7. Multi-select + bulk role assignment works in Table mode (existing logic preserved).
8. `/admin/team-members?view=bulk-roles` redirects to `/admin/team-members?mode=table` — no broken bookmarks.
9. Role-stat tiles, role-overview legend, super-admin grant flow, responsibility assignment dialog, and pending-approval badges all continue to work.
10. No console errors. Type-check passes.

## What stays untouched

- `InvitationsTab`, `TeamPinManagementTab` — unchanged, still mounted via `?view=`.
- Team member detail page and its Role & Access tab — canonical per-person editor.
- `useAllUsersWithRoles`, `useToggleUserRole`, `useToggleSuperAdmin` hooks — same data layer.
- `UserRolesTableView`, `UserRolesFilterBar`, `ResponsibilityBadges`, `AssignResponsibilityDialog`, `RoleHistoryPanel` — reused as-is.

## Doctrine alignment

- **One home per concern**: "the list of people in this org" is now a single surface, not two parallel ones.
- **Calm executive UX**: tabs drop from 4 → 3. Density features (stat tiles, role legend, bulk actions) are progressively disclosed, not always-on.
- **No duplicate sources of truth**: both views write through the same role-mutation hooks; the detail page remains the audited canonical editor.
- **Persona scaling**: small teams see a calm categorized roster; large teams (15+) and multi-location orgs auto-promote to the dense table — the right tool surfaces for the right operator size.
- **Defer with a trigger, not just "later"**: see Out of Scope below.

## Out of scope (queue separately)

- **Inline role chip-editing in Card view.** Defer until operators tell us they want to flip roles without leaving the categorized roster. Trigger: 2+ orgs request it, OR analytics shows ≥3 view-mode toggles per session.
- **Renaming "Roster" to just the section header.** Defer until the tab strip lands at 2 tabs (the day Invitations or PINs collapses into a different home).
- **Pulling the role-stat tiles up to the page header.** Defer until we know operators reference them at-a-glance more than they filter by them. Trigger: heatmap data on the tiles.
- **Removing `UserRolesTab.tsx` entirely.** Will only delete this wave if grep confirms zero remaining imports; otherwise a thin alias stays, slated for removal in a future cleanup wave once OnboardingTracker (or whatever holds the import) is migrated.

## Prompt feedback

Strong framing — "make it consolidated and not seem redundant" + the specific suggestion "Roster and roles can somehow be combined?" gave me both the *what* (deduplicate) and the *direction to consider* (merge, not delete one). Two things you did well:

1. **You named the symptom (redundancy) instead of prescribing the fix.** That left me free to recommend the right merge shape — categorized cards as default, table as a mode — instead of executing a possibly-wrong "delete Bulk Roles" instruction.
2. **You used "somehow" as an explicit invitation to design.** That's the cleanest way to ask for a recommendation rather than ratifying a decision you've already made.

The sharpener: when the merge could go in multiple directions (e.g., "kill Bulk Roles entirely" vs. "fold Bulk Roles into Roster" vs. "rename Bulk Roles to Manage Roles and keep both"), naming the **success criterion** rather than the **shape of the fix** narrows the design space the most. Template:

```text
Surface: [path]
Symptom: [what feels wrong]
Success looks like: [the operator behavior you want — "they never have to think about which tab", "they can assign 10 roles in 30 seconds", etc.]
Constraints (if any): [what must not change]
```

Here, "operator never has to think about which tab" is the success criterion that drove the recommendation. Naming it would have let me skip the proposing-then-justifying step.

## Further enhancement suggestion

For "merge two surfaces" prompts, the highest-leverage frame is:

```text
Merge: [surface A] + [surface B] into [destination]
Default behavior: [which surface's behavior wins as the default]
Demoted behavior: [what becomes a mode/toggle/affordance under the default]
What must survive: [features that cannot be lost in the merge]
```

Adding **What must survive** as its own slot is the highest-leverage addition — most failed merges aren't about the merge itself, they're about a feature getting silently dropped (here: location grouping, bulk select, stat tiles). Naming the must-survives upfront catches that before it ships.

