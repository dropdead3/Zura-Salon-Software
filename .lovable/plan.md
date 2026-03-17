

# Fix Large Gap in Build Full Color Catalog Dialog

## Problem
The brand selection list in the "select" phase has `max-h-[400px]` on the `ScrollArea` (line 579), preventing it from filling the `h-[85vh]` dialog. This leaves a large empty gap below the list.

## Fix

**`src/components/platform/backroom/BulkCatalogImport.tsx`**, line 579:

Change:
```
<ScrollArea className="flex-1 min-h-0 max-h-[400px]">
```
To:
```
<ScrollArea className="flex-1 min-h-0">
```

Removing the hard `max-h-[400px]` cap lets the `ScrollArea` grow via `flex-1` to fill all remaining vertical space in the flex column dialog, eliminating the gap while still scrolling when content overflows.

