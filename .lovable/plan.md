

# Fix Incorrect Product & Brand Count in Supply Library Header

## Problem
The header shows "4246 products across 8 brands" but the actual data is **2,755 products across 27 brands**. Two issues:

1. **Brand count is wrong**: `useSupplyLibraryBrands()` fetches rows with `select('brand')` but hits the default 1,000-row limit, so only brands in the first 1,000 rows appear in the deduplicated set.
2. **Product count was stale** (pre-dedup migration) — the `count: 'exact', head: true` approach is correct but the query cache may not have refreshed.

## Fix

### `useSupplyLibraryBrands()` in `useSupplyLibrary.ts`
The brand list query needs to use `select('brand')` with **no row limit issue**. The simplest fix: add an explicit `.limit(10000)` or, better, use a **distinct RPC / query approach**. Since we already have an RPC (`get_supply_library_brand_summaries`), the cleanest fix is:

- Change the `select('brand')` query to use the existing `get_supply_library_brand_summaries` RPC for the brand list derivation, **or** simply add `.limit(10000)` to the existing query to ensure all rows are fetched.

Given simplicity, I'll add `.limit(10000)` to the brands query in `useSupplyLibraryBrands()`.

### `SupplyLibraryTab.tsx` header (line 703)
No change needed — once the brands query returns all brands, `brands.length` will be correct. The `initStatus.count` uses `head: true` which bypasses row limits and returns accurate totals.

### One-line change
In `useSupplyLibraryBrands()`, add `.limit(10000)` before `.order('brand')` to ensure all product rows are fetched for brand extraction.

