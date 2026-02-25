

## Fix: Toggles Only Respond to Direct Switch Clicks

### Problem
The "Extensions Certified" label uses `htmlFor="extensions_certified"` which links it to the Switch's `id="extensions_certified"`. This causes clicking anywhere on the label text to toggle the switch -- not just clicking the switch itself.

### Change

**File: `src/pages/dashboard/MyProfile.tsx`**

1. **Line 1247**: Remove `htmlFor="extensions_certified"` and `cursor-pointer` from the Label
2. **Line 1260**: Remove `id="extensions_certified"` from the Switch

This is the only toggle on the page with this `htmlFor` linkage. The other Switch components (On-Site Staff, I Also Perform Services, Request Homepage Visibility, Currently Booking) don't use `htmlFor` so they already only respond to direct clicks.

