

## Prompt review

Clear and well-scoped — you're stacking two precise improvements on the same selector: (1) searchability and (2) location-aware defaulting. Teaching note: calling out the *fallback* explicitly ("if no preferred location is set, show all") would close the only ambiguity here. I'll assume that fallback by default.

## Diagnosis

`NewClientDialog.tsx` currently renders the Preferred Stylist field as a plain `Select` populated from `useTeamDirectory()` — no search input, no location filter. The dialog already collects `preferred_location` (from `useActiveLocations`) earlier in the form, so the data needed to scope the stylist list is already in form state.

What's missing:
1. A way to filter team members by the location they work at.
2. A search input inside the stylist dropdown.

## Fix

### 1. Swap `Select` → searchable `Combobox` (Popover + Command)
Replace the native-style `Select` for Preferred Stylist with a shadcn `Popover` + `Command` combobox (same pattern used elsewhere in the app for searchable pickers). Structure:
- Trigger: button styled identically to current select (avatar + name when chosen, "None (optional)" placeholder).
- Popover content: `CommandInput` (search) + `CommandList` with `CommandEmpty` + `CommandGroup` of stylists.
- Each `CommandItem` renders the same avatar + name row already in place.
- Always include a "None" item at the top to clear the selection.
- Search matches on `display_name` / `full_name` (case-insensitive, substring).

### 2. Default the list to stylists at the selected preferred location
- Watch the `preferred_location` form field.
- Filter `teamMembers` to those whose `location_ids` (or equivalent assignment field on `employee_profiles`) include the selected location.
- If `preferred_location` is empty/`none` → show all active team members (no filter).
- If the filter yields zero stylists → show empty state inside the combobox: "No stylists at this location" + a small "Show all stylists" toggle that bypasses the filter for this session.

### 3. Reactivity rules
- When `preferred_location` changes and the currently selected `preferred_stylist` no longer works at the new location → clear the stylist selection (and surface a tiny inline helper: "Cleared — previous stylist isn't at this location").
- Keep the avatar + initials fallback already added.

### 4. Discovery step (during implementation)
Confirm exactly which field on `employee_profiles` ties a stylist to a location (likely `location_ids: uuid[]` or a join table). Inspect `useTeamDirectory` and a sample row to lock the filter predicate before wiring it. If it's a join table, extend the hook with a lightweight org-scoped query rather than N+1 lookups.

## Acceptance checks

1. Open Add New Client → Preferred Stylist now opens a popover with a search input at the top.
2. Typing filters the list in real time by name.
3. With a Preferred Location selected, only stylists assigned to that location appear by default.
4. With no Preferred Location selected, all active stylists appear.
5. "None" option is always available at the top to clear the selection.
6. Changing Preferred Location after picking a stylist who doesn't work there clears the stylist field with a subtle helper note.
7. Empty result state offers a "Show all stylists" escape hatch.
8. Avatar + initials fallback continues to render for every item.
9. No regression: form submit still saves `preferred_stylist` correctly.

## Out of scope

- Changing how locations are assigned to staff.
- Adding stylist level/specialty filters.
- Restyling the rest of the Add New Client form.

## Files to touch

- `src/components/dashboard/schedule/NewClientDialog.tsx` — replace `Select` with `Popover + Command` combobox; add location-based filter; add reactive clear-on-location-change effect.
- (Read-only) `src/hooks/useEmployeeProfile.ts` — confirm location field name on the returned team member rows; extend the hook only if needed.

## Further enhancement suggestions

- Show a tiny location chip next to each stylist when "Show all stylists" is toggled on, so the user sees who's off-location.
- Reuse the new searchable stylist combobox in the booking wizard's stylist step for consistency.
- Sort the filtered list by recent assignment frequency or alphabetically — pick one canonically and apply everywhere.

