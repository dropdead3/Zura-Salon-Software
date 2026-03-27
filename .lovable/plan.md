

## Fix: P&L Charge Calculation Queries Non-Existent Column + Remaining Gaps

### Bug 1 (CRITICAL — Charges Silently Fail): P&L Handler Queries Wrong Table/Column

`handlePartsAndLabor` in `useCalculateOverageCharge.ts` (line 214) queries:
```ts
.from('mix_bowl_lines').eq('mix_session_id', sessionId)
```

**`mix_bowl_lines` has no `mix_session_id` column.** It only has `bowl_id`. This query returns zero rows (or errors silently via the `as any` cast), producing $0.00 charges for every Parts & Labor session.

Every other query in the codebase correctly joins through `mix_bowls` first:
- `MixSessionManager.tsx` → gets bowl IDs from `mix_bowls`, then queries `mix_bowl_lines` by `bowl_id`
- `DockLiveDispensing.tsx` → queries `mix_bowl_lines` by `bowl_id`
- `useUsageVariance.ts` → same pattern

**Fix:** Two-step query:
1. Get bowl IDs: `mix_bowls` where `mix_session_id = sessionId` and `status != 'discarded'`
2. Get lines: `mix_bowl_lines` where `bowl_id in bowlIds`

### Bug 2 (Medium): Allowance Mode Also Ignores Discarded Bowl Lines

The allowance handler (line 142) correctly filters `mix_bowls` by `neq('status', 'discarded')`, but uses `net_usage_weight` from the bowl-level aggregate. This is fine — but if a bowl is partially discarded, individual lines from that bowl still count. Consistent with existing behavior, no change needed here.

### Gap 3 (Medium): Completion Flow Only Processes `sessions[0]`

`handleCompleteSession` (line 250) only completes `sessions?.[0]`. Multi-bowl appointments create multiple sessions (one per bowl group). If an appointment has 3 bowls across 2 sessions, only the first session gets completed, depleted, and charged. The second session's bowls are orphaned.

**Fix:** Iterate all non-terminal sessions and run the complete → deplete → charge chain for each.

### Gap 4 (Low): Charge Timing — Sheet Shows Empty on First Open

The `DockSessionCompleteSheet` maps `existingCharges` from `useCheckoutUsageCharges`. But charges are created *during* the `onComplete` callback (step 3 of the chain). When the sheet first opens, no charges exist yet. The user sees an empty charges panel, presses "Complete", charges are created, but the sheet closes immediately.

**Fix:** After the completion chain succeeds, briefly show a post-completion confirmation with the calculated charges (either keep the sheet open and refetch, or show a toast with the charge total).

### Gap 5 (Low): `as any` Casts Hide Type Errors

The `handlePartsAndLabor` function casts `mix_bowl_lines` queries as `any`, which is exactly what allowed Bug 1 to go undetected. After fixing the query path, remove the `as any` cast on the table name and use the typed schema.

---

### Implementation

**File: `src/hooks/billing/useCalculateOverageCharge.ts`**

Replace the P&L handler's single query with the correct two-step join:

```ts
// 1. Get non-discarded bowl IDs for this session
const { data: bowls } = await supabase
  .from('mix_bowls')
  .select('id')
  .eq('mix_session_id', sessionId)
  .neq('status', 'discarded');

const bowlIds = (bowls ?? []).map(b => b.id);
if (bowlIds.length === 0) return zeroResult;

// 2. Get lines from those bowls
const { data: bowlLines, error: lineErr } = await supabase
  .from('mix_bowl_lines')
  .select('dispensed_quantity, product_id, dispensed_cost_snapshot')
  .in('bowl_id', bowlIds);
```

Remove the `as any` cast on the table name since `mix_bowl_lines` is in the typed schema.

**File: `src/components/dock/appointment/DockServicesTab.tsx`**

Update `handleCompleteSession` to process all non-terminal sessions:

```ts
const activeSessions = (sessions ?? []).filter(
  s => !isTerminalSessionStatus(s.status as any)
);

for (const session of activeSessions) {
  await completeSession.mutateAsync({ sessionId: session.id, ... });
  await depleteInventory.mutateAsync({ sessionId: session.id, ... });
  for (const svcName of serviceNames) {
    await calculateOverage.mutateAsync({ sessionId: session.id, ... });
  }
}
```

After the loop completes successfully, invalidate `checkout-usage-charges` to refresh the charge display.

### Scope
- 2 files modified
- No database changes
- Fixes a silent $0.00 charge bug affecting all P&L sessions

