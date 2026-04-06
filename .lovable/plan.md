

# Differentiate Header Row and Left Column from Table Data

## Problem

The top header row and left "Metric" column currently use `bg-card` — the same background as the data cells. This makes them visually blend with the table content instead of reading as distinct label regions.

## Solution

Apply a subtle tinted background (`bg-muted/50`) to all header cells and all sticky left-column cells so they stand out from the white/card-colored data area.

### Changes in `StylistLevelsEditor.tsx`

1. **Header row** (~line 697): Change `bg-card` → `bg-muted/50` on the `TableRow`
2. **"Metric" header cell** (~line 698): Change `bg-card` → `bg-muted/50`
3. **Level header cells** (~line 703): Change `bg-card` → `bg-muted/50`
4. **All sticky left body cells** (metric labels, commission labels, hourly wage — every `sticky left-0 bg-card` cell in the table body): Change `bg-card` → `bg-muted/50`

This keeps section header rows (`Compensation`, `Promotion`, `Retention`) at their existing `bg-muted/50` — they'll now match the column/header tint for visual consistency.

The corner cell (Metric header, sticky both ways at `z-30`) also gets `bg-muted/50`, ensuring it stays opaque and visually grouped with both the header row and the left column.

### Files Modified
- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — ~6 class string updates (`bg-card` → `bg-muted/50` on header and left-column cells)

### No database changes.

