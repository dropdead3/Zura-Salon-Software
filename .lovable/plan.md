

## Fix Consistent Dialog Height Across Tabs

### Problem
When switching between tabs (Details, Level Pricing, Stylist Overrides, etc.), the dialog resizes vertically based on each tab's content height, causing a jarring visual shift.

### Solution
Set a fixed minimum height on the scrollable content area so the dialog maintains a consistent size regardless of which tab is active.

### File: `src/components/dashboard/settings/ServiceEditorDialog.tsx`

**Line 165** — Add `min-h-[480px]` to the scrollable content wrapper:
```tsx
// Before
<div className="flex-1 overflow-y-auto mt-4 p-1">

// After
<div className="flex-1 overflow-y-auto mt-4 p-1 min-h-[480px]">
```

This ensures the dialog body stays the same height whether the user is on the dense Details form or a lighter sub-tab like Location Pricing. The `max-h-[85vh]` on the outer `DialogContent` still caps the total height, so nothing overflows on smaller screens.

Single line change, one file.

