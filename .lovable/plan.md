

# Fix Misleading "Sync Library" Tooltip

## Problem
The "Sync Library" button tooltip says "Fetches the latest product data from Phorest and updates your library." This is incorrect on two levels:
1. The Supply Library is a **platform-level** feature — Phorest is an org-level POS integration for one specific tenant
2. The actual sync logic (`useSyncSupplyLibrary`) syncs against a **static data file**, not Phorest at all

## Fix

**`src/components/platform/backroom/SupplyLibraryTab.tsx`**, line 731:

Change the tooltip text from:
> "Fetches the latest product data from Phorest and updates your library."

To:
> "Syncs the library with the latest product catalog data, inserting any missing products and backfilling metadata."

One line change. No logic changes needed.

