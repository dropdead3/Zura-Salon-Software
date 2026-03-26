

## Enhance Remove Brand — Restore, Grace Period, Audit Trail

### Overview
Three enhancements to the brand removal feature: an "Archived Brands" view for restoration, a 24-hour grace period with undo, and an audit log entry for compliance.

### 1. Database Migration

Add columns to `products` table to support grace period tracking:
- `deactivated_at` (timestamptz, nullable) — set when brand is removed, used for grace period countdown
- `deactivated_by` (uuid, nullable) — who performed the removal

No new tables needed — archived brands are derived by querying `products` where `is_active = false AND product_type = 'Supplies'`.

### 2. Audit Log Entry on Removal

In `removeBrandMutation.onSuccess`, call `useLogAuditEvent` (from `useAppointmentAuditLog`) — actually, brand removal is an org-level action, so use `useLogPlatformAction` from `usePlatformAuditLog`:
- `action: 'brand_removed'`
- `entityType: 'brand'`
- `entityId: brand name`
- `details: { product_count, location_count, deactivated_at }`

Add `brand_removed` and `brand_restored` to `AUDIT_ACTION_CONFIG` in `usePlatformAuditLog.ts`.

### 3. Grace Period (24h Soft-Delete Window)

Update `removeBrandMutation` to also set `deactivated_at = now()` and `deactivated_by = user.id` on the products when deactivating.

After removal, show a persistent toast: "Brand removed. You can restore it within 24 hours from the Archived view."

The `location_product_settings` deletion happens immediately (as now), but since the products are soft-deleted and `deactivated_at` is tracked, restoration within 24h is straightforward.

### 4. Archived Brands View & Restore

Add an "Archived" toggle/tab in the brand grid header (next to search):
- Small ghost button with `Archive` icon + count badge
- When active, queries `products` where `is_active = false AND product_type = 'Supplies'` grouped by brand
- Each archived brand card shows: brand name, product count, time since removal, and grace period remaining (if < 24h)
- **"Restore" button** on each card opens a confirmation dialog:
  - Sets `is_active = true`, clears `deactivated_at` and `deactivated_by`
  - Does NOT re-create `location_product_settings` — admin must re-track from the catalog
  - Shows info: "Products will be restored to the catalog but will need to be re-tracked at each location"
- After 24h, archived brands still show but labeled "Archived" (no grace period badge) — restore is still possible, just without the "within grace period" urgency

### 5. Audit Config Updates

In `usePlatformAuditLog.ts`, add to `AUDIT_ACTION_CONFIG`:
```typescript
brand_removed: { label: 'Brand Removed', color: 'rose', verb: 'removed brand' },
brand_restored: { label: 'Brand Restored', color: 'emerald', verb: 'restored brand' },
```

### Files Summary

| File | Action |
|------|--------|
| Database migration | Add `deactivated_at`, `deactivated_by` to `products` |
| `BackroomProductCatalogSection.tsx` | Archived brands view, restore mutation, grace period display, audit logging on remove/restore |
| `src/hooks/usePlatformAuditLog.ts` | Add `brand_removed` + `brand_restored` to action config |

