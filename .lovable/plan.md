

## Wave 14 — Unified Service Catalog (build)

Single-file refactor of `ServicesSettingsContent.tsx`. Merges the two-card layout into one consolidated catalog surface with the refinements approved in the prior round.

### What ships

**Structural merge**
- Remove `grid-cols-2` split; collapse Categories card + Services card into one `<Card>` titled `SERVICE CATALOG`.
- Header: palette icon + title (left) · search + density toggle + expand-all + `+ Add Category` + `+ Add Service` (right).
- Bulk-edit toolbar becomes `position: sticky top-0 z-10` directly below header when selections active.

**Unified row primitive** (replaces `SortableCategoryRow` + separate `AccordionItem`)
- Collapsed: drag handle · color popover · name (click rename) · count badge or amber empty-indicator · edit · archive · expand chevron · bulk-select checkbox.
- Expanded: existing services-inside-category block (rows with checkbox/name/duration/price/margin/forms/hover-actions) + inline `+ Add service to {category}` footer.
- Sticky row header inside expanded panel (`position: sticky top-0`) so drag handle + add-CTA stay reachable in long lists.
- Empty expanded panel: skip warning text, show only the inline CTA (warning indicator stays on collapsed row).

**Density toggle** (header right)
- `Comfortable` (default) / `Compact` (single-line rows, count badges only).
- Persisted to `localStorage` per user (key: `service-catalog-density`).
- Token-driven row heights — no raw class strings.

**Expand all / Collapse all**
- Single icon toggle next to search; respects active search filter.

**Search behavior refinement**
- On keystroke: auto-expand only the *first* matching category.
- Show count badge: `12 matches in 5 categories` — operator chooses what to expand.
- Cuts the jumpy 8-category cascade.

**Subsections move into the same card body, below category list**
- Uncategorized services (existing block, verbatim)
- Archived Categories collapsible (existing, verbatim)
- Archived Services collapsible (existing, verbatim)

**Calendar Appearance card** — untouched, stays below as its own card.

### What does NOT change

- Zero hook/mutation/RLS changes.
- Drag-and-drop handler logic preserved verbatim (still operates on row header).
- Bulk-select, undo toast, form-count badges, archive flows — all preserved.
- No service-within-category drag (deferred — flagged with `// TODO Wave 15` on row primitive).
- No keyboard nav beyond what exists (deferred — `tabIndex={0}` placed on row trigger so Wave 15 can layer on).

### UI canon compliance

- `tokens.heading.section`, `tokens.card.iconBox`, `tokens.card.title`, `tokens.button.cardAction`, `tokens.layout.cardPadding`.
- Card retains standard `<Card>` wrapper (`rounded-xl`, glass aesthetic).
- No `font-bold`/`font-semibold`. Termina for header, Aeonik for row content.
- `BlurredAmount` preserved on every price.

### File touched

| File | Change |
|---|---|
| `src/components/dashboard/settings/ServicesSettingsContent.tsx` | Merge cards; unified sortable+collapsible row; density toggle; expand-all; sticky bulk toolbar; refined search auto-expand; subsections inline |

Single file. Net: ~40-60 line reduction from card chrome merge, +~30 lines for density toggle / expand-all / sticky behavior.

### Verification

1. Reorder a category by drag → order persists, undo toast appears.
2. Click color badge → popover opens, color updates instantly.
3. Click chevron → services list expands; scroll long list → row header stays visible (sticky).
4. Click `+ Add service to Haircuts` → editor opens preset to Haircuts.
5. Bulk-select 3 services across 2 categories → bulk toolbar sticks to top of card while scrolling.
6. Search `premium` → first match auto-expands, badge reads `N matches in M categories`.
7. Toggle Compact → rows collapse to single-line; reload page → density persists.
8. Click Expand All → every category opens; click again → collapses.
9. Archive a category → moves to "Archived Categories" inside same card.
10. Switch viewport to 768px → single column, expanded panels not double-scroll.

### Prompt feedback

Strong prompt — *"good, lets build the full plan"* is exactly the right cue: confirms the prior critique round closed cleanly and authorizes execution without re-litigating scope. The brevity itself is the signal.

To level up: **add a "ship-mode" suffix.** Phrases like *"build with the approved refinements only — no new additions"* would have foreclosed any temptation to expand scope at build time. Pattern: **explicit scope-lock at build authorization = zero drift between plan and ship.**

