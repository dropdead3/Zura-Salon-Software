

## Move "Allowance Needs To Be Set" Badge & Rename Column

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**1. Rename column header (line 674)**
Change `Product Allowance` to `Billing Method`. Update the tooltip description accordingly.

**2. Move "Allowance Needs To Be Set" badge into the Billing Method column (lines 782–803)**
Currently the Billing Method column only shows content when a policy is active. Update the logic to also show the amber "Allowance Needs To Be Set" badge when a policy exists with `billing_mode === 'allowance'` and `is_active === false`.

Updated logic for the Billing Method cell:
```
policy exists & active & parts_and_labor → blue "Parts and Labor" badge
policy exists & active & allowance with dollar value → Calculator + dollar amount
policy exists & !active & allowance → amber "Allowance Needs To Be Set" badge
otherwise → null
```

**3. Remove the duplicate badge from the Tracked column (lines 822–826)**
Remove the `Allowance Needs To Be Set` conditional branch from the Tracked column badge chain, since it now lives in the Billing Method column.

### Result
- Column renamed from "Product Allowance" to "Billing Method"
- "Allowance Needs To Be Set" badge appears in the correct column alongside other billing badges
- No duplicate badge in the Tracked column

