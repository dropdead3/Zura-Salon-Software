

# Simplify Brand Cards

Remove icons/initials, remove category pills, keep product counts, and center brand names vertically within a fixed card height.

## Changes in `SupplyLibraryDialog.tsx` (lines 130–197)

**Remove:**
- Lines 140–149: The logo/initial icon block
- Lines 179–196: The category pills section

**Simplify stats to always show plain text count:**
- Replace the Badge/conditional block (lines 156–177) with a simple `{b.totalProducts} products` span

**Update card layout for centering:**
- Change card classes to use `justify-center` and a fixed `min-h-[120px]` to maintain consistent card size
- Reduce gap since fewer elements remain

Result: Each card shows only the brand name (centered) and product count below it, with consistent sizing.

