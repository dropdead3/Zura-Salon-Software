

# Wire Control Tower Alerts to Deep-Link Sub-Tabs

## Current State

There are two places where Control Tower alerts navigate:

1. **`BackroomDashboardOverview` → `AlertRow`** — Uses `categoryToSection` map and calls `onNavigate()` which supports the `section:tab` format (e.g., `inventory:reorder`). Currently maps categories to top-level sections only (no sub-tabs).

2. **`ControlTowerAlertCard`** — Used in the standalone `BackroomControlTower` widget (Command Center). Uses `react-router navigate()` with `alert.actionRoute` from the engine. Current routes are generic (`/dashboard/inventory`, `/dashboard/backroom/exceptions`, etc.).

3. **`control-tower-engine.ts`** — Builds `actionRoute` per alert type. Currently points to broad pages, not sub-tabs within BackroomSettings.

## Changes

### 1. `BackroomDashboardOverview.tsx` — `AlertRow` component
Update the `categoryToSection` map to include sub-tab targets:

| Category | Current | New |
|----------|---------|-----|
| `inventory` | `inventory` | `inventory:stock` |
| `exception` | `alerts` | `alerts` |
| `profitability` | `insights` | `insights` |
| `waste` | `insights` | `insights` |
| `staff` | `insights` | `insights` |
| `reorder` | `suppliers` | `inventory:reorder` |

Reorder alerts should go to the Inventory reorder queue (where actionable reorder items live), not suppliers.

### 2. `control-tower-engine.ts` — Update `actionRoute` values
Update the routes so the standalone `ControlTowerAlertCard` also navigates to the correct backroom sub-section:

| Builder | Current Route | New Route |
|---------|--------------|-----------|
| `buildInventoryAlerts` | `/dashboard/inventory` | `/dashboard/admin/backroom-settings?category=inventory&tab=stock` |
| `buildExceptionAlerts` | `/dashboard/backroom/exceptions` | `/dashboard/admin/backroom-settings?category=alerts` |
| `buildProfitabilityAlerts` | `/dashboard/backroom/analytics` | `/dashboard/admin/backroom-settings?category=insights` |
| `buildStaffAlerts` | `/dashboard/backroom/staff-performance` | `/dashboard/admin/backroom-settings?category=insights` |
| `buildReorderAlerts` | `/dashboard/inventory/orders` | `/dashboard/admin/backroom-settings?category=inventory&tab=reorder` |

### Files

| File | Change |
|------|--------|
| `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx` | Update `categoryToSection` map in `AlertRow` to use sub-tab format |
| `src/lib/backroom/control-tower-engine.ts` | Update `actionRoute` in all 5 alert builders to point to backroom-settings with correct query params |

