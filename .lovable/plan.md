

## Gap Analysis: Service Tracking, Pricing & Dock Billing — Pass 5

### Bug 1 (CRITICAL — All Dock Charges Fail): `resolveServiceId` Queries Wrong Table

This is the single biggest remaining bug. It silently breaks **every** Dock charge calculation.

`resolveServiceId` in `useCalculateOverageCharge.ts` (line 32) queries `phorest_services` to resolve a service name to an ID:

```ts
.from('phorest_services').select('id').eq('name', serviceName)
```

But `service_allowance_policies.service_id` has a **foreign key to `services.id`** (the internal platform table, not `phorest_services`). These are completely different tables with different UUIDs. The resolved ID from `phorest_services` will never match any policy's `service_id`.

**Result:** Policy lookup on line 76 (`eq('service_id', resolvedServiceId)`) returns `null` → no policy found → no charge created. This affects every Dock-completed session regardless of billing mode (allowance or P&L).

**Fix:** Change `resolveServiceId` to query the `services` table instead:

```ts
const { data } = await supabase
  .from('services')
  .select('id')
  .eq('name', serviceName)
  .eq('organization_id', organizationId)
  .eq('is_active', true)
  .limit(1)
  .maybeSingle();
```

This matches the table that policies reference (`service_allowance_policies_service_id_fkey → services`).

### Bug 2 (Medium): `handleMarkUnresolved` Only Flags `sessions[0]`

Line 312: `const session = sessions?.[0]` — the "Flag Issue" action only marks the first session as unresolved, even though `handleCompleteSession` was fixed to process all active sessions. Multi-session appointments will only flag one session.

**Fix:** Apply the same pattern as `handleCompleteSession` — iterate all non-terminal sessions.

### Gap 3 (Medium): Duplicate Guard Scope Is Too Broad

The idempotency check (line 61) matches on `mix_session_id` + `appointment_id` but **not** `service_name`. For multi-service appointments where `calculateOverage` is called once per chemical service per session, the first service's charge will succeed, and all subsequent services will be skipped because the guard finds an existing row for that session+appointment combo.

**Fix:** Add `service_name` to the duplicate check:

```ts
.eq('mix_session_id', sessionId)
.eq('appointment_id', appointmentId)
.eq('service_name', serviceName ?? '')
```

### Gap 4 (Low): Session Stats Only Aggregated for First Session

Line 162: `const primarySessionId = sessions?.[0]?.id` feeds `useDockSessionStats`. For multi-session appointments, the completion sheet only shows stats from the first session. Dispensed weight, cost, and bowl count will be incomplete.

**Fix:** Either aggregate stats across all active sessions in `useDockSessionStats` (pass all session IDs), or sum `demoTotalDispensed`/`demoTotalCost` across all sessions in `DockServicesTab`.

### Gap 5 (Low): No Charge Estimate Before Completion

The `DockSessionCompleteSheet` shows charges from `useCheckoutUsageCharges`, but charges are only inserted *during* the completion flow. On first open, the panel is always empty. The user taps "Complete" blind — no preview of what will be charged.

**Enhancement:** Add an inline cost estimate to the completion sheet using the already-available `sessionStats.totalCost` and `backroom_billing_settings.default_product_markup_pct`. Show "Estimated client charge: ~$X.XX" before completion, then replace with actual charges post-completion.

---

### Implementation Order

1. **Fix `resolveServiceId` to query `services` table** — Bug 1 (blocking, zero charges)
2. **Fix duplicate guard to include `service_name`** — Gap 3 (multi-service broken)
3. **Fix `handleMarkUnresolved` for multi-session** — Bug 2
4. **Multi-session stats aggregation** — Gap 4
5. *(Optional)* Pre-completion charge estimate — Gap 5

### Scope
- 2 files modified: `useCalculateOverageCharge.ts`, `DockServicesTab.tsx`
- No database migrations
- No breaking changes to admin-side flow

