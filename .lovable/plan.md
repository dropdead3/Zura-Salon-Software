

# Zura Backroom — Phase 1 Architecture (Current State)

Phase 1 is **already built and deployed**. This document records the architecture as implemented.

---

## Entity Relationship Diagram

```text
organizations
  |
  +-- backroom_stations (org_id, location_id, station_name, device/scale refs)
  |     |
  |     +-- backroom_devices (org_id, paired_station_id, device_type, serial)
  |
  +-- mix_sessions (org_id, appointment_id, appt_service_id, client_id, staff x2, station_id)
  |     |
  |     +-- mix_bowls (session_id, bowl_number, status, weight/cost totals)
  |     |     |
  |     |     +-- mix_bowl_lines (bowl_id, product_id, qty, cost_snapshot, captured_via)
  |     |
  |     +-- reweigh_events (bowl_id, session_id, leftover_qty, captured_via, staff_id)
  |     |
  |     +-- waste_events (session_id, bowl_id?, category, qty, product_id?)
  |
  +-- client_formula_history (org_id, client_id, session_id, formula_type, formula_data JSONB)
```

Key relationships:
- `mix_sessions` links to `appointments` (1:N per appointment, unique constraint prevents concurrent active sessions per appointment_service)
- `mix_bowls` cascade-deletes with session
- `mix_bowl_lines` reference `products` table (SET NULL on delete) and snapshot cost at dispense time
- `reweigh_events` are append-only per bowl
- `client_formula_history` stores both `actual` and `refined` formula types as JSONB arrays

---

## Schema (8 tables — migration `20260312080927`)

| Table | Key Columns | RLS | Realtime |
|---|---|---|---|
| `backroom_stations` | org_id, location_id, station_name, assigned_device_id, assigned_scale_id, is_active | org_member (SELECT), org_admin (ALL) | No |
| `backroom_devices` | org_id, location_id, device_type, device_name, serial_number, connection_type, is_paired, paired_station_id | org_member (SELECT), org_admin (ALL) | No |
| `mix_sessions` | org_id, appointment_id, appointment_service_id, client_id, mixed_by_staff_id, service_performed_by_staff_id, station_id, status (enum), is_manual_override, unresolved_flag | org_member (SELECT/INSERT/UPDATE) | Yes |
| `mix_bowls` | mix_session_id, bowl_number, status (enum), total_dispensed_weight, total_dispensed_cost, leftover_weight, net_usage_weight | via session org_member | Yes |
| `mix_bowl_lines` | bowl_id, product_id, product_name_snapshot, brand_snapshot, dispensed_quantity, dispensed_unit, dispensed_cost_snapshot, captured_via, sequence_order | via bowl→session org_member (SELECT/INSERT/UPDATE/DELETE) | No |
| `reweigh_events` | bowl_id, mix_session_id, leftover_quantity, leftover_unit, captured_via, weighed_by_staff_id, weighed_at | via session org_member (SELECT/INSERT) | No |
| `waste_events` | mix_session_id, bowl_id (nullable), waste_category (enum), quantity, unit, product_id (nullable), recorded_by_staff_id | via session org_member (SELECT/INSERT) | No |
| `client_formula_history` | org_id, client_id, appointment_id, mix_session_id, formula_type (enum), formula_data (JSONB), staff_id, staff_name, version_number | org_member (SELECT/INSERT) | No |

Enums: `mix_session_status`, `mix_bowl_status`, `waste_category`, `formula_type`

---

## Service Boundaries

| Module | Location | Responsibility |
|---|---|---|
| **Deterministic calculations** | `src/lib/backroom/mix-calculations.ts` | Net usage, bowl cost, session totals, formula extraction (actual + refined). No AI. |
| **Session state machine** | `src/lib/backroom/session-state-machine.ts` | Enforces `draft → mixing → pending_reweigh → completed`, `draft|mixing → cancelled` |
| **Bowl state machine** | `src/lib/backroom/bowl-state-machine.ts` | Enforces `open → sealed → reweighed`, `open|sealed → discarded` |
| **Scale adapter** | `src/lib/backroom/scale-adapter.ts` | `ScaleAdapter` interface + `ManualScaleAdapter`. Factory returns manual-only in Phase 1. |
| **Weight event schema** | `src/lib/backroom/weight-event-schema.ts` | Normalized `WeightEvent` type with 8 connection states |
| **Data hooks** | `src/hooks/backroom/` (7 files) | CRUD + state transitions for sessions, bowls, lines, reweigh, waste, formulas, stations |
| **UI components** | `src/components/dashboard/backroom/` (11 files) | MixSessionManager orchestrator, BowlCard, BowlLineRow, AddProductToBowl, ManualWeightInput, ReweighPanel (inline), WasteRecordDialog, SessionSummary, FormulaPreview, StationSelector, ScaleConnectionStatus |

---

## Device Manager Architecture

```text
ScaleAdapter (interface)
  connect() / disconnect()
  onReading(cb) / offReading(cb)
  getConnectionState() → ConnectionState
  type: 'manual' | 'ble'

ManualScaleAdapter (Phase 1 implementation)
  - Always returns 'manual_override' state
  - submitReading(weight, unit, context) → emits WeightEvent to listeners
  - No hardware dependency

createScaleAdapter(type) → factory
  - Phase 1: always returns ManualScaleAdapter
  - Future: BLEScaleAdapter via Capacitor plugin
```

Critical constraint: Web Bluetooth is unavailable on iOS Safari. Manual entry is the only path in Phase 1.

---

## Scale Adapter Architecture

```text
WeightEvent schema:
  timestamp, device_id, station_id, appointment_id, bowl_id, user_id,
  raw_weight, normalized_weight, unit, stable_flag, confidence_score,
  connection_state

ConnectionState enum:
  disconnected | scanning | pairing | connected |
  unstable_reading | stable_reading | reconnecting | manual_override

Phase 1: Only 'manual_override' is active.
ManualScaleAdapter sets confidence_score = 1.0, stable_flag = true.
```

---

## State Machines

### Mix Session Lifecycle
```text
  draft ──→ mixing ──→ pending_reweigh ──→ completed
    │          │
    └──→ cancelled ←──┘

Terminal states: completed, cancelled
```

### Bowl Lifecycle
```text
  open ──→ sealed ──→ reweighed (terminal)
    │          │
    └──→ discarded ←──┘ (terminal)
```

### Scale Connection States (future — Phase 1 only uses manual_override)
```text
  disconnected ──→ scanning ──→ pairing ──→ connected
                                               │
                              unstable_reading ←→ stable_reading
                                               │
                                          reconnecting
  any ──→ manual_override
```

---

## Frontend Information Architecture (Backroom Tab)

The Backroom tab is the 4th tab in `AppointmentDetailSheet.tsx` (after Details, History, Notes).

```text
AppointmentDetailSheet
  └─ TabsContent value="backroom"
       └─ BackroomTab (appointment context)
            └─ MixSessionManager (orchestrator)
                 ├─ No active session view
                 │    ├─ Previous sessions list (SessionSummary)
                 │    ├─ StationSelector
                 │    ├─ ScaleConnectionStatus
                 │    └─ "Start Session" button
                 │
                 └─ Active session view
                      ├─ Session header (status + action buttons)
                      │    ├─ draft: "Begin Mixing"
                      │    ├─ mixing: "Waste" + "Move to Reweigh"
                      │    └─ pending_reweigh: "Complete Session"
                      │
                      ├─ BowlCardWithLines[] (per bowl)
                      │    └─ BowlCard
                      │         ├─ Header: bowl number, name, status badge, live weight + cost
                      │         ├─ BowlLineRow[] (per product line)
                      │         ├─ AddProductToBowl (product search → quantity → add)
                      │         ├─ Actions: Seal Bowl, Discard
                      │         ├─ Reweigh: ManualWeightInput (when sealed)
                      │         └─ Reweigh result (when reweighed)
                      │
                      ├─ "Add Bowl" button (draft/mixing only)
                      └─ WasteRecordDialog (modal)
```

---

## Edge Cases (Handled)

| Edge Case | Handling |
|---|---|
| **Scale disconnect** | Phase 1 is manual-only; ScaleAdapter interface ready for future BLE with reconnecting state |
| **Missing reweigh** | Session completes with `unresolved_flag = true` + `unresolved_reason` set. Manager review needed. |
| **Manual entry override** | All entries are manual in Phase 1. `captured_via = 'manual'` on all lines and reweigh events. `is_manual_override` flag on session. |
| **Multi-bowl sessions** | Fully supported. Each bowl independent. Bowl number auto-increments. All bowls must be sealed before moving to reweigh. |
| **Assistant mixing** | `mixed_by_staff_id` (who mixes) vs `service_performed_by_staff_id` (stylist). Both tracked on session. |
| **Station switching** | Station selected at session start via `StationSelector`. No mid-session switch (station_id is set once). |
| **Concurrent sessions** | Unique partial index `idx_mix_sessions_active_per_service` prevents two active sessions for the same appointment_service. |
| **Product price changes** | Cost locked at `dispensed_cost_snapshot` on each bowl line at dispense time. |
| **Session abandoned** | Stays in `mixing` status. No auto-cleanup. Manager exception query can surface stale sessions. |

---

## Gaps Identified for Phase 2+

1. **Stock movement logging** — Session completion does not yet log `stock_movements` for inventory depletion
2. **Permission keys** — `backroom.mix`, `backroom.reweigh`, `backroom.manage_stations` defined conceptually but not inserted into `role_permissions`
3. **Offline sync** — `useOfflineSync` exists but not wired into backroom hooks
4. **Formula save on completion** — `handleCompleteSession` has a TODO placeholder; does not yet batch-fetch lines and call `useSaveFormulaHistory`
5. **Exception events table** — No dedicated `exception_events` table for manager review queue
6. **Audit event logging** — `AUDIT_EVENTS` constants added but `useLogAuditEvent` is not called during session/bowl transitions

