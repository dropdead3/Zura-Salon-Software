

## Auto-Reorder with Supplier Communication

### What This Adds

A new **auto-reorder mode** that goes beyond creating draft POs — it automatically calculates the right quantity and sends the PO to the supplier without human intervention. Organizations opt in and configure the behavior.

### Current State

- `check-reorder-levels` already detects low stock and can auto-create **draft** POs
- No concept of MOQ, target/par stock level, or auto-send
- Products only have `reorder_level` (min threshold) — no target quantity to restock to
- No MOQ field on `product_suppliers`

### Plan

**1. Database: Add new columns**

Migration to add:
- `products.par_level` (INT, nullable) — desired stock level to reorder up to
- `product_suppliers.moq` (INT, default 1) — minimum order quantity from this supplier
- `inventory_alert_settings.auto_reorder_enabled` (BOOL, default false) — master toggle for auto-send
- `inventory_alert_settings.auto_reorder_mode` (TEXT, default 'to_par') — `'to_par'` (restock to par level) or `'moq_only'` (order exactly MOQ)

**2. Edge function: Update `check-reorder-levels`**

When `auto_reorder_enabled` is true for an org:
- Calculate quantity: `max(moq, par_level - quantity_on_hand)`, rounded up to MOQ multiples
- Create the PO with status `'sent'` instead of `'draft'`
- Immediately invoke `send-reorder-email` for each supplier group
- Log a notification confirming auto-reorder was executed

When false, keep current behavior (draft POs only).

**3. UI: Update `AlertSettingsCard`**

Add a new section below "Auto-create draft POs":
- **Auto-reorder toggle** — "Automatically send POs to suppliers" (disabled unless auto-create-draft is on)
- **Mode selector** — radio group: "Restock to par level" vs "Order minimum quantity (MOQ)"
- Warning text: "POs will be sent to suppliers without manual review"

**4. UI: Add par level + MOQ fields**

- Product edit dialog: add `Par Level` field next to existing `Reorder Level`
- Supplier edit form: add `MOQ` field

**5. Quantity calculation logic** (in edge function)

```text
deficit = par_level - quantity_on_hand
if deficit <= 0: skip (already at or above par)
order_qty = max(moq, deficit)
if moq > 1: round order_qty up to nearest MOQ multiple
```

If `par_level` is null, fall back to `reorder_level * 2` (current behavior).

### Suggested Enhancements (bundled)

1. **Reorder history log** — Add `auto_reorder` as a `stock_movements` reason so every auto-triggered PO is auditable
2. **Spend cap / daily limit** — A `max_auto_reorder_value` field on alert settings to prevent runaway spending (auto-reorder pauses if cumulative daily PO value exceeds cap)
3. **Supplier confirmation tracking** — A `supplier_confirmed_at` timestamp on POs so you can track which suppliers acknowledged receipt

### File Summary

| File | Action |
|------|--------|
| Migration SQL | Add `par_level` to products, `moq` to product_suppliers, `auto_reorder_enabled`/`auto_reorder_mode`/`max_auto_reorder_value` to inventory_alert_settings |
| `supabase/functions/check-reorder-levels/index.ts` | Add auto-send logic with MOQ/par calculation |
| `src/components/dashboard/settings/inventory/AlertSettingsCard.tsx` | Add auto-reorder toggle, mode selector, spend cap |
| `src/hooks/useInventoryAlertSettings.ts` | Update interface for new fields |
| Product edit dialog | Add par level input |
| Supplier edit form | Add MOQ input |

