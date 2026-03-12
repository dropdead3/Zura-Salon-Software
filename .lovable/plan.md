

# Scalable Inventory Leads Card

## Problem

The current design renders one full-height row per location. With dozens or hundreds of locations, the card becomes extremely long and pushes all other content down.

## Solution

Replace the unbounded vertical list with a **compact table inside a ScrollArea** capped at ~320px height, plus a search/filter input for quick lookup.

### Design

- Add a search input at the top of `CardContent` to filter locations by name.
- Wrap the location rows in a `ScrollArea` with `max-h-[320px]` (~6-7 visible rows). Scrollbar appears when content exceeds this.
- Make rows more compact: reduce vertical padding from `py-3.5` to `py-2.5`, tighten the overall row height.
- Show a summary line in the card header: "X of Y locations assigned" as a subtle status indicator.

### Changes — single file: `InventoryLeadAssignmentCard.tsx`

1. **Add state** for search filter (`useState<string>('')`).
2. **Filter locations** by search term before mapping.
3. **Add search input** at top of `CardContent`:
   ```tsx
   <div className="relative">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
     <Input placeholder="Search locations…" value={search} onChange={…} className="pl-9 h-8 text-xs" />
   </div>
   ```
4. **Wrap location rows** in `<ScrollArea className="max-h-[320px]">`.
5. **Add coverage count** next to card description: `"{assigned}/{total} locations covered"`.
6. **Reduce row padding** to `py-2.5` for density.

| File | Action |
|---|---|
| `InventoryLeadAssignmentCard.tsx` | Add search, ScrollArea cap, coverage count, compact rows |

