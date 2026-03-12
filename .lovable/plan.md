

# Enhancement 1: Expiry Tracking

Add expiry date tracking to products with auto-clearance triggers for items nearing expiration, visual alerts in the product table, and an analytics card surfacing soon-to-expire inventory.

---

## Database Migration

Add two columns to the `products` table:

```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS expires_at DATE,
  ADD COLUMN IF NOT EXISTS expiry_alert_days INTEGER DEFAULT 30;
```

- `expires_at`: optional expiration date for perishable or time-sensitive products
- `expiry_alert_days`: per-product threshold (default 30) for when to start alerting

No new tables needed. No RLS changes (existing product policies cover these columns).

---

## Product Form (ProductFormDialog)

**File:** `src/components/dashboard/settings/RetailProductsSettingsContent.tsx`

- Add `expires_at` and `expiry_alert_days` fields to the form state
- Add a date input for "Expiration Date" and a number input for "Alert Threshold (days)" below the existing reorder/par fields
- Wire both fields into `handleSubmit` so they persist on save

---

## Product Table Column

**File:** `src/components/dashboard/settings/RetailProductsSettingsContent.tsx`

- Add an "Expiry" column to the products table (between Stock and Actions)
- Display the date with color coding:
  - **Red** badge: expired or expires within alert threshold
  - **Amber** badge: expires within 2x alert threshold
  - **No badge**: no expiry set or far out
- Tooltip showing exact date and days remaining

---

## useProducts Hook Update

**File:** `src/hooks/useProducts.ts`

- Add `expires_at` and `expiry_alert_days` to the `Product` interface
- Add optional `expiringOnly` filter to `ProductFilters` that filters products expiring within their alert window
- Include both fields in `useCreateProduct` insert data

---

## Expiry Alerts Analytics Card

**File:** `src/components/dashboard/analytics/ExpiryAlertCard.tsx` (new)

- Query products where `expires_at` is set and within the alert window
- Group into three buckets: "Expired", "Critical" (within alert threshold), "Warning" (within 2x threshold)
- Show product name, expiry date, quantity on hand, and estimated loss (cost_price x qty)
- Include a "Mark for Clearance" action button for items approaching expiry (reuse the pattern from `DeadStockAlertCard`)
- Pin-able via `PinnableCard`

---

## Wire into Analytics Hub

**File:** `src/components/dashboard/analytics/RetailAnalyticsContent.tsx`

- Import and render `ExpiryAlertCard` in the retail analytics section alongside the existing Dead Stock and Replenishment cards
- Pass products data and filter context

---

## Auto-Clearance Suggestion Logic

Within the `ExpiryAlertCard`, suggest discount tiers based on proximity to expiry:
- **Within alert threshold but not expired**: suggest 25% markdown
- **Expired**: suggest 50% markdown
- One-click action uses existing `useUpdateProduct` to set `clearance_status: 'discounted'`

---

## Technical Details

| Layer | Artifact |
|-------|----------|
| DB | Migration: add `expires_at DATE`, `expiry_alert_days INTEGER DEFAULT 30` to products |
| Hook | Update `Product` interface and `useCreateProduct`; add `expiringOnly` filter |
| Component (new) | `ExpiryAlertCard.tsx` — analytics card for expiry alerts |
| Component (edit) | `ProductFormDialog` — add expiry date + alert days inputs |
| Component (edit) | Products table — add Expiry column with color-coded badges |
| Component (edit) | `RetailAnalyticsContent.tsx` — wire ExpiryAlertCard |

