

# Source of Truth Verification Report — Zura Backroom

## 1. Event Streams Identified

| Stream | Table | Role |
|---|---|---|
| **MixSessionEvent** | `mix_session_events` | Append-only mixing workflow history |
| **InventoryLedgerEntry** | `stock_movements` | Append-only inventory movement history |
| **CommandAuditLog** | `command_audit_log` | Append-only command execution history |
| **OperationalTaskHistory** | `operational_task_history` | Append-only task lifecycle audit trail |

## 2. Projection Tables Identified

| Projection | Purpose | Rebuildable? |
|---|---|---|
| `mix_session_projections` | Derived session state from events | Yes — `rebuild_mix_session_projection` RPC exists |
| `mix_bowl_projections` | Derived bowl state from events | Yes — via same event replay mechanism |
| `inventory_projections` | Derived stock balances from `stock_movements` | Yes — `rebuild_inventory_projection` RPC exists |
| `products.quantity_on_hand` | Cached aggregate from `inventory_projections` | Yes — recomputed by DB trigger on `stock_movements` insert |
| `checkout_usage_projections` | Billing charge projections | Partially — derived from session data but written directly by `AllowanceBillingService` |
| `backroom_analytics_snapshots` | Reporting aggregates | No rebuild mechanism — snapshot-based, acceptable |
| `service_profitability_snapshots` | Reporting | Same as above |
| `staff_backroom_performance` | Reporting | Same as above |

## 3. VIOLATIONS FOUND

### CRITICAL: Direct mutation of operational tables bypassing event stream and command layer

**Violation 1 — `useMixBowls.ts` directly inserts/updates `mix_bowls`**
- `useCreateBowl()` inserts directly into `mix_bowls` via `supabase.from('mix_bowls').insert()`
- `useUpdateBowlStatus()` updates `mix_bowls` directly via `supabase.from('mix_bowls').update()`
- These bypass the event stream entirely. No `mix_session_event` is emitted for bowl creation or status change when these hooks are used.

**Violation 2 — `useMixBowlLines.ts` directly inserts/updates/deletes `mix_bowl_lines`**
- `useAddBowlLine()` inserts directly into `mix_bowl_lines`
- `useUpdateBowlLine()` updates `mix_bowl_lines` directly
- `useDeleteBowlLine()` deletes from `mix_bowl_lines` directly
- No events emitted. These are direct DB mutations from the UI layer.

**Violation 3 — `useMixSession.ts` directly inserts/updates `mix_sessions`**
- `useCreateMixSession()` inserts into `mix_sessions` directly
- `useUpdateMixSessionStatus()` updates `mix_sessions.status` directly without emitting a `mix_session_event`

**Violation 4 — `MixSessionManager.tsx` directly updates `mix_sessions`**
- Lines 98-100: directly updates `is_prep_mode`
- Lines 208-210: directly updates `confidence_score`
- Lines 495-498: directly updates `prep_approved_by`
- UI component directly mutating operational state.

**Violation 5 — `usePurchaseOrders.ts` directly inserts into `stock_movements`**
- Lines 159-170: The `quickReceive` mutation writes directly to `stock_movements`, bypassing `InventoryLedgerService` and the command layer.

**Violation 6 — `useMixBowlLines.ts` `syncBowlTotals()` directly updates `mix_bowls`**
- After line operations, this function recalculates and directly writes `total_dispensed_weight` and `total_dispensed_cost` to `mix_bowls`. This treats `mix_bowls` as a mutable projection updated outside the event stream.

### Summary: 6 violations across 5 files

The command layer (`mixing-commands.ts`) correctly emits events via `emitSessionEvent()`, but the **original CRUD hooks still exist and are still used by UI components**. The old hooks were never removed or redirected through the command layer.

## 4. Event Immutability

- **MixSessionEvents**: Append-only. No update operations found against `mix_session_events`. Corrections use compensating events. CONFIRMED IMMUTABLE.
- **stock_movements**: Append-only. No update or delete operations found. CONFIRMED IMMUTABLE.
- **command_audit_log**: Append-only. Insert-only RLS. CONFIRMED IMMUTABLE.

## 5. Event Ordering and Sequencing

| Mechanism | Details |
|---|---|
| `sequence_number` | Per-session monotonic counter in `mix_session_events` |
| `idempotency_key` | UUID per event, UNIQUE constraint on `mix_session_events` |
| `created_at` | Timestamp on all events |
| `source_mode` | Tracks origin: `scale`, `manual`, `system`, `offline_sync` |
| `device_id` | Captures source device |
| `CommandMeta.idempotency_key` | Client-generated UUID per command |

CONFIRMED: Sequencing strategy is sound.

## 6. Idempotency Safeguards

- `mix_session_events`: UNIQUE constraint on `idempotency_key`. Duplicate inserts return 23505 error, handled gracefully in `emitSessionEvent()`.
- `stock_movements`: Uses `reference_type` + `reference_id` for logical dedup (not enforced by DB constraint — **risk**: duplicate ledger entries possible on retry).
- `command_audit_log`: Records every command attempt with `idempotency_key`.
- Offline queue: Uses `idempotency_key` for safe replay.

**Risk**: `stock_movements` has no DB-level unique constraint for dedup. A retried `postUsageFromSession()` call could insert duplicate usage entries.

## 7. Inventory Ledger Enforcement

`InventoryLedgerService` is the sole service-layer owner of `stock_movements` writes. The DB trigger `update_projection_on_ledger_insert()` handles projection sync automatically.

**However**: `usePurchaseOrders.ts` bypasses the service and writes directly to `stock_movements` (Violation 5).

## 8. Recommended Corrections

### Phase 1: Eliminate direct-mutation hooks (CRITICAL)

These hooks must be refactored to route through the command layer:

1. **`useMixBowls.ts`** — `useCreateBowl()` and `useUpdateBowlStatus()` must call `executeCreateBowl()` and `executeSealBowl()`/related commands instead of writing to `mix_bowls` directly.

2. **`useMixBowlLines.ts`** — `useAddBowlLine()`, `useUpdateBowlLine()`, `useDeleteBowlLine()` must call `executeRecordLineItem()` and `executeRemoveLineItem()` commands. The `syncBowlTotals()` function must be replaced by event-driven projection updates.

3. **`useMixSession.ts`** — `useCreateMixSession()` should emit a `session_created` event. `useUpdateMixSessionStatus()` must call the appropriate command handler (e.g., `executeCompleteSession()`).

4. **`MixSessionManager.tsx`** — All three direct `mix_sessions` updates must route through the command/event layer (emit `prep_mode_enabled`, `prep_approved`, and store `confidence_score` in event payload).

5. **`usePurchaseOrders.ts`** — The `quickReceive` mutation must call `PurchasingService.receiveShipment()` or `InventoryLedgerService.postReceiving()` instead of writing to `stock_movements` directly.

### Phase 2: Add dedup constraint to `stock_movements`

Add a unique constraint or dedup check on `(reference_type, reference_id, product_id, event_type)` to prevent duplicate ledger entries on retry.

### Phase 3: Add missing projection rebuilds

- `checkout_usage_projections` — add a rebuild function that recomputes from session event data
- Bowl projections — ensure `mix_bowl_projections` can be fully rebuilt from `mix_session_events` without relying on `mix_bowls` table state

### Phase 4: Clarify dual-write strategy

The `mix_sessions`, `mix_bowls`, and `mix_bowl_lines` tables currently serve as BOTH operational truth AND working state. The architecture comment in `mix-session-service.ts` mentions "dual-write for backward compatibility." This must be resolved:
- Either these tables become pure projections (rebuilt from events)
- Or the event stream is the write path and these tables are updated only by DB triggers on `mix_session_events`

Currently they are being written from two separate paths (old hooks + event stream), creating split-brain risk.

## 9. Architecture Risk Summary

| Risk | Severity | Status |
|---|---|---|
| Old CRUD hooks bypass event stream | CRITICAL | 6 violations found |
| `stock_movements` lacks dedup constraint | HIGH | Retry could create duplicates |
| `mix_sessions`/`mix_bowls` dual-write split-brain | HIGH | Two write paths exist |
| Analytics snapshots not rebuildable | LOW | Acceptable for reporting snapshots |
| `checkout_usage_projections` not rebuildable | MEDIUM | No replay mechanism |

## 10. Verdict

The **service layer and command layer** are correctly architected — they enforce event-sourced truth. However, the **original CRUD hooks have not been removed or redirected**, so UI components can still bypass the entire command/validation/event pipeline. This is the primary architectural violation that must be corrected before the system can be considered event-sourced.

