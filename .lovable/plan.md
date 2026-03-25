

## Fix: Demo Bowl Detail View Should Show Actual Bowl Lines

### Problem
When a demo bowl is created (e.g., via "Mix from History"), the card preview correctly shows the bowl's actual ingredients (4 lines). But tapping into the bowl opens `DockLiveDispensing`, which uses a hardcoded `DEMO_BOWL_LINES` constant with only 2 ingredients. The actual lines from the created bowl are discarded.

### Root Cause
In `DockLiveDispensing.tsx`, the `useBowlLines` hook (line 65) checks `bowlId?.startsWith('demo-')` and immediately returns `DEMO_BOWL_LINES` — a static 2-item array. It has no way to access the actual `DemoBowl.lines` data.

### Solution
Pass the demo bowl's actual lines into `DockLiveDispensing` so they're used instead of the hardcoded fallback.

### Changes

**1. `src/components/dock/mixing/DockLiveDispensing.tsx`**
- Add optional `demoLines?: BowlLine[]` prop to the interface
- In `useBowlLines`, accept `demoLines` param; when `bowlId` starts with `demo-` and `demoLines` is provided, return those instead of `DEMO_BOWL_LINES`
- Keep `DEMO_BOWL_LINES` as fallback for legacy demo bowls without passed lines

**2. `src/components/dock/appointment/DockServicesTab.tsx`**
- When rendering `DockLiveDispensing` for a demo bowl, convert the `DemoBowl.lines` (which are `FormulaLine[]` from the builder) into `BowlLine[]` format and pass as `demoLines`
- Mapping: `product.name` → `product_name_snapshot`, `product.brand` → `brand_snapshot`, `targetWeight * ratio` → `dispensed_quantity`, etc.

### Result
Tapping a demo bowl card will show all the ingredients that were added, matching the preview card exactly.

