

# Reorganize the Roster card-mode by role hierarchy and stylist level

## Diagnosis

Today's Card mode groups members into three flat sections:

```
Leadership   →  super_admin, admin, manager, general_manager, assistant_manager  (alpha order within)
Operations   →  director_of_operations, operations_assistant, receptionist, front_desk  (alpha order within)
Stylists     →  stylist, stylist_assistant  (alpha order within — level invisible)
Other Roles  →  catch-all
```

Two problems:

1. **Within Leadership/Operations, the role hierarchy is invisible.** A `super_admin` and an `assistant_manager` sit side-by-side sorted alphabetically. Operators can't see who outranks whom at a glance.
2. **Stylists are a single undifferentiated bucket.** The org has Levels 1–4 (configured per tenant in `stylist_levels`), but the Roster doesn't honor them. A Level 4 master sits next to a Level 1 apprentice with no visual cue.

## What changes

### 1. Hierarchy ordering *within* each section

Each section gets a deterministic role-rank order. Within a section, members sort by their highest-ranked role first, then alphabetically by name as a tiebreaker.

**Leadership** (top → bottom):
```
Super Admin  →  Admin  →  General Manager  →  Manager  →  Assistant Manager
```

**Operations** (top → bottom):
```
Director of Operations  →  Operations Assistant  →  Receptionist  →  Front Desk
```

**Stylists** — see below.

**Other Roles** — kept as alpha by name (catch-all, no implied hierarchy).

A small role chip after the name is already shown in `MemberRow`; no new affordance needed — the *order itself* communicates rank.

### 2. Stylists organized by level (sub-sections)

The Stylists section becomes a parent group with one **sub-heading per level**, in the org's configured `display_order` (highest level first when `display_order` is descending — we'll respect whatever order the tenant has set in `stylist_levels`, which is the source of truth).

Layout:
```
STYLISTS  (18)
  └─  LEVEL 4 STYLIST  (3)
        Alexis · Brooke · Cameron
  └─  LEVEL 3 STYLIST  (5)
        ...
  └─  LEVEL 2 STYLIST  (7)
        ...
  └─  LEVEL 1 STYLIST  (2)
        ...
  └─  Unassigned  (1)        ← stylists with no level set
        ...
  └─  Stylist Assistants  (3)  ← stylist_assistant role, separated below stylists proper
```

Sub-headings use a smaller, less-prominent treatment than the parent section header (e.g., `font-display text-xs uppercase tracking-wider text-muted-foreground` with a thin left rule), so the parent "STYLISTS" heading remains dominant and the levels read as a clean nested list — calm executive UX, not noisy.

If the org has zero levels configured (`useStylistLevels` returns empty), the Stylists section falls back to a single flat list (today's behavior). No empty sub-headings.

### 3. Hierarchy applied to Card mode only

Table mode is unchanged — it has its own filter/sort/group affordances and a dedicated `stylist_level` column already in the works on the Stylist Levels page. Mixing two ordering paradigms in one view would be confusing.

## Files affected

| File | Change |
|---|---|
| `src/hooks/useOrganizationUsers.ts` | Add `stylist_level: string \| null` to the `OrganizationUser` interface and to the `employee_profiles` select. One-line additions. |
| `src/pages/dashboard/admin/TeamMembers.tsx` | Replace the `grouped` memo with hierarchy-aware grouping. Add a `ROLE_RANK` map for Leadership/Operations ordering. Pull `useStylistLevels()` for the active levels and key the Stylists sub-grouping off `level.slug`. Render nested sub-headings inside the Stylists section. |

No new files. No DB changes (`stylist_level` already exists on `employee_profiles` per `useAssignStylistLevel`).

## Acceptance

1. **Leadership** section orders members: Super Admin → Admin → General Manager → Manager → Assistant Manager. Within a single rank, alpha by name.
2. **Operations** section orders: Director of Operations → Operations Assistant → Receptionist → Front Desk. Within a rank, alpha by name.
3. **Stylists** section shows nested sub-headings, one per active stylist level (in the org's configured `display_order`), each with a count and the members at that level alpha-sorted within. An "Unassigned" sub-heading captures stylists with no level. A "Stylist Assistants" sub-heading sits at the bottom for `stylist_assistant` role holders.
4. If a tenant has no levels configured, the Stylists section renders as a single flat alpha list (today's behavior), no empty sub-headings.
5. Members holding multiple roles are sorted by their *highest-ranked* role within the section that contains them. They appear once, not duplicated across sections.
6. `MemberRow` is unchanged — same row component, same drill-in target, same PIN chip.
7. Table mode is untouched.
8. Search still filters across all sections; sub-headings hide when their members count drops to zero after filtering.
9. No console errors. Type-check passes.

## What stays untouched

- `MemberRow`, drill-in navigation, PIN chip, search input, view-mode toggle, `UserRolesTab` (Table mode), `InvitationsTab`, capacity bar.
- `stylist_levels` data shape and source of truth (per-org, `display_order` ascending).
- The `Other Roles` catch-all section.

## Doctrine alignment

- **Hierarchy is structural information.** Surfacing it in the Roster's *order* (not a new badge or column) is the calm-UX answer — no new affordance, just truthful ordering.
- **Persona scaling.** Solo-stylist orgs with no levels see a flat list; multi-level orgs see the nested structure that mirrors their compensation and progression architecture.
- **Source of truth.** The Stylists sub-grouping reads from `stylist_levels` (the same table that drives Compensation, Career Pathway, and Levels Settings). No hardcoded level slugs; renaming a level in Settings updates the Roster sub-headings automatically.

## Out of scope (queue separately)

- **Drag-to-reorder within a level.** Manual ordering inside a level would conflict with alpha sort and add a third ordering paradigm. Trigger to revisit: an operator asks to "pin" a featured stylist to the top of their level.
- **Showing the level chip on the row itself.** Currently the level is communicated by *which sub-group* the row appears in; adding a chip on the row would be redundant. Trigger to revisit: operators say they can't tell which level a row belongs to when scrolling fast (would imply sub-headings need to stick on scroll instead).
- **Sticky sub-headings on scroll.** Defer until the Stylists section regularly exceeds ~20 visible rows in a single level; current section headers are scannable enough at the densities we see today.
- **Applying the same hierarchy ordering to Table mode.** Table mode is sortable per-column; imposing a default role-rank sort would conflict with operator-chosen sort columns. If we do this, it should be a toggle, not a default.

## Prompt feedback

Strong, concise prompt — two ideas in one sentence ("organize by role hierarchy" + "stylists by level") that are clearly related. Two things you did well:

1. **You named the structural concept ("role hierarchy") instead of an arrangement.** That left the implementation open — order-within-section vs. visual badges vs. separate sub-tabs — and the right answer turned out to be "let the order itself communicate rank."
2. **You called out the special case (Stylists by level) explicitly.** Without that, I might have lumped stylists into a single alpha block under the new hierarchy, missing the most-asked-for grouping.

The sharpener: when you have a structural idea that affects two scopes (whole roster + one specific section), naming the **canonical source of truth for the ordering** removes a decision. Template:

```text
Organize: [surface]
By: [hierarchy or attribute]
Source of truth: [where the order/levels are defined — settings page, table, enum]
Apply to: [card mode / table mode / both]
```

Here, "stylists by level — pulling from the Stylist Levels settings, card mode only" would have let me skip proposing-then-justifying the source.

## Further enhancement suggestion

For "organize by hierarchy" prompts, the highest-leverage frame is:

```text
Organize: [surface]
Hierarchy 1: [primary grouping] — source: [where defined]
Hierarchy 2: [sub-grouping inside one group, if any] — source: [where defined]
Tiebreaker: [alpha by name / hire date / custom order]
Scope: [which view modes this applies to]
```

The **Tiebreaker** slot is the most-leverage addition — it prevents the silent default of "alpha by name" from being a decision the AI has to defend later. State it once and it stops being an open question.

