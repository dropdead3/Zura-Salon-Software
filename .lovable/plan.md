

## Gap Analysis: Service Tracking, Pricing & Dock Billing

### Bug 1 (Critical): P&L Handler Queries Non-Existent Column — Zero Charges

`handlePartsAndLabor` in `useCalculateOverageCharge.ts` (line 202) selects `dispensed_weight` from `mix_bowl_lines`. **This column does not exist.** The actual column is `dispensed_quantity` (confirmed in `types.ts` line 10059 and every other query in the codebase).

Result: the query returns rows but `dispensed_weight` resolves to `undefined` on every line → `totalActualUsage` = 0, `dispensed_cost_snapshot` is a per-unit cost not a total → `totalWholesaleCost` is wrong. P&L charges are silently miscalculated.

**Fix:** Change `dispensed_weight` → `dispensed_quantity` in the select and the aggregation loop. Also fix the cost calculation — `dispensed_cost_snapshot` is cost-per-unit, so wholesale cost per line should be `dispensed_quantity × dispensed_cost_snapshot`, not just `dispensed_cost_snapshot` alone (line 231).

### Bug 2 (Critical): P&L Cost Aggregation Is Wrong

Line 231: `const lineCost = line.dispensed_cost_snapshot ?? 0` treats the snapshot as the total line cost. But `dispensed_cost_snapshot` is the **per-unit cost** (wholesale price per gram). The correct formula is:

```
lineCost = dispensed_quantity × dispensed_cost_snapshot
```

Every other cost calculation in the codebase (e.g., `mix-calculations.ts` line 44, `DockLiveDispensing.tsx` line 131) multiplies quantity × cost. This handler does not.

**Fix:** `totalWholesaleCost += (line.dispensed_quantity ?? 0) * (line.dispensed_cost_snapshot ?? 0)`

### Bug 3 (Medium): Multi-Service Appointments Get Single Charge

`handleCompleteSession` in `DockServicesTab.tsx` (line 270–276) passes the full `service_name` string (e.g., "Balayage, Toner, Gloss") to `calculateOverage`. But `resolveServiceId` does a single `eq('name', serviceName)` lookup — it will never match a comma-separated string.

For multi-service appointments, each chemical service may have a different billing mode (one allowance, one P&L). The current flow calculates zero charges for all but an exact single-service name match.

**Fix:** Split the service name string and call `calculateOverage` once per chemical service that has bowls assigned to it (using `service_label` on sessions to match).

### Gap 4 (Medium): Charges Shown After Completion — Timing Issue

`DockSessionCompleteSheet` receives `pendingCharges` from `useCheckoutUsageCharges`, but charges are only *inserted* during the completion flow (step 3). When the sheet opens *before* completion, `pendingCharges` is empty. The charge summary only appears if the user opens the sheet a second time after completing.

**Fix:** Either show an *estimated* charge preview before completion (using `useEstimatedProductCharge` or inline calculation from session stats), or surface the charge summary in a post-completion toast/confirmation rather than the pre-completion sheet.

### Gap 5 (Low): `backroom_billing_settings` Table Availability

Both `handlePartsAndLabor` and `useEstimatedProductCharge` query `backroom_billing_settings` cast as `any`. The table exists in the schema (the hook works), but there is no UI to create the initial row for an organization. If no row exists, markup defaults to 0% — salons would charge wholesale cost to clients.

**Fix:** Ensure the Backroom Billing Settings UI (`useUpsertBackroomBillingSettings`) is accessible from the Backroom Hub, and consider auto-creating a default row (e.g., 40% markup) when an org first enables P&L billing.

### Gap 6 (Low): No Duplicate Charge Guard

If `handleCompleteSession` is called twice (network retry, double-tap), `useCalculateOverageCharge` will insert duplicate charge records. There's no idempotency check on `(mix_session_id, policy_id)`.

**Fix:** Add a check at the top of the mutation: if a `checkout_usage_charges` row already exists for this `mix_session_id` + `policy_id`, skip insertion.

---

### Recommended Implementation Order

1. **Fix column name + cost formula** in `handlePartsAndLabor` — Bugs 1 & 2 (blocking, wrong charges)
2. **Fix multi-service charge calculation** — Bug 3 (incorrect for multi-service appointments)
3. **Add duplicate charge guard** — Gap 6 (data integrity)
4. **Fix charge timing in completion sheet** — Gap 4 (UX)
5. **Ensure billing settings accessibility** — Gap 5 (configuration)

### Scope
- 2 files modified: `useCalculateOverageCharge.ts`, `DockServicesTab.tsx`
- No database migrations
- No breaking changes to admin-side flow

