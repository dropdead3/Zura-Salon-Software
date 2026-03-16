

# Hardware Order Tracking System

## Context

When a customer checks out with scales, the `checkout.session.completed` webhook already knows the `scale_count` and `organization_id`. Currently this data is stored only in entitlements — there is no record of the physical hardware order itself or its fulfillment status.

## What We Build

A lightweight `hardware_orders` table and a platform admin UI tab to track fulfillment of physical scale orders. Orders are auto-created from the existing Stripe webhook on checkout completion.

---

## 1. Database Migration

**New table: `hardware_orders`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | references organizations |
| stripe_checkout_session_id | TEXT | from webhook |
| stripe_subscription_id | TEXT | nullable |
| item_type | TEXT | default 'precision_scale' |
| quantity | INT | |
| unit_price_cents | INT | 19900 |
| fulfillment_status | ENUM | `pending` → `processing` → `shipped` → `delivered` |
| shipping_carrier | TEXT | nullable |
| tracking_number | TEXT | nullable |
| shipped_at | TIMESTAMPTZ | nullable |
| delivered_at | TIMESTAMPTZ | nullable |
| shipping_address | JSONB | nullable |
| notes | TEXT | nullable |
| created_at / updated_at | TIMESTAMPTZ | |

RLS: Platform users can SELECT/UPDATE. Org admins can SELECT their own orders.

## 2. Webhook Enhancement

**File:** `supabase/functions/stripe-webhook/index.ts`

In `handleCheckoutCompleted`, after creating entitlements, insert a `hardware_orders` row when `scaleCount > 0`:

```typescript
if (scaleCount > 0) {
  await supabase.from('hardware_orders').insert({
    organization_id: orgId,
    stripe_checkout_session_id: session.id,
    stripe_subscription_id: stripeSubId,
    item_type: 'precision_scale',
    quantity: scaleCount,
    unit_price_cents: 19900,
    fulfillment_status: 'pending',
  });
}
```

## 3. Platform Admin UI — "Hardware Orders" Tab

**New tab** on the BackroomAdmin page (`/dashboard/platform/backroom`):

- **File:** `src/components/platform/backroom/HardwareOrdersTab.tsx`
- Table columns: Org Name, Qty, Status (badge), Ordered Date, Tracking #, Actions
- Inline status update dropdown (pending → processing → shipped → delivered)
- Tracking number + carrier fields editable when status is `shipped`
- KPI cards at top: Pending count, Processing count, Shipped (last 30d)

**Modify:** `src/pages/dashboard/platform/BackroomAdmin.tsx` — add the new tab with a `Package` icon.

## 4. Org-Facing Order Status (Optional, Phase 2)

A read-only "My Orders" section in backroom settings so org admins can see shipping status. Not in this initial scope.

---

## Technical Notes

- The `add-backroom-scales` edge function (for adding scales to existing subscriptions) should also create a `hardware_orders` row — will check and wire up.
- Fulfillment status enum: `pending`, `processing`, `shipped`, `delivered`, `cancelled`.
- Updated_at trigger using existing `update_backroom_updated_at()` function.

