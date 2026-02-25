

## Fix: Transaction & Daily Sales Migration (NULL organization_id)

### Root Cause

The migration succeeded for clients (2,586 inserted, 481 updated), services (8 inserted), and appointments (458 inserted). But **transactions (771) and daily sales (172) all failed** with:

```
null value in column "organization_id" of relation "transaction_items" violates not-null constraint
```

The bug is in the location → organization resolution. Both `phorest_transaction_items.location_id` and `phorest_daily_sales_summary.location_id` store **Phorest branch IDs** (e.g., `hYztERWvOdMpLUcvRSNbSA`), not native location IDs (e.g., `north-mesa`). The code does `locationToOrg.get(pt.location_id)` which returns `undefined` because `locationToOrg` is keyed by native IDs.

### Fix (2 lines each, 2 domains)

**Transaction Items (line 584):**
```typescript
// BEFORE:
const orgId = pt.location_id ? locationToOrg.get(pt.location_id) : defaultOrgId;

// AFTER:
const nativeLocationId = pt.location_id ? branchToLocation.get(pt.location_id) || null : null;
const orgId = nativeLocationId ? locationToOrg.get(nativeLocationId) : defaultOrgId;
```
Also change the `location_id` field in the insert object from `pt.location_id` to `nativeLocationId || pt.location_id` and add `|| defaultOrgId` fallback on `orgId`.

**Daily Sales Summary (line 668):**
```typescript
// BEFORE:
const orgId = ps.location_id ? locationToOrg.get(ps.location_id) : defaultOrgId;

// AFTER:
const nativeLocationId = ps.location_id ? branchToLocation.get(ps.location_id) || null : null;
const orgId = nativeLocationId ? locationToOrg.get(nativeLocationId) : defaultOrgId;
```
Same `location_id` and `orgId` fallback fix.

### After Deploying the Fix

Re-run the migration with `{ "dry_run": false }`. The function is idempotent:
- Clients, services, appointments will all be **skipped** (already exist via external_id/phorest_client_id dedup)
- Transactions and daily sales will be **inserted** (none exist yet since they all failed)

### Files Changed

1. `supabase/functions/migrate-phorest-data/index.ts` — Fix location resolution for transactions (lines ~582-594) and daily sales (lines ~666-674)

