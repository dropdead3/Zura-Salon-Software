

## Fix Build Errors — View Query Type Casts

All errors are the identical pattern: queries against `v_all_*` views return `SelectQueryError` because views aren't in the generated types. The fix is casting results with `as any[]` or `as any`.

### Files and Fixes

**1. `src/hooks/useClientTransactionHistory.ts`**
- Line 38: `items` from `v_all_transaction_items` query — already partially cast at line 65/69 but the `items` variable itself is used raw at lines 89-131
- Fix: Cast `items` immediately after query: `const typedItems = (items || []) as any[];` then use `typedItems` in the summary loop (lines 89-131)

**2. `src/hooks/useClientsData.ts`**
- Lines 278-282: `data` from `v_all_clients` query used with spread and property access
- Fix: `return ((data || []) as any[]).map((c: any) => ({ ...c, name: ... }))`

**3. `src/hooks/useDraftAvailabilityCheck.ts`**
- Lines 27, 36-37, 50-51: `existingAppts` from `v_all_appointments` used with `.start_time`/`.end_time`
- Fix: `const existingAppts = (appointments || []) as any[];`

**4. `src/hooks/useHiringCapacity.ts`**
- Lines 139-141: `data` from `v_all_appointments` iterated with `.location_id`
- Fix: `(data as any[] || []).forEach((apt: any) => { ... })`

**5. `src/hooks/useHouseholds.ts`**
- Lines 72, 125, 162, 191, 196, 202: `clients` from `v_all_clients` used in `.map(c => [c.id, c])`
- Fix: Cast all three `clients` results: `(clients as any[] || []).map((c: any) => [c.id, c])`
- Line 156/162: `client` from `.maybeSingle()` — cast as `client as any`

**6. `src/hooks/useKioskCheckin.ts`**
- Lines 104-160: `clients` and `appointments` from view queries accessed with property names
- Fix: Cast `clients` as `(clients as any[] || [])` and map with `(c: any) =>`, same for `appointments`

### No functional changes — only type assertion additions to resolve TS inference on union views.

