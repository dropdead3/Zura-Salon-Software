

## Remove Category/Type Info from Untracked Service Dropdown

### Problem
When a service has tracking toggled off, expanding it shows a "Category: Blonding / Type: Standard" line that adds no value — the user already sees the category from the group header and the type isn't actionable here.

### Change

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**Lines 1104–1114** — Remove the Category/Type metadata block from the untracked service drill-down. Keep the "Mark Configured" footer (lines 1115+) and the chemical suggestion warning. Specifically:

- Delete the outer `<div className="flex items-center justify-between">` wrapper and its contents (the Category/Type spans)
- Preserve the amber chemical suggestion warning (`"This service appears to use chemicals..."`) but move it outside the deleted block, directly into the `<div className="space-y-3">` parent
- The result: expanding an untracked service shows only the chemical suggestion (when applicable) and the "Mark as reviewed" footer — no redundant metadata

### Result
Cleaner untracked service expansion — no redundant category/type info that's already visible from the group header.

