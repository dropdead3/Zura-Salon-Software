

## Remove Copy Summary & Anchor Save Button

### Changes

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

1. **Remove the Copy Summary button** (lines 1793–1825) — the entire `{grandTotal > 0 && (<Button...Copy Summary</Button>)}` block and its `ClipboardCopy` import if unused elsewhere.

2. **Restructure the right-side column** (lines 1770–1846): Instead of `flex flex-col items-end gap-2`, make the footer a two-row layout:
   - Top row: `flex justify-between` with the left allowance info and the Clear Allowance button (top-right)
   - Bottom row: Save Allowance button anchored to the bottom-right with appropriate padding (`mt-3`, `flex justify-end`)

   The Save button keeps its existing Tooltip wrapper and disabled logic.

### Scope
- Single file, ~35 lines removed/restructured
- No logic changes, just layout cleanup

