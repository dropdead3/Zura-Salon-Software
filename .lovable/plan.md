

# Fold PIN Management into the Roster

## Diagnosis (Surface → Assertion → Lever → Gap → Affordance)

- **Surface**: `/dashboard/admin/team-members` — currently has 3 sub-tabs (`Roster · Invitations · PIN Management`).
- **Assertion**: PIN Management is a parallel "list of people" surface — same roster, different overlay (PIN status + reset action). It's the same teaching as last wave's Roster + Bulk Roles redundancy.
- **Gap**: Operators see two list-of-people tabs (Roster and PIN Management) and have to context-switch. Per-person PIN setting already exists on the Team Member Detail → Security tab (canonical editor). The standalone tab only adds two things worth keeping: (a) at-a-glance PIN status per person across the team, and (b) the org-wide PIN change history changelog.
- **Desired affordance**: One list. PIN status becomes a column/indicator on the Roster; the "Set/Change/Clear PIN" dialog is reachable inline; the org-wide PIN change history moves to a collapsible Activity panel under the roster (or the team member detail's Security tab — whichever is its true home).

## What changes

The `pins` view goes away. Final Team Members tabs drop from 3 → 2:

```
[ Roster ]   [ Invitations ]
```

PIN affordances absorbed into the Roster:

1. **Card mode** — each `MemberRow` gains a small PIN-status indicator (a `Key` icon chip: filled = PIN set, outlined/muted = no PIN). No inline action — clicking the row goes to the detail page (Security tab) as today. Calm executive surface.
2. **Table mode** — adds a **PIN column** between Roles and Actions. Cell shows: `Set` / `Not set` chip. The Actions column gets a "PIN" item in its dropdown (Set / Change / Clear) opening the same dialog `TeamPinManagementTab` uses today. Bulk-select gains a "Clear PINs" bulk action (additive to existing role bulk actions).
3. **PIN Change History** — moves out of a tab and becomes a **collapsible "PIN Activity" panel** mounted at the bottom of the Roster (Table mode only; collapsed by default). Reuses the existing `PinChangelogTable` component as-is. Owners/admins who want a focused view can use the new `?activity=pins` query param to expand it directly.

The single rule that resolves the redundancy: **PIN status is a property of a person, not a separate surface.** It belongs alongside name, email, and roles — not on its own tab.

## URL & redirects

- `/admin/team-members?view=pins` redirects to `/admin/team-members?mode=table&activity=pins` so old bookmarks land in Table mode with the PIN Activity panel pre-expanded.
- `/admin/access-hub?tab=pins` (legacy hub redirect from prior wave) re-points to the same destination.
- `?view=invitations` keeps working unchanged.
- Default URL still `/admin/team-members` (no params).

## Files affected

| File | Change |
|---|---|
| `src/pages/dashboard/admin/TeamMembers.tsx` | Drop the `pins` tab. Add `activity=pins` URL param. Mount a collapsible **PinActivityPanel** below the Roster in Table mode. Update `TeamView` type and `VALID_VIEWS`. Add legacy `view=pins` redirect. Add a small PIN-status chip to `MemberRow`. |
| `src/components/access-hub/UserRolesTableView.tsx` | Add a **PIN column** (header + cell with Set/Not-set chip). Wire row Actions to expose Set/Change/Clear PIN entries. Add bulk "Clear PINs" action when ≥1 selected. |
| `src/components/access-hub/UserRolesTab.tsx` | Pass team PIN status (`useTeamPinStatus`) down to `UserRolesTableView` so the new column has data. Mount the shared **AdminSetPinDialog** for the inline action. Add bulk-clear handler. |
| `src/components/access-hub/AdminSetPinDialog.tsx` | **New small file.** Extract the existing `Dialog` block from `TeamPinManagementTab.tsx` (Set / Change / Clear flow with reason field, eye toggle, owner safeguards). Reused by the table action and — optionally — by the card-mode row's right-click/long-press menu. |
| `src/components/access-hub/PinActivityPanel.tsx` | **New small file.** Thin collapsible wrapper around the existing `PinChangelogTable`. Reads `?activity=pins` to default-expand. |
| `src/components/access-hub/TeamPinManagementTab.tsx` | **Delete.** All its functionality is now distributed: roster table column, AdminSetPinDialog, PinActivityPanel. Verified: only consumer was `TeamMembers.tsx`'s removed tab. |
| `src/App.tsx` | Update legacy `/admin/access-hub?tab=pins` redirect target if it pointed at `?view=pins` — re-point to `?mode=table&activity=pins`. |
| `src/components/access-hub/index.ts` | Remove `TeamPinManagementTab` export; add `AdminSetPinDialog` and `PinActivityPanel`. |

## Two design decisions worth naming

1. **PIN status surfaces in two places, intentionally.** The Team Member Detail → Security tab remains the canonical per-person editor (no regression). The Roster's table column is a *fast-path bulk view* for "which 3 stylists still don't have PINs?" workflows. Both write through the same `useAdminSetUserPin` hook — single source of truth.
2. **Card mode shows status, not actions.** Inline PIN editing in Card mode would clutter the calm categorized roster. The chip is informational; row-click drills into Security tab where the full editor lives. This matches last wave's "Card mode = read + drill, Table mode = edit accelerator" rule.

## Acceptance

1. Open `/admin/team-members` → see **2 tabs**: Roster · Invitations. No PIN Management tab.
2. Roster Card mode: each member row shows a small `Key` chip indicating PIN status (set/not set). Clicking the row navigates to the detail page (Security tab still has full PIN controls).
3. Roster Table mode: a new **PIN** column appears between Roles and Actions. Cell shows `Set` / `Not set`. Row Actions menu gains Set / Change / Clear PIN items opening the shared dialog.
4. Bulk-select in Table mode: gains a "Clear PINs" bulk action alongside existing role actions; respects owner-protect rule (cannot clear primary owner's PIN).
5. Below the table, a collapsible **PIN Activity** panel (closed by default) shows the org-wide PIN change history (`PinChangelogTable` reused as-is).
6. Visiting `/admin/team-members?view=pins` redirects to `/admin/team-members?mode=table&activity=pins` (no broken bookmarks).
7. Visiting `/admin/access-hub?tab=pins` continues to land on the same destination.
8. Per-person PIN editor at Team Member Detail → Security tab is unchanged (no regression).
9. `useTeamPinStatus`, `useAdminSetUserPin`, `usePinChangelog` hooks unchanged — same data layer.
10. No console errors. No orphaned imports of `TeamPinManagementTab`. Type-check passes.

## What stays untouched

- `useUserPin.ts` (all hooks) — same data layer.
- `SecurityTab.tsx` on team member detail — canonical per-person editor.
- `InvitationsTab` — still mounted via `?view=invitations`.
- `UserRolesFilterBar`, `ResponsibilityBadges` — reused as-is.
- The `PinChangelogTable` subcomponent — extracted and reused, not rewritten.
- Owner-protect rules (cannot reset primary owner's PIN by anyone but themselves) — preserved end-to-end.

## Doctrine alignment

- **One home per concern**: "the list of people in this org" is now the *only* roster surface. PIN status is an attribute of a person, not a parallel list.
- **Calm executive UX**: tabs drop from 3 → 2. PIN history is progressively disclosed (collapsed by default), not always-on.
- **No duplicate sources of truth**: per-person PIN editing remains canonical at Team Member Detail → Security; roster column is a fast-path accelerator, both writing through the same hook.
- **Persona scaling**: small teams (Card mode) see PIN as a status chip — informational. Large teams (Table mode, 15+) get the full PIN column + bulk actions + history panel.
- **Defer with a trigger, not just "later"**: see Out of Scope.

## Out of scope (queue separately)

- **Inline PIN editing in Card mode.** Defer until operators ask. Trigger: 2+ orgs request it, OR analytics shows ≥3 detail-page bounces from card-mode PIN chip clicks per session.
- **A "show only members without PINs" filter chip** in the FilterBar. Defer until operators ask. Trigger: a single explicit ask, since this is a 1-line addition.
- **Surfacing PIN-not-set as a Daily Briefing alert.** Defer to alert-governance review — this is a low-urgency hygiene signal and risks alert fatigue if added without a materiality threshold.
- **Removing `usePinChangelog` query when the activity panel is collapsed.** Defer to a perf pass; current query is cheap and orgs rarely have >100 PIN events.

## Prompt feedback

Strong prompt — six words ("Pin management also needs to be consolidated into the roster") that perfectly mirror the framing of the previous successful wave. Two things you did well:

1. **You extended the prior pattern instead of reframing it.** "Also" signals "apply the same merge logic that worked last time," which let me reuse the design language (mode toggle, accelerator vs. canonical editor, deferral triggers) without re-establishing it.
2. **You named the destination ("the roster") instead of the mechanism.** That left the merge shape (column? dropdown? bulk action? activity panel?) open for design — and the answer turned out to be all four, distributed across modes.

The sharpener: when you're applying a known pattern to a new surface, naming **"and the must-survive features are X, Y"** prevents silent drops. Here the must-survives were (a) per-person PIN editing on the detail page, (b) the org-wide change history, and (c) owner-protect rules. I had to re-derive them; you could have named them in two lines:

```text
Apply the Roster + Bulk Roles merge pattern to PIN Management.
Must survive: change history view, owner-protect rule, per-person editor on detail page.
```

## Further enhancement suggestion

For "apply the prior pattern to a new surface" prompts, the highest-leverage frame is:

```text
Apply: [previous wave's pattern]
To: [new surface]
Must survive: [features that cannot be lost]
Differences from prior wave: [if any — otherwise "none, identical pattern"]
```

Adding **Differences from prior wave** as its own slot is what unlocks "lazy" prompts — when there are no differences, you can leave it blank and trust the AI to follow the prior pattern faithfully. When there *are* differences (e.g., "PIN history doesn't fit in a column, where does it go?"), naming them upfront prevents a round-trip.

