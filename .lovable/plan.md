

# Terminal Hardware Order — Bug, Gap & Enhancement Audit

## Bugs Found

### 1. Accessories missing on live Stripe API path (Critical)
**File:** `supabase/functions/terminal-hardware-order/index.ts`, lines 109-114

When the Stripe Hardware SKUs API succeeds, the response returns `skus` and `s710_skus` but **never returns `accessories`**. Only the fallback path (line 138-142) includes accessories. The UI reads `skuData?.accessories` which will be `undefined` on the live API path, meaning organizations with API access see no accessory options.

**Fix:** After filtering S710 SKUs from the API response, also filter non-reader products (hub, dock, case) into a separate `accessories` array. Use product name matching to classify.

### 2. React `useEffect` missing dependencies
**File:** `TerminalSettingsContent.tsx`, line 344

The payment verification `useEffect` references `verifyPayment` and `setSearchParams` but they're not in the dependency array. This can cause stale closures.

**Fix:** Add proper deps or wrap in refs.

### 3. Manage Dialog allows invalid status transitions
**File:** `TerminalRequestsTable.tsx`, lines 143-152

The status dropdown shows all 5 statuses regardless of the current status. The backend enforces valid transitions (`pending → approved/denied`, `approved → shipped/denied`, etc.) and will reject invalid ones, but the UI gives no indication of what's allowed.

**Fix:** Filter the status `<Select>` options to only show valid next states based on `request.status`, using the same transition map the backend uses.

## Gaps Found

### 4. Order history rows don't show accessories or pricing
**File:** `TerminalSettingsContent.tsx`, lines 472-501

Each order history row shows "S710 Reader × qty" but never displays accessories or the estimated total, even though the data is now stored.

**Fix:** Show accessories count and `estimated_total_cents` formatted as currency in the order history rows.

### 5. Purchase flow doesn't create a `terminal_hardware_request` record
The `TerminalPurchaseCard` goes directly to Stripe Checkout but never calls `create_request` on `manage-terminal-requests`. This means the platform admin `TerminalRequestsTable` has no visibility into checkout-based orders — only manually submitted requests appear there.

**Fix:** Before redirecting to checkout, create a `terminal_hardware_request` with status `pending` and persist `device_type`, `accessories`, and `estimated_total_cents`. After successful payment verification, update the request status to `approved`/`shipped`.

### 6. Fallback CDN image URLs may not be publicly accessible
The `b.stripecdn.com/terminal-ui-resources/...` URLs are Stripe's internal CDN. These may return 403 for unauthenticated requests.

**Fix:** Add `onError` handlers on all `<img>` tags to fall back to the `<Smartphone>` / `<Package>` icon if the image fails to load. Already partially done but should be explicit with an error state.

## Enhancements

### 7. Accessories quantity selector
Currently accessories toggle on/off with quantity locked at 1. For hub/dock/case, quantity should match reader quantity or be independently selectable (e.g., 3 readers + 3 docks).

**Fix:** Add a small quantity stepper (1-5) for each selected accessory in the purchase dialog.

### 8. Platform admin revenue summary
The `TerminalRequestsTable` shows individual request totals but has no aggregate view.

**Fix:** Add a summary row or header stat showing total estimated revenue across filtered requests.

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/terminal-hardware-order/index.ts` | Extract accessories from API response; fix live path |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Fix useEffect deps; add img onError; show accessories in history; create request before checkout; accessory qty stepper |
| `src/components/platform/stripe/TerminalRequestsTable.tsx` | Filter status dropdown to valid transitions; add revenue summary |

3 files, 0 migrations, 0 new dependencies.

