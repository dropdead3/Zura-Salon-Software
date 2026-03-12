

## Retail Products Settings — Gaps & Enhancements

After reviewing the full inventory tab, edge functions, notification infrastructure, and related hooks, here are the gaps and the plan to address them.

### Identified Gaps

1. **No configurable low-stock alert settings** — The `check-reorder-levels` cron fires alerts to `platform_notifications` but there is no UI to configure: threshold overrides per product, who receives alerts (roles/users), or which channels (in-app, email, push). The `NOTIFICATION_TYPES` map in `usePlatformNotifications.ts` doesn't even include `low_stock_alert`.

2. **No stock movement audit trail** — Stock adjustments via the +/- buttons and PO receipts silently update `quantity_on_hand` with no history log. There's no way to see *who* changed stock, *when*, or *why*.

3. **No inventory value summary** — The inventory tab shows per-product stock but no aggregate: total inventory value (cost × qty), total retail value, or shrinkage indicators.

---

### Plan

#### 1. Low Stock Alert Configuration Card (primary ask)

**Database: `inventory_alert_settings` table**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | |
| enabled | BOOLEAN DEFAULT true | Master toggle |
| default_threshold_pct | INT DEFAULT 100 | % of reorder_level that triggers alert (100 = at level, 150 = 50% above) |
| alert_channels | TEXT[] | `{'in_app','email'}` |
| recipient_user_ids | UUID[] | Specific users; empty = all admins/managers |
| recipient_roles | TEXT[] | e.g. `{'admin','manager'}` |
| auto_create_draft_po | BOOLEAN DEFAULT true | Auto-generate draft POs |
| created_at / updated_at | TIMESTAMPTZ | |

RLS: org-member read, org-admin write.

**Edge function update: `check-reorder-levels`**
- Read `inventory_alert_settings` for each org to determine threshold, channels, and recipients.
- When `recipient_user_ids` is set, create targeted notifications (with `recipient_id`). Otherwise use current broadcast behavior.
- When email channel enabled, send a summary email to configured recipients via `sendOrgEmail`.

**Register `low_stock_alert` in `NOTIFICATION_TYPES`** so it appears in the platform notification preferences UI.

**New UI: "Alert Settings" card** in the Inventory tab (above the stock table)
- Collapsible card with:
  - Enable/disable toggle
  - Threshold slider (e.g. "Alert when stock falls to ___ % of reorder level")
  - Channel checkboxes: In-app, Email
  - Recipient picker: multi-select of org users (filtered to admins/managers by default) with a "All admins & managers" shortcut
  - Auto-create draft PO toggle
- Persisted via a new `useInventoryAlertSettings` hook

**New hook: `src/hooks/useInventoryAlertSettings.ts`** — CRUD for the settings table, scoped by org.

#### 2. Stock Movement Audit Log

**Database: `stock_movements` table**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | |
| product_id | UUID FK → products | |
| quantity_change | INT | +/- delta |
| quantity_after | INT | Snapshot after change |
| reason | TEXT | 'manual_adjust', 'po_received', 'sale', 'return', 'correction' |
| notes | TEXT | Optional |
| created_by | UUID FK → auth.users | |
| created_at | TIMESTAMPTZ | |

RLS: org-member read, authenticated insert.

**Code changes:**
- Wrap `adjustStock` in `InventoryByLocationTab` to also insert a `stock_movements` row.
- Update `useMarkPurchaseOrderReceived` to log a movement with reason `po_received`.
- Add a small "History" icon button per product row that opens a popover/dialog showing recent movements.

**New hook: `src/hooks/useStockMovements.ts`** — Query movements by product, insert on adjustments.

#### 3. Inventory Value Summary Bar

Add a summary row above the inventory table showing:
- **Total Units**: sum of `quantity_on_hand`
- **Cost Value**: sum of `cost_price × quantity_on_hand`
- **Retail Value**: sum of `retail_price × quantity_on_hand`
- **Low Stock Count**: count of products at/below reorder level

Computed client-side from the already-fetched products array — no new queries needed. Rendered as a compact stats bar with `BlurredAmount` wrapping for the monetary values.

---

### File Summary

| File | Action |
|------|--------|
| Migration SQL | Create `inventory_alert_settings` + `stock_movements` tables with RLS |
| `src/hooks/useInventoryAlertSettings.ts` | New — CRUD for alert config |
| `src/hooks/useStockMovements.ts` | New — query/insert stock movements |
| `src/hooks/usePlatformNotifications.ts` | Add `low_stock_alert` to `NOTIFICATION_TYPES` |
| `src/hooks/usePurchaseOrders.ts` | Log stock movement on PO receipt |
| `supabase/functions/check-reorder-levels/index.ts` | Read alert settings, route to recipients, optional email |
| `src/components/dashboard/settings/inventory/AlertSettingsCard.tsx` | New — configurable alert UI |
| `src/components/dashboard/settings/inventory/StockMovementHistory.tsx` | New — per-product audit log popover |
| `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` | Add AlertSettingsCard, inventory value summary bar, stock movement logging, history button |

