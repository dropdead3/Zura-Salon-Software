

# Zura Backroom — Architecture Audit & Phase 1 Build Plan

---

## Section 1: Current-State Architecture Report

### 1.1 Reusable Zura Core Systems

| System | Status | Key Files/Tables | Reuse Notes |
|---|---|---|---|
| **Organizations** | Mature | `organizations` table, `OrganizationContext.tsx` | All Backroom entities scope via `organization_id` |
| **Locations** | Mature | `locations` table, `useLocations.ts` | Stations are location-scoped; products are location-scoped |
| **Staff** | Mature | `employee_profiles`, `useEmployeeProfile.ts`, `useTeamDirectory` | Mix sessions attribute to staff (mixer vs performer) |
| **Roles** | Mature | `user_roles`, `app_role` enum, `role_permissions` | Extend with backroom-specific permissions |
| **Permissions** | Mature | `usePermission.ts`, `hasPermission()`, `role_permissions` | Add new permission keys (e.g. `backroom.mix`, `backroom.manage`) |
| **Clients** | Mature | `phorest_clients` + `clients` tables | Formula history links to client ID |
| **Appointments** | Mature | `appointments` + `phorest_appointments`, `AppointmentDetailSheet.tsx` (2086 lines, tabbed: Details/History/Notes) | Backroom tab adds as 4th tab |
| **Appointment Services** | Mature | `appointment_service_assignments`, `useServiceAssignments.ts` | Mix sessions link to appointment + appointment_service |
| **Checkout** | Mature | `CheckoutSummarySheet.tsx` (693 lines), `useRegisterCart.ts` | Future: add usage summary panel. Phase 1 doesn't touch checkout |
| **Analytics** | Mature | `src/components/dashboard/analytics/`, recharts, `useRealizationRate`, metrics glossary | Foundation for BackroomAnalytics later |
| **Inventory — Products** | Mature | `products` table (sku, brand, category, cost_price, quantity_on_hand, reorder_level, par_level, location_id, supplier_id, image_url, product_type) | Extend for weighed-product fields (default_unit, unit_type) |
| **Inventory — Stock Movements** | Mature | `stock_movements` table, `useStockMovements.ts`, `useLogStockMovement()` | Reuse directly for backroom depletion events |
| **Inventory — Stock Counts** | Mature | `stock_counts` table, `useStockCounts.ts`, shrinkage summary | Reuse for count sessions |
| **Inventory — Stock Transfers** | Mature | `stock_transfers` table, `useStockTransfers.ts` | Reuse directly |
| **Inventory — Reorder Queue** | Present | `inventory_reorder_queue`, `useInventoryAlerts.ts` | Extend for backroom replenishment |
| **Purchasing — POs** | Mature | `purchase_orders` table, `usePurchaseOrders.ts`, PO received → stock update + stock_movement log | Reuse directly |
| **Purchasing — Suppliers** | Mature | `product_suppliers` table, `useProductSuppliers.ts`, lead-time tracking, MOQ | Reuse directly |
| **Purchasing — Cost History** | Present | `product_cost_history`, `log_cost_price_change()` trigger | Reuse for cost snapshots in bowl lines |
| **Notifications** | Present | `notification_preferences`, `useNotificationPreferences.ts`, `useNotificationSound.ts` | Extend for backroom alerts |
| **Audit Logging** | Mature | `appointment_audit_log`, `useAuditLog()`, `useLogAuditEvent()`, `AUDIT_EVENTS` constants | Extend event types for backroom events |
| **Offline Sync** | Foundation | `useOfflineSync()`, `useOfflineStatus()`, `OfflineIndicator.tsx` | Reuse for local reading buffer and offline bowl capture |

### 1.2 Reuse vs New-Build Matrix

| Backroom Subsystem | Verdict | Rationale |
|---|---|---|
| **BackroomStation** | **New** | No station/workstation concept exists |
| **DeviceManager** | **New** | No Bluetooth/hardware abstraction exists |
| **ScaleAdapter** | **New** | No hardware driver abstraction |
| **MixSession** | **New** | No mixing/dispensing concept exists |
| **MixBowl** | **New** | No bowl concept |
| **MixBowlLine** | **New** | No line-item dispensing concept |
| **ReweighEvent** | **New** | No reweigh concept |
| **WasteEvent** | **New** | No waste categorization |
| **ClientFormulaHistory** | **New** | No formula history (confirmed: search found zero matches for color_formula/formula_history) |
| **Formula Versioning** | **New** | Part of ClientFormulaHistory |
| **ServiceRecipeBaseline** | **New (Phase 2+)** | No recipe/baseline concept |
| **InventoryLedger** | **Extend** `stock_movements` | Already append-only with reason codes. Add backroom-specific reasons |
| **CountSession** | **Extend** `stock_counts` | Already has count + variance. Add session grouping later |
| **Transfer** | **Reuse** `stock_transfers` | Already has full transfer workflow |
| **ServiceAllowancePolicy** | **New (Phase 2+)** | No allowance/billing concept |
| **AllowanceBucket** | **New (Phase 2+)** | — |
| **OverageRule** | **New (Phase 2+)** | — |
| **ReplenishmentRecommendation** | **Extend** `inventory_reorder_queue` | Already has suggestion engine |
| **PurchaseOrder** | **Reuse** `purchase_orders` | Full lifecycle already built |
| **ReceivingRecord** | **Extend** `useMarkPurchaseOrderReceived` | Already handles receive → stock update → movement log |
| **ExceptionEvent** | **New** | No exception/flag concept for review |
| **BackroomAnalytics** | **Extend** analytics foundations | Add new query hooks; recharts infrastructure exists |
| **AIInsight Layer** | **Extend** `useAIInsights`, Lovable AI gateway | Add prompts for backroom data. Phase 2+ |

### 1.3 Frontend Extension Points

| Surface | Location | Integration Method |
|---|---|---|
| **Backroom tab in appointment** | `AppointmentDetailSheet.tsx` line 1048-1052 | Add 4th `TabsTrigger value="backroom"` + `TabsContent` |
| **Formula history on client profile** | `ClientDetailSheet` / client detail page | New tab or section |
| **Inventory workspace additions** | `src/components/dashboard/settings/inventory/` | Add backroom usage reports alongside existing panels |
| **Checkout usage summary** | `CheckoutSummarySheet.tsx` | New section showing mix session cost summary (Phase 2) |
| **Manager exception inbox** | New page or sidebar panel under `/dashboard/admin/` | New route |
| **Owner/manager dashboard widgets** | `DashboardHome.tsx`, existing widget system | New widget cards |

### 1.4 Backend Extension Points

| System | Extension Method |
|---|---|
| **Audit logging** | Add new `AUDIT_EVENTS` constants for backroom events; reuse `appointment_audit_log` table |
| **Stock movements** | Add new reason codes: `backroom_usage`, `backroom_waste`, `backroom_reweigh_adjustment` |
| **Permission system** | Add new permission keys to `role_permissions` |
| **Notification preferences** | Add new preference flags for backroom alerts |
| **Edge functions** | New edge functions for scale data processing, formula PDF export |
| **Realtime** | Enable realtime on new `mix_sessions` table for live session visibility |

### 1.5 iPad & Hardware Feasibility Review

| Concern | Assessment | Risk Level |
|---|---|---|
| **iPad-first workflow** | React + Vite SPA works on iPad Safari. Touch targets need explicit sizing (min 44×44pt). No blockers. | Low |
| **Bluetooth scale support** | Web Bluetooth API is **NOT supported in Safari/iOS**. This is a critical constraint. Workarounds: (1) Capacitor native plugin for BLE, (2) Scale vendor companion app with local HTTP/WebSocket relay, (3) Manual entry as primary with BLE as future native enhancement. | **High** |
| **Local session persistence** | `useOfflineSync` + localStorage already exist. Extend for bowl state persistence. | Low |
| **Offline sync** | Foundation exists (`useOfflineSync`). Need conflict resolution for concurrent sessions. | Medium |
| **Real-time event streaming** | Supabase Realtime already used for chat. Extend for mix session state. | Low |
| **Device pairing architecture** | Must be manual-fallback-first given Safari BLE limitation. Device registry table is straightforward. | Medium |

**Critical finding:** Web Bluetooth is unavailable on iOS Safari. Phase 1 must use **manual weight entry** as the primary path, with the scale adapter interface designed for future Capacitor/native BLE integration.

### 1.6 Inventory Architecture Review

| Capability | Status |
|---|---|
| Append-only ledger | Yes — `stock_movements` is insert-only with `quantity_change` + `quantity_after` |
| Lot/batch support | **No** — not present |
| Location-level stock | Partial — `products.location_id` exists but stock is per-product not per-location-product |
| Count adjustments | Yes — `stock_counts` with variance |
| Transfers | Yes — `stock_transfers` with approval flow |
| Purchase orders | Yes — full lifecycle |
| Receiving | Yes — `useMarkPurchaseOrderReceived` updates stock + logs movement |
| Vendor/supplier | Yes — `product_suppliers` with lead-time tracking |

### 1.7 Checkout & Pricing Architecture Review

| Capability | Status |
|---|---|
| Cart model | Yes — `useRegisterCart` with items, client, staff, payment method |
| Tax calculation | Yes — configurable rate |
| Promo codes | Yes — `PromoCodeInput` + validation |
| Service allowance policies | **No** — new build required |
| Overage billing | **No** — new build required |
| Usage line items | **No** — cart only supports products, not usage-based items |
| Manager override | Partial — role checks exist, no override workflow for billing |

### 1.8 Analytics Architecture Review

| Capability | Status |
|---|---|
| Recharts infrastructure | Yes |
| Metrics glossary | Yes — extensible |
| Sales analytics hooks | Yes — many |
| Shrinkage/variance | Yes — `useShrinkageSummary` |
| Waste tracking | **No** |
| Reweigh compliance | **No** |
| Service profitability | Partial — `useServiceCostsProfits` exists |
| Ghost loss | **No** |
| Stockout risk | Yes — `useInventoryAlerts` with days-until-stockout |

### 1.9 Technical Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **iOS Safari has no Web Bluetooth** | Critical | Manual-first approach; design ScaleAdapter interface for future Capacitor plugin |
| **Concurrent mix sessions on same appointment** | Medium | State machine enforcement — one active session per appointment_service |
| **Offline bowl data loss** | Medium | LocalStorage persistence via existing `useOfflineSync` pattern |
| **Inventory integrity on rapid dispensing** | Medium | Use `stock_movements` append-only pattern; defer `quantity_on_hand` updates to session completion |
| **Multi-location product stock granularity** | Medium | Current model is per-product not per-location-product. Acceptable for Phase 1 |
| **AppointmentDetailSheet is 2086 lines** | Low | Extract Backroom tab into standalone component to avoid bloating further |
| **Checkout integration complexity** | Low (Phase 2) | Deferred to Phase 2 |

---

## Section 2: Phase 1 Build Plan

### 2.1 Schema Changes (8 new tables)

```text
backroom_stations
  id, organization_id, location_id, station_name, assigned_device_id,
  assigned_scale_id, is_active, last_seen_at, created_at, updated_at

backroom_devices
  id, organization_id, location_id, device_type (scale|tablet),
  device_name, serial_number, connection_type, is_paired, paired_station_id,
  last_seen_at, created_at

mix_sessions
  id, organization_id, appointment_id, appointment_service_id, client_id,
  mixed_by_staff_id, service_performed_by_staff_id, station_id, location_id,
  started_at, completed_at, status (draft|mixing|pending_reweigh|completed|cancelled),
  is_manual_override, unresolved_flag, unresolved_reason, notes, created_at, updated_at

mix_bowls
  id, mix_session_id, bowl_number, bowl_name, purpose,
  started_at, completed_at, status (open|sealed|reweighed|discarded),
  total_dispensed_weight, total_dispensed_cost, leftover_weight,
  net_usage_weight, created_at, updated_at

mix_bowl_lines
  id, bowl_id, product_id, product_name_snapshot, brand_snapshot,
  dispensed_quantity, dispensed_unit, dispensed_cost_snapshot,
  captured_via (scale|manual), sequence_order, created_at

reweigh_events
  id, bowl_id, mix_session_id, leftover_quantity, leftover_unit,
  captured_via, weighed_by_staff_id, weighed_at, notes, created_at

waste_events
  id, mix_session_id, bowl_id, waste_category
  (leftover_bowl_waste|overmix_waste|spill_waste|expired_product_discard|contamination_discard),
  quantity, unit, product_id, notes, recorded_by_staff_id, created_at

client_formula_history
  id, organization_id, client_id, appointment_id, appointment_service_id,
  mix_session_id, service_name, formula_type (actual|refined),
  formula_data (JSONB — array of {product_id, product_name, brand, quantity, unit}),
  staff_id, staff_name, notes, version_number, created_at
```

All tables get RLS policies using `is_org_member` / `is_org_admin`. Enable realtime on `mix_sessions` and `mix_bowls`.

### 2.2 Frontend Architecture

```text
src/components/dashboard/backroom/
  BackroomTab.tsx              — Entry point, loaded inside AppointmentDetailSheet
  MixSessionManager.tsx        — Session lifecycle orchestrator
  BowlCard.tsx                 — Single bowl with line items
  BowlLineRow.tsx              — Product line with weight input
  AddProductToBowl.tsx         — Product search/select popover
  ReweighPanel.tsx             — Reweigh capture per bowl
  WasteRecordDialog.tsx        — Waste categorization
  SessionSummary.tsx           — Final summary with cost totals
  FormulaPreview.tsx           — Read-only formula display
  StationSelector.tsx          — Station picker
  ScaleConnectionStatus.tsx    — Connection state indicator
  ManualWeightInput.tsx        — Fallback numeric input

src/hooks/backroom/
  useMixSession.ts             — CRUD + state transitions
  useMixBowls.ts               — Bowl CRUD
  useMixBowlLines.ts           — Line item CRUD
  useReweighEvents.ts          — Reweigh capture
  useWasteEvents.ts            — Waste recording
  useClientFormulaHistory.ts   — Formula read/write
  useBackroomStations.ts       — Station management
  useScaleConnection.ts        — Scale adapter hook (manual-first, interface for future BLE)

src/lib/backroom/
  mix-calculations.ts          — Deterministic: net_usage, cost_per_bowl, session_total
  scale-adapter.ts             — ScaleAdapter interface + ManualScaleAdapter
  session-state-machine.ts     — Mix session state transitions
  bowl-state-machine.ts        — Bowl state transitions
  weight-event-schema.ts       — Normalized weight event type
```

### 2.3 State Machines

```text
MixSession lifecycle:
  draft → mixing → pending_reweigh → completed
  draft → cancelled
  mixing → cancelled
  pending_reweigh → completed (with unresolved_flag if reweigh missing)

Bowl lifecycle:
  open → sealed → reweighed → (done)
  open → sealed → (done, with unresolved_flag)
  open → discarded

Scale connection (future):
  disconnected → scanning → pairing → connected
  connected → unstable_reading → stable_reading
  connected → reconnecting → connected
  any → manual_override
```

### 2.4 Deterministic Calculations (in `mix-calculations.ts`)

```typescript
net_usage = dispensed_quantity - leftover_quantity - approved_discard_adjustment
bowl_cost = SUM(line.dispensed_quantity * line.dispensed_cost_snapshot)
session_cost = SUM(bowl_costs)
```

### 2.5 Device Manager Architecture

Phase 1: **ManualScaleAdapter** only (returns user-entered weight). The `ScaleAdapter` interface is designed so a `BLEScaleAdapter` can be swapped in when Capacitor native support is added.

```typescript
interface ScaleAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onReading(callback: (event: WeightEvent) => void): void;
  getConnectionState(): ConnectionState;
  type: 'manual' | 'ble';
}
```

### 2.6 Integration Points

- **AppointmentDetailSheet.tsx** line 1049: Add `<TabsTrigger value="backroom">Backroom</TabsTrigger>` + lazy-loaded `<BackroomTab />`
- **Audit logging**: Extend `AUDIT_EVENTS` with `MIX_SESSION_STARTED`, `MIX_SESSION_COMPLETED`, `BOWL_REWEIGHED`, `WASTE_RECORDED`
- **Stock movements**: On session completion, log one `stock_movement` per bowl line with reason `backroom_usage`
- **Permissions**: Add `backroom.mix`, `backroom.reweigh`, `backroom.manage_stations`, `backroom.view_formulas`

### 2.7 Recommended Implementation Order

1. **Database migration** — Create all 8 tables with RLS + indexes
2. **Deterministic calculation module** — `mix-calculations.ts`, state machines (pure logic, testable)
3. **Core hooks** — `useMixSession`, `useMixBowls`, `useMixBowlLines`, `useReweighEvents`
4. **Scale adapter foundation** — Interface + ManualScaleAdapter
5. **BackroomTab UI** — Session manager, bowl cards, line rows, manual weight input
6. **Reweigh workflow** — ReweighPanel + net usage calculation
7. **Formula history** — `useClientFormulaHistory` + save on session completion
8. **Waste events** — WasteRecordDialog + hook
9. **Station management** — BackroomStations CRUD + StationSelector
10. **Audit + stock integration** — Log audit events + stock_movements on completion
11. **Permissions** — Wire permission checks into UI
12. **iPad UX polish** — Large tap targets, dark mode, scroll optimization

### 2.8 Edge Cases

- **Multiple bowls for same product**: Each bowl line is independent; costs snapshot at dispense time
- **Session abandoned mid-mix**: Status stays `mixing`; manager exception query surfaces stale sessions
- **Reweigh skipped**: Session completes with `unresolved_flag = true` + exception event created
- **Product price changed between dispense and completion**: Cost locked at `dispensed_cost_snapshot`
- **Concurrent sessions on same appointment**: Prevented by unique constraint on `(appointment_id, appointment_service_id)` where status not in `('completed', 'cancelled')`

### 2.9 Test Plan

| Area | Test Type |
|---|---|
| `mix-calculations.ts` | Unit tests (net usage, cost, edge cases with zero/null) |
| State machines | Unit tests (valid/invalid transitions) |
| Bowl CRUD flow | Integration (create session → add bowl → add lines → seal → reweigh → complete) |
| Formula save | Integration (complete session → verify formula_history record created) |
| Stock movement on completion | Integration (verify stock_movement rows created with correct quantities) |
| Manual weight input | UI test (iPad viewport, large targets) |
| Unresolved session | Integration (skip reweigh → verify unresolved_flag) |
| Permission gating | UI test (non-permitted user cannot access Backroom tab) |

