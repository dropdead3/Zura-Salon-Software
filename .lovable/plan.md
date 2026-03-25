

## Show Linked Components in Wizard Service Rows

### Problem
After linking a product, the row only shows "2 linked" as a badge — the user can't see **which** products are linked.

### Solution
Enhance `WizardComponentRow` to fetch its linked components (with product names) and display them as removable chips below the service name.

### Changes — `ServiceTrackingQuickSetup.tsx`

**1. Add `useServiceTrackingComponents` and `useDeleteTrackingComponent` imports**

**2. Inside `WizardComponentRow`, fetch linked components for that service**
```tsx
const { data: linked } = useServiceTrackingComponents(serviceId);
```

**3. Fetch product names to resolve `product_id` → name**
Already have the `backroomProducts` query — build a lookup map from it.

**4. Render linked products as small chips below the service name**
```text
┌─────────────────────────────────────────────────┐
│  3+ Color Blocks / Calico Placement   [2 linked]│
│  ┌──────────────┐ ┌─────────────────┐           │
│  │ Lightener  ✕ │ │ Developer 20V ✕ │           │
│  └──────────────┘ └─────────────────┘           │
│                              [Link Product]     │
└─────────────────────────────────────────────────┘
```

Each chip shows the product name with an `X` button to unlink (calls `useDeleteTrackingComponent`). Styled as `text-[10px] bg-muted/50 rounded-full px-2 py-0.5` with an inline `X` icon.

**5. Replace the `linkedCount` prop with live data**
Use `linked?.length` instead of the parent-provided count, so the badge updates reactively after mutations.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingQuickSetup.tsx` (`WizardComponentRow` component)

