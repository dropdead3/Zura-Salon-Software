# Analytics as a First-Class Section

## Problem

Today the customize dashboard menu lists every section AND every pinned analytics card in one flat draggable list under "SECTIONS & ANALYTICS." Pinned cards can be dragged in between unrelated sections (e.g. between "Tasks" and "Announcements"), which:

- Breaks the conceptual model — analytics is a single cohesive area on the dashboard, not a free-floating cluster of widgets.
- Makes the customize panel longer than necessary (every pinned card adds a row at the top level).
- Leaves the door open to layouts where one analytics card lives in section position 2 and another lives in position 7 — confusing both to author and to read.

The render layer already coalesces all pinned cards into a single grid at the first pinned position, so the flat-list authoring model doesn't even match what the dashboard actually displays.

## Goal

Analytics becomes its own top-level section called **Analytics** (alongside Daily Briefing, Tasks, Announcements, Widgets, etc.). Inside that section, pinned analytics cards can be reordered. Outside it, sections — including Analytics as one block — reorder against each other.

## What Changes

### Customize Dashboard panel

```text
SECTIONS
├── ⋮⋮ Daily Briefing               [toggle]
├── ⋮⋮ Quick Actions                [toggle]
├── ⋮⋮ Analytics                    [toggle]   ← new top-level section
│     └── (expands to show pinned cards, reorderable within)
│         ├── ⋮⋮ Sales Overview     [pinned ✓]
│         ├── ⋮⋮ Executive Summary  [pinned ✓]
│         └── ⋮⋮ Capacity Util.     [pinned ✓]
├── ⋮⋮ Tasks                        [toggle]
├── ⋮⋮ Announcements                [toggle]
└── ⋮⋮ Widgets                      [toggle]

AVAILABLE ANALYTICS         (unchanged — pin/unpin from full catalog)
```

- Section header changes from "SECTIONS & ANALYTICS" to **"SECTIONS"**.
- Subhead copy updates to: *"Drag to reorder sections. Toggle to show/hide. Expand Analytics to reorder pinned cards."*
- The Analytics section row shows a chevron; expanding reveals an inset, indented sortable list of currently-pinned cards with their own drag handles and unpin toggles.
- Two independent DnD contexts: one for the outer section list, one for the analytics card list (only active when expanded).

### Dashboard render (DashboardHome.tsx)

- Analytics renders wherever the **Analytics** section sits in `sectionOrder` — not at "first pinned card index" anymore.
- If Analytics section is toggled off, no pinned cards render and the filter bar is suppressed.
- Card order within the analytics grid comes from a new `analyticsCardOrder: string[]` field on the layout (separate from `sectionOrder`).
- Pinning a new card from "Available Analytics" appends it to `analyticsCardOrder` and ensures the Analytics section is enabled + present in `sectionOrder`.

### Data model (layout shape)

`useDashboardLayout` payload gains:
- `analyticsCardOrder: string[]` — ordered list of pinned card IDs (replaces interleaving in `sectionOrder`).
- `sectionOrder` no longer contains `pinned:*` entries; it gets a single `analytics` entry instead.

A migration step inside the existing `sanitize/migrate` pipeline:
- Detects legacy layouts where `sectionOrder` contains `pinned:*` entries.
- Extracts those entries (preserving order) into `analyticsCardOrder`.
- Replaces them in `sectionOrder` with a single `analytics` entry at the position of the first pinned card.
- Idempotent — safe to run on every load.

## Files to Touch

- `src/components/dashboard/DashboardCustomizeMenu.tsx` — split flat list into outer sections list + nested analytics card list; rename header; add expand/collapse for Analytics.
- `src/hooks/useDashboardLayout.ts` — add `analyticsCardOrder`, register `analytics` as a known section ID, add migration logic in the existing sanitizer, update save/reset paths.
- `src/pages/dashboard/DashboardHome.tsx` — render the analytics grid at the position of the `analytics` section ID (instead of first-pinned-index); drive card order from `analyticsCardOrder`.
- `src/components/dashboard/SortableSectionItem.tsx` (or a new `SortableAnalyticsSectionItem`) — support an expandable variant with a nested sortable list.

## Out of Scope

- No changes to which cards exist in the pinnable catalog.
- No changes to the per-role visibility / pinning DB writes.
- No changes to Widgets section behavior.
- No changes to compact vs detailed bento grid layout.

## Acceptance

1. In Customize Dashboard, the top list shows sections only. "Analytics" appears as one entry.
2. Dragging "Analytics" up or down moves the entire analytics block on the dashboard.
3. Expanding "Analytics" reveals pinned cards; dragging within reorders them on the dashboard grid.
4. Toggling "Analytics" off hides the filter bar and all pinned cards. Toggling on restores them.
5. Existing users with legacy interleaved layouts see their analytics cluster preserved at the first pinned card's prior position, with their previous card order intact.
6. Pinning a new card from "Available Analytics" appends it to the Analytics section and re-enables the section if it was off.
