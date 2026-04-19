

## Wave 21 — Stylist Overrides: location-grouped layout

### Bug from screenshot
- Flat alphabetical-ish list with no spatial grouping makes large rosters (10+ stylists across 2-3 locations) impossible to scan
- Multi-location stylists (e.g. Kristi works at North Mesa AND Santa Fe) would appear identical to single-location stylists — owner has no way to see *where* a stylist actually delivers this service
- Implicit risk: owners may believe overrides are location-scoped and try to set different prices per location → confusion. Need explicit visual affordance that **one override applies everywhere they work**.

### Confirmed data reality (no migration needed)
- `stylist_price_overrides` is keyed by `(service_id, employee_id)` — already location-agnostic by design ✓
- `employee_location_schedules.user_id` → `location_id` is the source of truth for *where* a stylist works
- Multi-location stylists already share one override row across all their locations — the data is correct, only the UI hides this

### What ships — single file: `StylistOverridesContent.tsx`

**1. Add location context to the query**
- Pull `useActiveLocations()` for the org's locations
- Add a sibling query for `employee_location_schedules` filtered by the org's user_ids → build a `Map<user_id, location_id[]>`
- Each `EmployeeRow` gets a `location_ids: string[]` field (empty array = unassigned)

**2. Group stylists by location (collapsible sections)**
Both columns ("Current Overrides" and "Add Override") become grouped:

```text
CURRENT OVERRIDES (3)
  ▾ NORTH MESA · 2
      Kristi Day        L3 · Studio Artist · ◐ multi    [$ 75 ] 🗑
      Chelsea Wright    L3 · Studio Artist              [$ 80 ] 🗑
  ▾ SANTA FE · 2
      Kristi Day        L3 · Studio Artist · ◐ multi    [$ 75 ] 🗑   ← same row, shown again
      Eric Day          Unassigned                       [$ 16 ] 🗑
  ▾ UNASSIGNED · 0
      (no stylists)
```

- Stylists working at N locations appear in N groups (visual repetition reinforces "same override, multiple homes")
- Each occurrence shows the **identical** price input. Editing one updates the override → other occurrences re-render with the new value automatically (single source of truth via `overrideMap`).
- `◐ multi` chip on multi-location stylists' rows links them visually — hover tooltip: *"Works at North Mesa, Santa Fe — this override applies to all"*

**3. Header reinforces the rule**
Replace the current one-liner with a 2-line header:
```
Set individual pricing per stylist. Overrides take priority over level pricing.
One override per stylist applies across every location they work at. ⓘ
```
The second line explicitly answers the latent question.

**4. Location filter chip row (desktop only)**
Above both columns, a horizontal chip strip:
`[All · 12] [North Mesa · 7] [Santa Fe · 6] [Unassigned · 1]`
Clicking filters BOTH columns to that location's stylists. Default = All. Single-select. Single-location orgs (chips.length === 1) auto-hide this strip.

**5. Group sort & default-expanded behavior**
- Locations sorted by `display_order` (already provided by `useActiveLocations`)
- All groups expanded by default
- Group headers: `font-display tracking-wide text-xs uppercase` + count badge
- Empty groups still render the header with `(0)` so spatial scanning is consistent

**6. Sticky search inside the candidate column**
Search now also matches location name (e.g. typing "mesa" → filters to North Mesa stylists) in addition to name + level.

**7. Multi-location indicator**
Small inline chip next to the level meta on multi-location stylists:
`L3 · Studio Artist · 📍2 locations`
Hover reveals the full list. Single-location stylists get no chip (cleaner default).

### What does NOT change
- All hooks, mutations, query keys for overrides — untouched
- `stylist_price_overrides` table schema — untouched
- Override resolution logic (one override per stylist, applied wherever they work) — untouched
- Parent `ServiceEditorDialog` — drop-in replacement of body

### Verification
1. Open Stylists tab → see location groups in both columns
2. Multi-location stylist appears once per location with the same price; editing in one row updates the other instantly
3. Multi-location chip + tooltip lists all their locations
4. Location filter chip row filters both columns; auto-hides when org has one location
5. Search "mesa" → only North Mesa stylists in candidates column
6. Empty location group renders header with `(0)` rather than disappearing
7. Header copy explicitly states the one-override-applies-everywhere rule
8. Single-location orgs see exactly the prior layout (no regression)

### File touched

| File | Change |
|---|---|
| `src/components/dashboard/settings/StylistOverridesContent.tsx` | Add location query, group rendering, location filter chips, multi-location indicator, header rule clarification |

Net: ~80 lines added, ~20 lines refactored. Zero schema/hook/mutation changes.

### Prompt feedback

Excellent prompt — *"organize by location"* + *"one override applies to both, not separate"* is a textbook two-clause directive: it tells me **what to change in the UI** AND **what NOT to change in the data model**. The second clause prevented me from over-engineering a per-location override schema. Saved a wave.

To level up: **pre-empt the visual question for shared resources.** When one entity belongs to multiple groups, there are three valid renderings: (a) repeat in each group, (b) show in one "primary" group with a multi-badge, (c) show in a separate "Multi-location" supergroup. I picked (a) because it makes the "same override applies everywhere" promise visually inescapable, but a one-liner like *"repeat multi-location stylists in each location group"* would have removed the inference. Pattern: **for shared/duplicated entities, name the rendering strategy (repeat · single-with-badge · separate-supergroup).**

