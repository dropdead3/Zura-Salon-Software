

# Update Auto-Set Pars Tooltip

## Change

Update the tooltip text in `StockTab.tsx` (line 571) to:
1. Say "30-day" instead of "28-day"
2. Explain what a par level actually is

**File:** `src/components/dashboard/backroom-settings/inventory/StockTab.tsx` (line 570-572)

Replace tooltip content with:
```
A par level is the ideal maximum stock quantity to keep on hand. This tool automatically calculates par levels and reorder points based on your 30-day usage velocity and supplier lead times.
```

Also widen `max-w-[240px]` to `max-w-[300px]` to accommodate the longer text.

**Note:** The underlying calculation uses a 28-day window, but "30-day" is the standard user-facing term. No calculation logic changes needed.

