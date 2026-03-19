

# Add Info Tooltips to Lead Time and MOQ Labels

## What
Add a `MetricInfoTooltip` icon next to every "Lead Time (days)" and "MOQ" label across all supplier forms, explaining what each term means on hover.

## Tooltip Content

- **Lead Time (days)**: "Average number of days between placing an order with this supplier and receiving the delivery. Used to calculate reorder points and safety stock."
- **MOQ**: "Minimum Order Quantity — the smallest number of units this supplier will accept per order. Purchase orders are automatically rounded up to meet this threshold."

## Files to Update (5 files, same pattern in each)

Each file gets `import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip'` and wraps the Label text + tooltip in a `flex items-center gap-1.5` div.

1. **`src/components/dashboard/backroom-settings/AddSupplierWizard.tsx`** — lines 394, 403
2. **`src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx`** — lines 676, 680
3. **`src/components/dashboard/backroom-settings/SupplierSettingsSection.tsx`** — lines 345, 349
4. **`src/components/dashboard/backroom-settings/inventory/SupplierAssignDialog.tsx`** — lines 141, 145
5. **`src/components/dashboard/settings/inventory/SupplierDialog.tsx`** — lines 130, 140

### Pattern (applied identically)

**Before:**
```tsx
<Label>Lead Time (days)</Label>
```

**After:**
```tsx
<div className="flex items-center gap-1.5">
  <Label>Lead Time (days)</Label>
  <MetricInfoTooltip description="Average number of days between placing an order and receiving delivery. Used to calculate reorder points and safety stock." />
</div>
```

Same for MOQ with its respective description.

