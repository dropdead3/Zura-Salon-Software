

# Rename "All Staff" to "All Stylists With Appointments"

## What Changes

Three text updates in `src/components/dashboard/schedule/ScheduleHeader.tsx`:

1. **Button trigger label** (line 342): `'All Staff'` → `'All Stylists'` (keeps the button compact)
2. **Popover "select all" option** (line 361): `All Staff` → `All Stylists`
3. **Toggle label** (line 383): `All Stylists` → `All Stylists With Appointments` — this is the key rename. When the toggle is OFF, only stylists with appointments show. The label should reflect what the filter does.

Actually, looking at the screenshot more carefully: the toggle currently reads "All Stylists" with an OFF state. The user wants the top "All Staff" dropdown option renamed. Let me reconsider the intent:

- **Button trigger** (line 342): `'All Staff'` → `'All Stylists With Appointments'` — but this is too long for the button. Better: keep button as `'All Stylists'` and rename the popover select-all.
- **Popover select-all** (line 361): `All Staff` → `All Stylists With Appointments`
- **Toggle label** stays as-is or gets clarified

Wait — re-reading the user's request: "rename this 'All Staff' to 'All Stylists With Appointments'". They want the dropdown's "All Staff" option renamed.

## Changes

**File:** `src/components/dashboard/schedule/ScheduleHeader.tsx`

| Location | Current | New |
|----------|---------|-----|
| Line 342 (button label when none selected) | `'All Staff'` | `'All Stylists'` |
| Line 361 (popover select-all option) | `All Staff` | `All Stylists With Appointments` |

The button trigger stays shorter (`All Stylists`) for space, while the popover option shows the full label. No other files change.

