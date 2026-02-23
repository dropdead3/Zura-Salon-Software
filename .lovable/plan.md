

## Fix Dropdown Arrow Spacing in Select Filters

### Problem
The chevron (dropdown arrow) icons in the filter SelectTriggers sit too close to the label text ("All Statuses", "All Locations", "All Stylists"). With `w-auto` triggers, `justify-between` has no effect since the container shrinks to fit content, leaving zero gap between text and arrow.

### Solution
Add a consistent left margin to the ChevronDown icon inside the global `SelectTrigger` component. This is a single-line change that fixes all Select dropdowns across the entire application.

### File Changed

**`src/components/ui/select.tsx`** (line 27)

Add `ml-2` (8px left margin) to the ChevronDown icon inside SelectTrigger:

```
Current:  <ChevronDown className="h-4 w-4 opacity-50" />
Updated:  <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
```

This creates proper visual breathing room between the selected value text and the dropdown indicator arrow, matching standard dropdown UX patterns. Since this is the global SelectTrigger component, it fixes spacing everywhere in one change.

