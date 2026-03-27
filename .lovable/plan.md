

## Align "Tracked" Column Header with Toggle & Rename

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

1. **Rename header** (line ~720): Change `Tracked` to `Enable Product Billing`
2. **Right-align header text** to match the toggle's `justify-end` alignment in the cell (line ~870): Add `text-right` to the `TableHead`
3. The cell content already uses `flex justify-end` (line ~870), so the toggle is right-aligned — the header just needs to match

### Result
- Column header reads "Enable Product Billing" instead of "Tracked"
- Header text is right-aligned, visually aligned with the Switch toggle below it

