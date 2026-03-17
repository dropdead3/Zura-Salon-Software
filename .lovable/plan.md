

# Replace Browser `confirm()` with In-App Dialog

## Problem
The "Re-analyze all" button uses the native `window.confirm()` call (line 995 in `SupplyLibraryTab.tsx`), which produces an ugly browser-level popup instead of a styled in-app confirmation dialog.

## Change

**File: `src/components/platform/backroom/SupplyLibraryTab.tsx`**

1. Add state for a confirmation dialog: `reanalyzeConfirm` (storing the category + update count, or `null` when closed)
2. Replace the `if (!confirm(...)) return;` call with setting that state to open the dialog
3. Move the actual bulk-update logic into a `handleConfirmReanalyze` callback triggered by the dialog's confirm button
4. Render an `AlertDialog` (from `@/components/ui/alert-dialog`) at the component level with:
   - Title: "Re-analyze Swatches"
   - Description: "Re-analyze {count} swatches in {category}? This overwrites existing assignments."
   - Cancel + Continue buttons

This follows the project's existing pattern of using Radix AlertDialog for destructive confirmations.

