

# Enterprise Multi-Location Gaps: Region Grouping & Per-Location Settings

## Current State

The platform's data model is **org-flat** — all locations are peers with no grouping or hierarchy. This creates critical gaps for enterprise operators (6+ locations) who need differentiated governance by market, region, or brand concept.

### What Already Supports Per-Location Overrides
- `backroom_settings` — key-value settings with `location_id` nullable (org default → location override pattern)
- `service_location_prices` — per-location service pricing
- `location_product_settings` — per-location product tracking

### What Does NOT Support Per-Location Differentiation
1. **Stylist Levels** — `stylist_levels` has no `location_id`. All locations share identical level names, commission rates, and display orders.
2. **Promotion Criteria** — `level_promotion_criteria` is scoped to `(organization_id, stylist_level_id)`. A "Senior Stylist" at a flagship NYC salon has the same $10K revenue target as a suburban location doing 40% less volume.
3. **Retention Criteria** — Same gap. `level_retention_criteria` has no location dimension.
4. **No Region/Group Concept** — `locations` table has no `region`, `group`, `market`, or `brand` column. No way to batch-manage settings across a subset of locations.
5. **Commission Rates** — Stored on `stylist_levels` (org-wide). An enterprise with different cost-of-living markets cannot differentiate commission structures.
6. **Location Filter UX** — All multi-location dropdowns are flat lists. At 15+ locations, finding the right one requires scrolling through an unstructured list.
7. **Bulk Operations** — The Color Bar `MultiLocationSection` supports push-to-all but not push-to-region. No concept of "apply to all East Coast locations."
8. **Evaluation Windows** — `evaluation_window_days` on criteria tables is org-wide. A new market in ramp-up phase might need a longer evaluation window.
9. **Scorecard Peer Context** — `useStylistPeerAverages` compares against ALL peers at the same level org-wide. A stylist in a high-volume urban location gets compared against rural peers — misleading.
10. **Report Tier Logic** — `reportCatalog.ts` uses total location count to determine tier. No way to scope reporting by region.

---

## Proposed Plan

### Phase 1: Location Groups (Database + UI Foundation)

**New table: `location_groups`**
```
id, organization_id, name, slug, display_order, created_at
```
Examples: "East Coast", "West Coast", "Franchise Group A"

**New column on `locations`:**
```
location_group_id UUID NULLABLE → references location_groups(id)
```

**UI: Location Group Management**
- Add "Groups" section to the Locations admin page
- Drag-and-drop location assignment to groups
- Group-aware location dropdowns across the platform (grouped `<optgroup>` pattern)

### Phase 2: Per-Location Level Criteria Overrides

Rather than duplicating entire level structures per location (which creates governance chaos), use the **override pattern** already proven in `backroom_settings`:

**New table: `level_criteria_overrides`**
```
id, organization_id, location_id (or location_group_id), stylist_level_id,
criteria_type ('promotion' | 'retention'),
override_field (e.g. 'revenue_threshold', 'retail_pct_threshold'),
override_value NUMERIC,
created_at, updated_by
```

This preserves org-wide defaults while allowing targeted overrides:
- "NYC locations: Senior revenue target = $12K instead of $10K"
- "New markets: evaluation window = 60 days instead of 30"

**Resolution logic:** Location override → Group override → Org default

**UI: Override Editor**
- New "Location Overrides" tab on `StylistLevelsEditor`
- Matrix view: rows = KPIs, columns = locations/groups
- Cells show inherited value (dimmed) or override (bold with reset icon)
- Bulk apply: "Set this override for all locations in [group]"

### Phase 3: Per-Location Commission Rates

**New table: `level_commission_overrides`**
```
id, organization_id, location_id, stylist_level_id,
service_commission_rate NUMERIC, retail_commission_rate NUMERIC,
created_at, updated_by
```

- Org-wide rates remain on `stylist_levels` as defaults
- Location-specific rates override for cost-of-living adjustments
- Scorecard and payroll resolve: location override → org default

### Phase 4: Scoped Peer Averages

**Update `useStylistPeerAverages`:**
- Accept optional `locationId` or `locationGroupId`
- When provided, filter peers to same location/group instead of entire org
- Scorecard shows "vs 4 peers at this location" instead of "vs 12 peers org-wide"

### Phase 5: Group-Aware Location Filter UX

**Update location dropdowns org-wide:**
- When groups exist, render as grouped sections with group headers
- "All Locations" → "All East Coast" → individual locations
- Search/filter within dropdown for 15+ location orgs

---

## Files Changed

| File | Change |
|------|--------|
| **Migration** | Create `location_groups`, add `location_group_id` to `locations`, create `level_criteria_overrides`, `level_commission_overrides` with RLS |
| `src/hooks/useLocations.ts` | Add `location_group_id` to `Location` interface |
| `src/hooks/useLocationGroups.ts` | **New** — CRUD for location groups |
| `src/hooks/useLevelCriteriaOverrides.ts` | **New** — Fetch/upsert per-location criteria overrides |
| `src/hooks/useLevelProgress.ts` | Resolve criteria via override chain (location → group → org) |
| `src/hooks/useTeamLevelProgress.ts` | Same override resolution |
| `src/hooks/useStylistPeerAverages.ts` | Add location/group scoping |
| `src/components/dashboard/StylistScorecard.tsx` | Pass location context to peer averages |
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | Add "Location Overrides" tab |
| `src/components/ui/LocationGroupSelect.tsx` | **New** — Grouped location dropdown component |
| `src/lib/locationFilter.ts` | Add group-aware filtering helpers |

**11 files. 1 migration (4 tables/columns).**

### Priority Recommendation

Phase 1 (Location Groups) and Phase 5 (Grouped UX) are foundational — they unblock everything else and immediately improve the experience for 6+ location orgs. Phases 2-4 layer on top incrementally. I'd recommend starting with Phases 1 + 5 together, then 2, then 3+4.

