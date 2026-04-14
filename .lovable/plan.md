

## Problem

The Settings grid card for terminal/payment hardware is labeled "Zura Pay" but the user wants it renamed to "Point Of Sale."

## Solution

Update the `terminals` entry in `categoriesMap` in `src/pages/dashboard/admin/Settings.tsx`:

- **Label**: `Zura Pay` → `Point Of Sale`
- **Description**: Replace "Zura Pay" references with "Point Of Sale" in the card description

### Files changed
- `src/pages/dashboard/admin/Settings.tsx` — Line 84: Update `label` and `description` for the `terminals` category

