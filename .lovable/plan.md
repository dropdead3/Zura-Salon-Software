

# Mix Session Event Stream Architecture

## Current State

The system has: `mix_sessions`, `mix_bowls`, `mix_bowl_lines`, `reweigh_events`, `waste_events`, `client_formula_history`, `backroom_exceptions`, and the inventory ledger (`stock_movements` + `inventory_projections`).

Currently, `MixSessionManager.tsx` is the workflow authority — it directly mutates tables (insert lines, update bowl status, deplete inventory, save formulas) from UI callbacks. There is no event stream. Session history is reconstructed from final table state, not from a sequence of events.

---

## Architecture Overview

```text
iPad UI
  → emitSessionEvent() (client-side service)
  → INSERT into mix_session_events (append-only ledger)
  → DB trigger updates mix_session_projections (read model)
  → On session_completed:
      → Deterministic usage calc → stock_movements INSERT (inventory ledger)
      → Formula extraction → client_formula_history INSERT
      → Exception detection → backroom_exceptions INSERT
      → Analytics snapshot update
```

The existing `mix_sessions`, `mix_bowls`, `mix_bowl_lines`, `reweigh_events`, and `waste_events` tables become the **projection layer** — they remain as-is for fast reads and backward compatibility, but are updated via triggers from the event stream rather than direct UI mutations.

---

## 1. MixSessionEvent Schema (New Table)

```sql
CREATE TABLE public.mix_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mix_session_id UUID NOT NULL REFERENCES mix_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}',
  sequence_number INTEGER NOT NULL,
  source_mode TEXT NOT NULL DEFAULT 'manual',
  device_id UUID,
  station_id UUID,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (mix_session_id, sequence_number),
  UNIQUE (idempotency_key)
);
```

**event_type values:** `session_created`, `session_started`, `bowl_created`, `product_selected`, `weight_captured`, `weight_adjusted`, `line_item_recorded`, `line_item_removed`, `bowl_sealed`, `bowl_discarded`, `reweigh_captured`, `waste_recorded`, `session_awaiting_reweigh`, `session_completed`, `session_marked_unresolved`, `manual_override_used`, `station_changed`, `device_disconnected`, `device_reconnected`, `sync_reconciled`, `prep_mode_enabled`, `prep_approved`

**source_mode values:** `scale`, `manual`, `system`, `offline_sync`

**Immutability:** RLS policies block UPDATE and DELETE.

---

## 2. MixSessionProjection Schema (New Table)

```sql
CREATE TABLE public.mix_session_projections (
  mix_session_id UUID PRIMARY KEY REFERENCES mix_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  current_status TEXT NOT NULL DEFAULT 'draft',
  active_bowl_count INTEGER DEFAULT 0,
  sealed_bowl_count INTEGER DEFAULT 0,
  reweighed_bowl_count INTEGER DEFAULT 0,
  total_line_items INTEGER DEFAULT 0,
  running_dispensed_weight NUMERIC(10,2) DEFAULT 0,
  running_estimated_cost NUMERIC(10,4) DEFAULT 0,
  has_manual_override BOOLEAN DEFAULT false,
  has_device_disconnect BOOLEAN DEFAULT false,
  awaiting_reweigh_count INTEGER DEFAULT 0,
  unresolved_flag BOOLEAN DEFAULT false,
  last_event_sequence INTEGER DEFAULT 0,
  last_event_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

This is a **read-optimized view** rebuilt incrementally by a trigger on `mix_session_events` INSERT. The existing `mix_sessions`, `mix_bowls`, `mix_bowl_lines` tables continue to be populated (via the same trigger or via the service layer) for backward compatibility with all existing queries, hooks, and UI components.

---

## 3. State Machines

### Session Lifecycle
```text
States: draft → active → awaiting_reweigh → completed
                                          → unresolved_exception
        draft → cancelled
        active → cancelled
```

Extends existing `mix_session_status` enum by adding `active` (rename of `mixing`) and `unresolved_exception`.

### Bowl Lifecycle
```text
States: open → sealed → reweighed
        open → discarded
        sealed → discarded
```

No changes needed — existing `mix_bowl_status` enum already covers this.

### Device State (Client-Side Only)
```text
States: disconnected → scanning → pairing → connected
        connected → unstable_reading → stable_reading
        connected → reconnecting → connected
        any → manual_override
```

Already defined in `weight-event-schema.ts` as `ConnectionState`. No DB table needed — this is ephemeral UI state. Device state transitions emit events (`device_disconnected`, `device_reconnected`, `manual_override_used`) into the event stream.

---

## 4. Event Flow Diagrams

### Normal Session
```text
session_created → session_started → bowl_created →
product_selected → weight_captured → line_item_recorded →
product_selected → weight_captured → line_item_recorded →
bowl_sealed → session_awaiting_reweigh →
reweigh_captured → session_completed
```

### Disconnect / Manual Fallback
```text
session_created → session_started → bowl_created →
product_selected → weight_captured → device_disconnected →
manual_override_used → weight_captured → line_item_recorded →
device_reconnected → bowl_sealed →
session_awaiting_reweigh → session_marked_unresolved
```

### Missing Reweigh
```text
session_created → session_started → bowl_created →
line_item_recorded → bowl_sealed →
session_awaiting_reweigh → session_completed
  → system generates backroom_exception (missing_reweigh)
```

### Offline Sync
```text
[Online] session_created → session_started → bowl_created
[Offline] product_selected → weight_captured → line_item_recorded
  (buffered locally with idempotency_key + sequence_number)
[Reconnect] sync_reconciled
  (events replayed with idempotency_key; duplicates ignored via UNIQUE constraint)
```

---

## 5. Event Validation & Sequencing Rules

- `sequence_number` is monotonically increasing per session, enforced by UNIQUE constraint
- Events are validated against current session/bowl state before INSERT (service layer check)
- `idempotency_key` (UUID generated client-side) prevents duplicate events during offline sync
- Only valid event types for current session status are accepted:
  - `draft`: `session_started`, `bowl_created`, `prep_mode_enabled`, `cancelled`
  - `active`: `bowl_created`, `product_selected`, `weight_captured`, `line_item_recorded`, `line_item_removed`, `bowl_sealed`, `bowl_discarded`, `waste_recorded`, `session_awaiting_reweigh`, `station_changed`, `device_*`, `manual_override_used`
  - `awaiting_reweigh`: `reweigh_captured`, `session_completed`, `session_marked_unresolved`

---

## 6. Relationship to Inventory Ledger

```text
mix_session_events (how the bowl was mixed)
  ↓ on session_completed
deterministic usage calculation (mix-calculations.ts)
  ↓
stock_movements INSERT (what stock moved)
  ↓ trigger
inventory_projections UPDATE (current balance)
```

These are **separate systems**. `mix_session_events` never writes to `stock_movements`. Only the completion handler does, after deterministic calculation. This is already how `useDepleteMixSession` works — it reads finalized bowl/line data and inserts into `stock_movements`.

---

## 7. Relationship to Formula History

```text
mix_session_events → session_completed
  ↓
read finalized mix_bowl_lines (projection tables)
  ↓
extractActualFormula() + extractRefinedFormula()
  ↓
client_formula_history INSERT
```

Formulas are only saved from finalized session data, never from draft UI state. This is already the pattern in `MixSessionManager.handleCompleteSession`.

---

## 8. Concurrency & Idempotency Strategy

- **Append-only events**: no read-modify-write; concurrent INSERTs don't conflict
- **Sequence number UNIQUE constraint**: prevents out-of-order or duplicate events at DB level
- **Idempotency key UNIQUE constraint**: offline sync replays are safe — duplicates rejected silently
- **Projection trigger**: atomically updates projection on each event INSERT
- **Existing table updates**: trigger applies event to `mix_sessions`, `mix_bowls`, `mix_bowl_lines` tables so all existing hooks and queries continue working without changes

---

## 9. Client-Side Service Layer

New module: `src/lib/backroom/mix-session-service.ts`

```typescript
// Thin client-side service that:
// 1. Validates event against current state
// 2. Assigns sequence_number + idempotency_key
// 3. INSERTs into mix_session_events
// 4. Falls back to local queue if offline
// 5. Replays queue on reconnect
```

`MixSessionManager` refactored to call `emitSessionEvent()` instead of directly mutating tables. All existing hooks (`useMixBowls`, `useMixBowlLines`, etc.) continue to read from the projection tables unchanged.

---

## 10. Edge Cases

| Case | Handling |
|---|---|
| Two stylists emit events for same session | sequence_number UNIQUE rejects duplicate; last-writer-wins on projection |
| Offline iPad buffers 20 events then syncs | idempotency_key prevents duplicates; events replayed in sequence order |
| Scale disconnects mid-weight | `device_disconnected` event; UI offers manual override |
| Session abandoned (no completion) | Cron/edge function detects sessions in `active` state >24h, creates exception |
| Bowl sealed without lines | `bowl_discarded` event auto-generated (existing pattern) |
| Reweigh never happens | On `session_completed`, if sealed bowls exist without reweigh, exception created |
| Station switched mid-session | `station_changed` event with new station_id in payload |

---

## 11. Risks & Technical Unknowns

| Risk | Mitigation |
|---|---|
| Trigger complexity for projecting events to existing tables | Start with service-layer writes to both event table and existing tables; migrate to trigger-only later |
| Offline sync ordering conflicts | Client assigns sequence_number from local counter; server validates monotonicity |
| Event stream volume | Index on `(mix_session_id, sequence_number)`; partition by month if needed later |
| Backward compatibility during migration | Existing tables remain populated; dual-write during transition |
| BLE scale integration timing | Device state is client-side only; events capture the result, not the BLE protocol |

---

## Implementation Plan (After Approval)

1. **Migration**: Create `mix_session_events` + `mix_session_projections` tables with RLS and immutability policies
2. **Service layer**: Create `mix-session-service.ts` with `emitSessionEvent()`, validation, and sequence management
3. **Refactor MixSessionManager**: Replace direct table mutations with `emitSessionEvent()` calls
4. **Projection trigger**: DB trigger that updates `mix_session_projections` on event INSERT
5. **Dual-write bridge**: Service also writes to existing tables (`mix_bowls`, `mix_bowl_lines`, etc.) for backward compatibility
6. **Offline queue**: LocalStorage-based event buffer with sync-on-reconnect
7. **Exception automation**: On `session_completed` event, auto-generate exceptions for missing reweigh, manual override, device disconnect

