

## Prompt review

Sharp bug report — names the surface (stylist-first picker), the symptom (all stylists across org), the expected scope (current location only), and the active context (North Mesa). Sharper next time: tell me whether the same scoping should apply when the calendar is in **multi-location view** (e.g., "All Locations") — does it then show all, or still filter? I'll propose: respect whatever the calendar is currently showing.

## Diagnosis

Two stylist lists exist in `QuickBookingPopover`:

1. **`filteredStylists`** (service-first flow) — already filtered by `selectedLocationId` because availability is location-scoped
2. **`uniqueAllStylists`** (stylist-first flow, the one shown in the screenshot) — built from `v_calendar_stylists` but **not filtered by the current calendar location**, so it returns every stylist in the org

The screenshot confirms it: "ALL STYLISTS" header with Sarina, Chelsea, Savannah, Kitty, Leslei, Kylie, Alexis — that's the org-wide roster, not North Mesa's 7.

Root cause: when stylist-first mode kicks in (either user-initiated or via Wave 22.1's column-click auto-activation), the query that hydrates `uniqueAllStylists` doesn't apply `.eq('location_id', currentLocationId)`. After Wave 22's view fix, that filter would now correctly return all 7 North Mesa stylists (including Jamie + Lex via the exploded `location_ids`).

## Plan — Wave 22.3: Scope stylist-first picker to current location

### Behavior

- When calendar is viewing a **single location** (e.g., North Mesa) → "All Stylists" list shows only stylists assigned to that location (via the exploded `v_calendar_stylists` view)
- When calendar is in **multi-location / "All" view** → list shows all stylists across the visible locations (current behavior preserved for that case)
- Header label adapts: `"ALL STYLISTS"` → `"STYLISTS AT NORTH MESA"` when location-scoped, so staff understand the filter

### Fix shape

In `src/components/dashboard/schedule/QuickBookingPopover.tsx`:

1. **Locate the query/memo** that builds `uniqueAllStylists` from `v_calendar_stylists` (or wherever the org-wide list comes from)
2. **Apply location filter** when `selectedLocationId` (or the calendar's active location) is a single ID:
   ```ts
   const scopedStylists = useMemo(() => {
     if (!currentLocationId || currentLocationId === 'all') return uniqueAllStylists;
     return uniqueAllStylists.filter(s => s.location_id === currentLocationId);
   }, [uniqueAllStylists, currentLocationId]);
   ```
3. **Deduplicate by `user_id`** after filtering (a stylist exploded across multiple locations would otherwise still be unique here since we filter to one location, but keep the `dedupeBy(user_id)` guard for the "all" case)
4. **Update the header label** in the stylist-first step to reflect scope:
   ```tsx
   {currentLocationId && currentLocationId !== 'all'
     ? `STYLISTS AT ${locationName.toUpperCase()}`
     : 'ALL STYLISTS'}
   ```
5. **Empty state**: if zero stylists match, show "No stylists assigned to {locationName}. Add one in Operations Hub → Team."

### Files to read first

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — find the `uniqueAllStylists` source (around the stylist-first mode section)
- `src/pages/dashboard/Schedule.tsx` — confirm how the active calendar location is exposed and how it propagates into the popover (likely via `defaultLocationId` or a prop already wired)

### Acceptance checks

1. Calendar pinned to North Mesa → click empty cell to open new booking → "All Stylists" shows only the 7 North Mesa stylists (post-Wave 22 view fix)
2. Header reads "STYLISTS AT NORTH MESA" (not "ALL STYLISTS")
3. Switch calendar to Val Vista Lakes → reopen booking → list shows the 14 VVL stylists (including Eric)
4. Calendar in "All Locations" view → list shows org-wide roster, header reads "ALL STYLISTS"
5. Sort dropdown (Wave 22.2) still works against the scoped list
6. Wave 22.1 column-click auto-skip still works (Jamie preselected, picker bypassed)
7. No regression to service-first flow (`filteredStylists` already location-scoped via availability)

### Files

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — scope `uniqueAllStylists` by current location, update header label, empty state

### Deferred

- **P2** Show a "Working at: North Mesa, Val Vista Lakes" subtext on multi-location stylist cards so staff know that stylist also works elsewhere — trigger: when staff confusion arises about where a stylist is "based"
- **P2** Toggle inside the picker: "Show stylists from all locations" for edge cases where staff want to book a visiting stylist — trigger: when a multi-location org requests cross-booking workflows

