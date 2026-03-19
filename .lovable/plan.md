

# Fix Inventory Tab Bar Width

## Problem
The `TabsList` has `w-full` causing it to stretch across the entire page width, which looks oversized for only 6 tabs.

## Fix — `BackroomInventorySection.tsx` (line 114)

Remove `w-full` from the `TabsList` className so it only takes up the width of its content:

```tsx
// From:
<TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap gap-0.5">

// To:
<TabsList className="justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap gap-0.5">
```

Single line change. The `TabsList` will shrink to fit its tab buttons.

