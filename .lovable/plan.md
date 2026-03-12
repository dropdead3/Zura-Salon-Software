

# Zura Backroom — Section 1: Architecture Audit

## 1. Reusable Zura Core Systems

| System | Status | Key Assets | Backroom Reuse |
|---|---|---|---|
| **Organizations** | Mature | `organizations` table, `OrganizationContext.tsx`, `is_org_member()` / `is_org_admin()` SQL helpers | All backroom entities scope via `organization_id`. RLS helpers reused directly. |
| **Locations** | Mature | `locations` table, `useLocations.ts`, `useActiveLocations()` | Stations, sessions, inventory all location-scoped. Reuse directly. |
| **Staff** | Mature | `employee_profiles` table, `useEmployeeProfile.ts`, `useTeamDirectory`, `display_name`, `photo_url` | Mix sessions attribute two staff IDs (mixer + performer). Reuse directly. |
| **Roles** | Mature | `user_roles` table, `app_role` enum, `role_permissions` join table | Extend with backroom permission keys. No new roles needed. |
| **Permissions** | Mature | `usePermission()` hook with `can()` / `canAny()` / `canAll()`, `PermissionGate` component | Add permission keys like `backroom.mix`, `backroom.reweigh`, `backroom.manage_stations`. Wire via existing `PermissionGate`. |
| **Clients** | Mature | `phorest_clients` + `clients` tables, `ClientDetailSheet.tsx` | Formula history links to client_id. Client profile is extension point for formula tab. |
| **Appointments** | Mature | `appointments` + `phorest_appointments`, `AppointmentDetailSheet.tsx` (2096 lines, 4 tabs: Details/History/Notes/Backroom) | Backroom tab **already integrated** at line 1053/1714. |
| **Appointment Services** | Mature | `appointment_service_assignments` table, `useServiceAssignments.ts` | Mix sessions link via `appointment_service_id`. Reuse directly. |
| **Checkout / POS** | Mature | `CheckoutSummarySheet.tsx` (693 lines), `useRegisterCart`, tax, promo codes | Future phase: add usage cost summary panel. No changes in Phase 1. |
| **Analytics** | Mature | Recharts infrastructure, metrics glossary, `useServiceCostsProfits`, `useShrinkageSummary` | Extend with backroom-specific query hooks. |
| **Notifications** | Present | `notification_preferences` table, `useNotificationPreferences.ts`, `useNotificationSound.ts` | Extend for backroom alerts (low-stock, exception flags). |
| **Audit Logging** | Mature | `appointment_audit_log` table, `useLogAuditEvent()`, `AUDIT_EVENTS` constants | **Already extended** — backroom audit events added: `MIX_SESSION_STARTED`, `MIX_SESSION_COMPLETED`, `BOWL_REWEIGHED`, `WASTE_RECORDED`. |
| **Inventory — Products** | Mature | `products` table (sku, brand, category, cost_price, quantity_on_hand, reorder_level, par_level, location_id, supplier_id, product_type) | Source of product catalog for bowl lines. Cost snapshot taken at dispense time. |
| **Inventory — Stock Movements** | Mature | `stock_movements` table (append-only, `quantity_change` + `quantity_after`), `useStockMovements.ts`, `useLogStockMovement()` | Reuse directly for backroom depletion on session completion. Add reason codes. |
| **Inventory — Stock Counts** | Mature | `stock_counts` table, `useStockCounts.ts`, shrinkage summary | Reuse for count sessions. |
| **Inventory — Stock Transfers** | Mature | `stock_transfers` table with approval flow, `useStockTransfers.ts` | Reuse directly. |
| **Inventory — Reorder Queue** | Present | `inventory_reorder_queue` table, `useInventoryAlerts.ts` (days-until-stockout, reorder suggestions) | Extend for backroom replenishment recommendations. |
| **Purchasing — POs** | Mature | `purchase_orders` table (full lifecycle: created → sent → received), `usePurchaseOrders.ts` | Reuse directly. |
| **Purchasing — Suppliers** | Mature | `product_suppliers` table (lead time, MOQ, avg delivery days), `useProductSuppliers.ts` | Reuse directly. |
| **Purchasing — Cost History** | Present | `product_cost_history` table, `log_cost_price_change()` trigger | Reuse for cost snapshots. |
| **Offline Sync** | Foundation | `useOfflineSync()`, `useOfflineStatus()`, `OfflineIndicator.tsx` | Extend for local bowl/session persistence. |

---

## 2. Reuse vs New-Build Matrix

| Backroom Subsystem | Verdict | Current State | Notes |
|---|---|---|---|
| **BackroomStation** | **Already built** | `backroom_stations` table + RLS + `useBackroomStations.ts` + `StationSelector.tsx` | Exists. May need refinement. |
| **DeviceManager** | **Already built (foundation)** | `backroom_devices` table + RLS | Table exists. No frontend management UI yet. |
| **ScaleAdapter** | **Already built** | `scale-adapter.ts` — `ScaleAdapter` interface + `ManualScaleAdapter` + factory | Manual-first. BLE placeholder ready. |
| **MixSession** | **Already built** | `mix_sessions` table + enum + RLS + realtime + `useMixSession.ts` + `MixSessionManager.tsx` + `session-state-machine.ts` | Full lifecycle: draft → mixing → pending_reweigh → completed/cancelled. |
| **MixBowl** | **Already built** | `mix_bowls` table + enum + RLS + realtime + `useMixBowls.ts` + `BowlCard.tsx` + `bowl-state-machine.ts` | States: open → sealed → reweighed/discarded. |
| **MixBowlLine** | **Already built** | `mix_bowl_lines` table + RLS + `useMixBowlLines.ts` + `BowlLineRow.tsx` + `AddProductToBowl.tsx` | Cost snapshot at dispense. |
| **ReweighEvent** | **Already built** | `reweigh_events` table + RLS + `useReweighEvents.ts` | Captures leftover quantity per bowl. |
| **WasteEvent** | **Already built** | `waste_events` table + RLS + `useWasteEvents.ts` + `WasteRecordDialog.tsx` | 5 categories. |
| **ClientFormulaHistory** | **Already built** | `client_formula_history` table + RLS + `useClientFormulaHistory.ts` + `FormulaPreview.tsx` | Actual + refined formula types, version numbering. |
| **ServiceRecipeBaseline** | **New (Phase 2+)** | Nothing exists | No recipe/baseline concept in Zura. |
| **InventoryLedger** | **Extend** `stock_movements` | Append-only with reason codes, `useLogStockMovement()` | Add backroom-specific reasons (`backroom_usage`, `backroom_waste`). |
| **CountSession** | **Extend** `stock_counts` | Per-product count + variance tracking | Add session grouping for multi-product counts later. |
| **Transfer** | **Reuse directly** | `stock_transfers` with approval flow | No changes needed. |
| **ServiceAllowancePolicy** | **New (Phase 2+)** | Nothing exists | No allowance/billing model. |
| **AllowanceBucket** | **New (Phase 2+)** | Nothing exists | — |
| **OverageRule** | **New (Phase 2+)** | Nothing exists | — |
| **ReplenishmentRecommendation** | **Extend** `inventory_reorder_queue` | Days-until-stockout, suggestion engine | Add backroom usage velocity data. |
| **PurchaseOrder** | **Reuse directly** | Full lifecycle built | No changes needed. |
| **ReceivingRecord** | **Reuse directly** | `useMarkPurchaseOrderReceived` → stock update + stock_movement | No changes needed. |
| **ExceptionEvent** | **New** | Nothing exists | Unresolved sessions flagged but no dedicated exception queue/inbox. |
| **BackroomAnalytics** | **Extend** analytics foundations | Recharts, metrics glossary, shrinkage summary exist | New query hooks + dashboard widgets. |
| **AIInsight layer** | **Extend** Lovable AI gateway | `useAIInsights` exists, Gemini integration | Add backroom data prompts. Phase 2+. |

---

## 3. Frontend Extension Map

| Surface | Location | Status | Integration |
|---|---|---|---|
| **Backroom tab in appointment** | `AppointmentDetailSheet.tsx` line 1053, 1714 | **Already integrated** | 4th tab, renders `BackroomTab` → `MixSessionManager` |
| **Formula history on client profile** | `ClientDetailSheet.tsx` | **Not yet integrated** | Add new tab/section showing `useClientFormulaHistory` data |
| **Inventory workspace additions** | `src/components/dashboard/settings/inventory/` | **Not yet integrated** | Add backroom usage reports, product usage velocity |
| **Checkout usage summary** | `CheckoutSummarySheet.tsx` | **Not yet integrated** | Phase 2: show mix session cost summary before payment |
| **Manager exception inbox** | Does not exist | **New route needed** | `/dashboard/admin/backroom-exceptions` |
| **Owner/manager dashboard widgets** | `DashboardHome.tsx` | **Not yet integrated** | New widget cards for daily mix stats, unresolved sessions |

---

## 4. Backend Extension Map

| System | Extension | Status |
|---|---|---|
| **Audit logging** | `AUDIT_EVENTS` constants | **Already extended** with 4 backroom event types |
| **Stock movements** | Add reason codes for backroom | **Not yet done** — need to log `stock_movement` on session completion |
| **Permission system** | Add backroom permission keys | **Not yet done** — keys defined but not inserted into `role_permissions` |
| **Notification preferences** | Add backroom alert types | **Not yet done** |
| **Edge functions** | Formula PDF export, session summary | **Not yet built** |
| **Realtime** | `mix_sessions` + `mix_bowls` | **Already enabled** in migration |
| **Triggers** | `update_backroom_updated_at()` | **Already created** for session/bowl `updated_at` |

---

## 5. Schema Gap List

What exists (8 tables from migration `20260312080927`):
- `backroom_stations`, `backroom_devices`, `mix_sessions`, `mix_bowls`, `mix_bowl_lines`, `reweigh_events`, `waste_events`, `client_formula_history`

What is missing for future phases:
- `exception_events` — dedicated exception queue table
- `service_recipe_baselines` — expected product/quantity per service
- `service_allowance_policies` — billing allowance rules
- `allowance_buckets` — per-appointment allowance tracking
- `overage_rules` — overage billing configuration

What needs extending on existing tables:
- `stock_movements.reason` — add backroom-specific reason codes
- `products` — potentially add `default_unit` and `unit_type` for weighed-product support
- `role_permissions` — insert rows for new backroom permission keys

---

## 6. Technical Risks

| Risk | Severity | Detail |
|---|---|---|
| **iOS Safari has no Web Bluetooth** | Critical | Web Bluetooth API blocked on all iOS browsers. Phase 1 correctly uses manual entry. Future BLE requires Capacitor native plugin or scale vendor companion app. |
| **Concurrent mix sessions** | Medium | Unique partial index `idx_mix_sessions_active_per_service` prevents concurrent active sessions per appointment_service. Risk: appointment-level (not service-level) sessions could still overlap if no service is specified. |
| **Offline data loss** | Medium | `useOfflineSync` foundation exists but is not yet wired into backroom hooks. Bowl state could be lost on disconnect. |
| **Inventory integrity** | Medium | `stock_movements` is append-only (good). But `quantity_on_hand` is a mutable column on `products` — must ensure depletion only happens on session completion, not per-line-add. |
| **AppointmentDetailSheet size** | Low | File is 2096 lines. Backroom tab is properly extracted into `BackroomTab.tsx` component — no bloat risk. |
| **Multi-location product identity** | Medium | Products are per-location (`products.location_id`). Bowl lines reference `product_id`. Cross-location product lookup may need care. |
| **Checkout integration** | Low (Phase 2) | Cart model (`useRegisterCart`) only supports retail product items, not usage-based line items. Will need extension for overage billing. |
| **Real-time session concurrency** | Low | Realtime enabled on `mix_sessions` and `mix_bowls`. Multiple staff viewing same session will see updates. Conflict risk is low since mixing is typically single-operator. |

---

## 7. Recommended Implementation Order

Phase 1 foundation is **already built**. The recommended next steps:

1. **Harden Phase 1** — Wire stock movement logging on session completion, add permission key rows, connect offline sync to backroom hooks
2. **Client formula history UI** — Add formula tab to `ClientDetailSheet`
3. **Exception event system** — New table + manager inbox route
4. **Service recipe baselines** — Expected product/quantity per service type
5. **Inventory depletion integration** — Auto-deduct `quantity_on_hand` via `stock_movements` on session complete
6. **Checkout integration** — Usage cost summary panel in `CheckoutSummarySheet`
7. **Service allowance & overage billing** — New policy tables + checkout line items
8. **BackroomAnalytics** — Waste tracking, reweigh compliance, service profitability widgets
9. **AI insight layer** — Gemini-powered formula suggestions, waste pattern detection
10. **BLE scale support** — Capacitor native plugin when iPad app distribution is feasible

---

## Summary

Phase 1 schema and core frontend/backend are **already in place**. Eight tables created with RLS, realtime enabled, state machines defined, deterministic calculations isolated in `mix-calculations.ts`, and the Backroom tab is live in the appointment workspace. The primary gaps are: stock movement integration on session completion, permission key insertion, offline sync wiring, client profile formula display, and the exception event system.

