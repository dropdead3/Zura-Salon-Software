

# Add Tooltips to Supply Library Action Buttons

## Changes in `SupplyLibraryTab.tsx`

Wrap three buttons with `Tooltip` / `TooltipTrigger` / `TooltipContent` (already imported):

### 1. Sync Library button (~line 716)
Wrap in tooltip with description: **"Fetches the latest product data from Phorest and updates your library."**

### 2. Auto-assign swatches button (~line 1419)
Wrap in tooltip with description: **"Automatically assigns swatch colors to products based on their shade name and level."**

### 3. Re-analyze button (~line 1429)
Wrap in tooltip with description: **"Re-runs the swatch color analysis for all products in this category. Overwrites existing assignments."**

All tooltips use `side="bottom"` for consistency with the toolbar placement.

