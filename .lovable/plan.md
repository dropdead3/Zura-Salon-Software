

# Single Location UX Improvement

When an organization has only one location, the current UI still shows the full "Select Locations" card with a checkbox, "Deselect All" toggle, and the `1 location selected` summary — all unnecessary friction for a single-location business.

## Current behavior
- Full location selector card renders even with 1 location
- User can deselect their only location (leaving 0 selected, breaking the flow)
- "Select All / Deselect All" button is meaningless with 1 item

## Proposed changes (`BackroomPaywall.tsx`)

### Location selector section (~line 727–801)
- **If `activeLocations.length === 1`**: Auto-select that location (ensure it's always in `selectedLocationIds`), and render a simplified read-only row showing the location name, city, and `$20/mo` — no checkbox, no Select All button, no deselect capability.
- **If `activeLocations.length > 1`**: Keep the current multi-select UI as-is.

### Auto-select logic (~initialization / useEffect)
- When `activeLocations` resolves to exactly 1 entry, force `selectedLocationIds` to contain that single ID so the calculator and checkout always have it selected. Prevent the user from toggling it off.

### Confirmation dialog
- No changes needed — it already renders `locationCount` dynamically.

