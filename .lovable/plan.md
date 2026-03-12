

# Domain Service Boundary Architecture

## Current State

Business logic is scattered across two layers with no enforced boundaries:

- **`src/lib/backroom/`** — Pure calculation modules (good): `mix-calculations.ts`, `analytics-engine.ts`, `allowance-billing.ts`, `replenishment-engine.ts`, `session-state-machine.ts`, `bowl-state-machine.ts`, `mix-session-service.ts`
- **`src/hooks/`** — React hooks that mix query logic with write operations and cross-domain mutations (problematic): `useDepleteMixSession` writes to `stock_movements`, `usePurchaseOrders` writes to `stock_movements`, `useStockTransfers` writes to `stock_movements`, `useReceiveShipment` writes to `stock_movements`, `useSaveFormulaHistory` writes to `client_formula_history`, `useResolveException` writes to `backroom_exceptions`

**Problems identified:**
1. Multiple hooks write directly to `stock_movements` — no single inventory service owns this
2. `useDepleteMixSession` crosses the MixSession → Inventory boundary directly
3. Formula saving (`useSaveFormulaHistory`) is callable from anywhere, not gated by session completion
4. No service-level module for inventory, purchasing, exceptions, or formulas — only hooks with embedded logic
5. `useBackroomAIInsights` calls an edge function directly with no service abstraction

---

## Proposed Domain Service Structure

### Folder Layout

```text
src/lib/backroom/
  services/
    mix-session-service.ts     ← (move existing, owns session lifecycle + events)
    inventory-ledger-service.ts ← NEW: owns stock_movements writes
    formula-service.ts          ← NEW: owns client_formula_history writes
    allowance-billing-service.ts← NEW: wraps existing calculations + checkout projection writes
    exception-service.ts        ← NEW: owns backroom_exceptions writes
    purchasing-service.ts       ← NEW: owns PO receiving → inventory posting
    replenishment-service.ts    ← NEW: wraps existing calculations + risk projection reads
    projection-service.ts       ← NEW: rebuild functions, projection reads
    analytics-service.ts        ← NEW: wraps existing engine + snapshot queries
    ai-insight-service.ts       ← NEW: wraps edge function calls, read-only

  calculations/                 ← Pure math (existing, no changes)
    mix-calculations.ts
    analytics-engine.ts
    allowance-billing.ts
    replenishment-engine.ts

  state-machines/               ← Pure state logic (existing, no changes)
    session-state-machine.ts
    bowl-state-machine.ts

  events/                       ← Event type definitions
    weight-event-schema.ts      ← (existing)
    scale-adapter.ts            ← (existing)
```

### Hooks refactored to thin wrappers

Hooks become thin React wrappers that call service functions. They do not contain business logic or cross-domain writes.

---

## Service Responsibility Matrix

| Service | Owns (writes) | Reads | Must NOT mutate |
|---|---|---|---|
| **MixSessionService** | `mix_session_events`, `mix_sessions`, `mix_bowls`, `mix_bowl_lines` | projections, products | `stock_movements`, `checkout_usage_projections`, `client_formula_history` |
| **InventoryLedgerService** | `stock_movements` (via trigger: `inventory_projections`, `products.quantity_on_hand`) | `inventory_projections` | `mix_sessions`, checkout, formulas |
| **FormulaService** | `client_formula_history` | finalized session data (projections) | `mix_sessions`, inventory, checkout |
| **AllowanceBillingService** | `checkout_usage_projections` | session projections, allowance policies | `mix_sessions`, inventory |
| **PurchasingService** | `purchase_orders`, `purchase_order_lines` | vendors, products | inventory directly (delegates to InventoryLedgerService) |
| **ReplenishmentService** | `inventory_risk_projections` | `inventory_projections`, `stock_movements` (read) | purchase orders, inventory |
| **ExceptionService** | `backroom_exceptions` | session projections, inventory projections | sessions, inventory, formulas |
| **ProjectionService** | rebuilds of all projection tables | all event streams | source-of-truth tables |
| **AnalyticsService** | `backroom_analytics_snapshots`, `service_profitability_snapshots`, `staff_backroom_performance` | all projections | operational tables |
| **AIInsightService** | none (read-only) | analytics snapshots, projections | everything |

---

## Service Interaction Map

```text
MixSessionService
  ├── publishes → session_completed event
  │    ├── consumed by → InventoryLedgerService (posts usage to stock_movements)
  │    ├── consumed by → FormulaService (saves client formula history)
  │    ├── consumed by → AllowanceBillingService (computes checkout projection)
  │    └── consumed by → ExceptionService (creates missing_reweigh, manual_override exceptions)
  │
  └── publishes → all mix_session_events
       └── consumed by → ProjectionService (via DB trigger, updates projections)

InventoryLedgerService
  ├── publishes → stock_movements INSERT
  │    └── consumed by → ProjectionService (via DB trigger, updates inventory_projections)
  │
  └── called by → PurchasingService (on PO line receive)
       called by → MixSessionService completion handler
       called by → useStockTransfers (transfer posting)
       called by → useStockMovements (manual adjustments, counts, waste)

PurchasingService
  └── calls → InventoryLedgerService.postReceiving() on shipment receive

ReplenishmentService
  └── reads → InventoryProjection, stock_movements history
       publishes → reorder recommendations (consumed by UI, not PurchasingService directly)

ExceptionService
  └── called by → MixSessionService on completion (deterministic rules)
       called by → AnalyticsService on anomaly detection (daily)

AnalyticsService
  └── reads → all projections
       writes → reporting snapshots only

AIInsightService
  └── reads → analytics snapshots, projections
       writes → nothing
```

---

## Forbidden Cross-Domain Access

| Caller | Cannot |
|---|---|
| UI components | Write to `stock_movements`, `backroom_exceptions`, `client_formula_history` directly |
| MixSessionService | Write to `stock_movements` or `checkout_usage_projections` |
| InventoryLedgerService | Write to `mix_sessions`, `mix_bowls`, `client_formula_history` |
| FormulaService | Write to inventory, checkout, or session tables |
| AnalyticsService | Write to operational tables (`mix_sessions`, `stock_movements`, etc.) |
| AIInsightService | Write to any table |
| ProjectionService | Contain business logic; it only applies event→projection transforms |
| ReplenishmentService | Create purchase orders directly |

---

## Implementation Plan

### Phase 1: Create service modules
1. Create `src/lib/backroom/services/inventory-ledger-service.ts` — extract `stock_movements` INSERT logic from `useDepleteMixSession`, `useReceiveShipment`, `usePurchaseOrders`, `useStockTransfers`, `useStockMovements` into a single `postLedgerEntry()` / `postLedgerEntries()` function
2. Create `src/lib/backroom/services/formula-service.ts` — extract formula save logic from `useSaveFormulaHistory`
3. Create `src/lib/backroom/services/exception-service.ts` — extract exception creation/resolution from `useBackroomExceptions`
4. Create `src/lib/backroom/services/allowance-billing-service.ts` — wrap existing `calculateOverageCharge` + checkout projection write
5. Create `src/lib/backroom/services/purchasing-service.ts` — extract PO receiving from `usePurchaseOrders` + `useReceiveShipment`, delegates inventory posting to InventoryLedgerService
6. Move `mix-session-service.ts` into `services/` directory

### Phase 2: Refactor hooks to thin wrappers
7. Refactor `useDepleteMixSession` → calls `InventoryLedgerService.postUsageFromSession()`
8. Refactor `useReceiveShipment` → calls `PurchasingService.receiveShipmentLine()` which calls `InventoryLedgerService.postReceiving()`
9. Refactor `usePurchaseOrders` quick-receive → calls `PurchasingService.quickReceive()`
10. Refactor `useStockTransfers` → calls `InventoryLedgerService.postTransfer()`
11. Refactor `useStockMovements` → calls `InventoryLedgerService.postAdjustment()`
12. Refactor `useSaveFormulaHistory` → calls `FormulaService.saveFormula()`

### Phase 3: Wire completion handler
13. Update `MixSessionService` session_completed handler to orchestrate: InventoryLedgerService → FormulaService → AllowanceBillingService → ExceptionService in sequence

No database changes required — this is a code-only refactoring of where business logic lives.

---

## Risks If Boundaries Are Not Enforced

- Multiple hooks writing to `stock_movements` independently means no single place to add validation, auditing, or rate limiting
- Formula history can be saved from draft UI state if hooks are called directly
- Exception creation logic will duplicate across components
- Inventory posting logic already exists in 5 different hooks — any change to the ledger schema requires updating all 5
- AI service could accidentally be given write access as features expand

---

## Zura Core Services to Reuse

- **Auth context** (`useAuth`, `supabase.auth`) — do not duplicate user identity logic in services
- **Organization context** (`useOrganizationContext`) — services receive `orgId` as parameter, hooks provide it
- **Products query** (`useProducts`) — services read products, do not duplicate product queries
- **Staff/employee data** — reuse existing hooks for staff lookups, do not create backroom-specific staff tables

