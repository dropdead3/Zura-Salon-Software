

# Fix: Bulk Catalog Import Timeouts

## Root Cause

The `bulk-catalog-import` edge function processes 5 brands per batch, calling `generate-color-catalog` sequentially for each. Each brand takes 30-90 seconds of AI generation time, meaning a single batch takes 2.5-7+ minutes — well beyond the edge function's ~150s wall-clock timeout. The client gets "Failed to fetch" because the connection drops.

## Solution: Process One Brand Per Edge Function Call

Move the batching loop to the **client side**. Instead of sending 5 brands in one request, the UI calls `generate-color-catalog` directly for each brand individually, then does a single bulk insert of the results.

### Changes

**`BulkCatalogImport.tsx` — Rewrite `handleGenerate`:**
- Loop through selected brands one at a time on the client
- For each brand, call `generate-color-catalog` directly (not `bulk-catalog-import`) — this keeps each call to one AI generation (~30-60s, well within timeout)
- Update the results state after each brand completes, giving real-time progress
- Store the returned products in local state for the review phase

**`BulkCatalogImport.tsx` — Rewrite `handleConfirmImport`:**
- Instead of re-generating via `bulk-catalog-import`, send the already-generated products directly to a simpler insert endpoint
- Create a lightweight `bulk-catalog-insert` call pattern: just take the products array from the review phase and insert them in chunks via `supabase.from('supply_library_products').insert()`
- This can be done directly from the client using the Supabase SDK (the user is authenticated as admin)

**`bulk-catalog-import/index.ts` — Simplify to insert-only:**
- Remove the generate-color-catalog call loop
- Accept pre-generated products array and just handle dedup + insert
- This makes it a fast, lightweight operation that won't timeout

### Flow After Fix

```text
Client (BulkCatalogImport)
  ├─ For each brand (sequentially):
  │   └─ POST generate-color-catalog { brand, is_professional, verify_url }
  │       └─ ~30-60s per brand (within timeout)
  │       └─ Update UI with results
  ├─ Show review screen with all generated products
  └─ On confirm:
      └─ POST bulk-catalog-import { products: [...], dry_run: false }
          └─ Just inserts, no AI calls, fast
```

### Files Changed

| File | Change |
|------|--------|
| `src/components/platform/backroom/BulkCatalogImport.tsx` | Process brands individually from client, store products locally, simplified import phase |
| `supabase/functions/bulk-catalog-import/index.ts` | Accept pre-generated products for insert-only mode |

