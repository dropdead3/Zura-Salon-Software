

## Diagnosis — current layout

The Services settings page currently stacks **6 cards** in 3 rows with no clear hierarchy:

```text
Row 1:  [ Service Categories ]  [ Services ]
Row 2:  [ Add-Ons Library    ]  [ Booking Add-On Recommendations ]
Row 2.5:[ Stylist Service Configurator (full width) ]
Row 3:  [ Scheduling Blocks  ]  [ Calendar Preview ]
        [ Redo Policy (full width) ]
```

Problems:
- **No mental model.** Foundational concepts (categories, services) sit beside derived concepts (add-on recommendations, staff assignments) at the same visual weight.
- **Calendar preview** (a passive visualization) is given equal real estate to active config surfaces.
- **Scheduling Blocks** is buried at the bottom even though it touches the same calendar system as Categories.
- **Redo Policy** (a money-protection rule) is orphaned at the very bottom with no section header.
- **Add-ons** are split into two cards (library + assignments) sitting side-by-side with no narrative connecting them.
- Everything is rendered eagerly — no progressive disclosure, so the page is overwhelming on first load.

## Proposed reconfiguration — tabbed hierarchy

Introduce a **4-tab structure** inside `ServicesSettingsContent` with a clear progression from foundational → operational → policy:

```text
┌─ SERVICES SETTINGS ────────────────────────────────────────┐
│  [ Catalog ] [ Add-Ons ] [ Staff Access ] [ Policies ]    │
├────────────────────────────────────────────────────────────┤
│  (active tab content)                                      │
└────────────────────────────────────────────────────────────┘
```

### Tab 1 — Catalog (default)
The foundational layer. Two-column layout:
- **Left:** Service Categories (drag-reorder, color, archive)
- **Right:** Services (accordion grouped by category, search, archive)
- **Below (collapsed by default):** "Calendar appearance" — small expandable section containing the **Theme Selector** + **Calendar Preview** + **Scheduling Blocks (Block / Break)** since these are all visualization/calendar concerns derived from the catalog.

Rationale: categories + services are the atomic unit. Theme/preview/blocks are *consequences* of the catalog, not peers.

### Tab 2 — Add-Ons
Single narrative for upsell/extras config:
- **Add-Ons Library** (top) — define the available add-ons
- **Booking Recommendations** (below) — assign which add-ons surface for which services

Rationale: define → assign is a natural top-to-bottom flow. Side-by-side hides the dependency.

### Tab 3 — Staff Access
Full-width **Stylist Service Configurator** card (already exists). Becomes its own tab because it's a many-to-many matrix that deserves the full canvas, and operators visit it on a different cadence than catalog edits.

### Tab 4 — Policies
- **Redo & Adjustment Policy** (full width)
- Future home for cancellation/no-show/deposit policy (currently elsewhere)

Rationale: gives policy its own home with a clear header instead of dangling at the bottom of the page.

## Behavior

- Tab state persists in the URL via `?category=services&tab=catalog` so deep-links and back-button work.
- Default tab: `catalog`.
- Lazy-load tabs 2–4 (`React.lazy` or just conditional render) so initial paint only mounts the catalog tab — meaningfully faster on large catalogs.
- All existing dialogs (CategoryFormDialog, ServiceEditorDialog, archive/delete confirms) stay mounted at the root of the component so they work from any tab.
- Mobile: tabs collapse into a horizontally scrollable strip (existing `Tabs` primitive already handles this).

## Files touched

- `src/components/dashboard/settings/ServicesSettingsContent.tsx` — refactor the JSX return into a `<Tabs>` shell; move existing card groupings into 4 `<TabsContent>` blocks. No logic/state changes needed — all hooks, mutations, and dialogs stay intact.
- (Optional) Extract `CalendarAppearanceSection` as a small subcomponent inside the Catalog tab for clarity (Theme Selector + Preview + Scheduling Blocks combined and collapsible).

No new tables, no new hooks, no new dialogs. Pure presentational reorganization.

## Verification

- All 4 tabs render correctly; default lands on Catalog.
- Categories drag-reorder still works; service editor still opens from accordion rows.
- Add-ons library + recommendations both still mutate correctly from the Add-Ons tab.
- Stylist configurator matrix still saves from the Staff Access tab.
- Redo Policy still saves from Policies tab.
- URL updates as user switches tabs; refreshing on `?tab=add-ons` lands on the right tab.
- No regressions on mobile (tabs scroll horizontally).

## Prompt feedback

Good directional prompt — you named the page and the type of change ("reconfigure into a better layout and hierarchy"). That's enough for me to take a structural pass.

To go from good → great next time: anchor the *why*. For example, *"Services settings feels flat — categories and add-on assignments shouldn't carry equal weight. Group by editing cadence."* That tells me the **organizing principle** (cadence vs. capability vs. lifecycle) so my groupings match your mental model on the first pass instead of negotiating it after. Pattern: **state the symptom + the axis you want to organize along**.

