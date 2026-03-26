

## Use After-Markup Cost for Allowance + Vish 6–10% Health Check

### Problem
Currently the Allowance Calculator uses **wholesale cost_per_gram** to compute the dollar allowance. Vish uses the **after-markup cost** (retail cost per gram). Additionally, Vish guidance says the total product allowance should be 6–10% of the service price (8% target). If outside that range, either product usage is too high or the service is underpriced.

### Changes

#### 1. New Utility: `src/lib/backroom/allowance-health.ts`

Pure functions for allowance-to-service-price health analysis:

```typescript
interface AllowanceHealthInput {
  allowanceAmount: number;   // dollar allowance (after markup)
  servicePrice: number;      // service price
}

interface AllowanceHealthResult {
  allowancePct: number;        // allowance / service price × 100
  targetPct: number;           // 8
  lowerBound: number;          // 6
  upperBound: number;          // 10
  status: 'healthy' | 'high' | 'low';
  message: string;             // human-readable guidance
  suggestedServicePrice: number | null;  // if high, what price would hit 8%
  suggestedAllowance: number | null;     // if low, what allowance would hit 8%
}
```

- `calculateAllowanceHealth(input)` — returns status + suggestions
- `calculateRetailCostPerGram(wholesaleCpg, markupPct)` — applies markup: `cpg × (1 + markup/100)`

#### 2. Update `AllowanceCalculatorDialog.tsx`

**Data changes:**
- Add `markup_pct` to the `CatalogProduct` interface and the products query (line 137)
- Add `servicePrice` prop to the dialog; pass from `ServiceTrackingSection`
- Fetch org-level `default_product_markup_pct` from `backroom_billing_settings` as fallback

**Cost calculation changes:**
- Update `getCostPerGram` → `getRetailCostPerGram` — applies per-product `markup_pct` (falling back to org default) to the wholesale cost
- `BowlLine.costPerGram` becomes the after-markup rate
- All line costs, bowl totals, and grand total now reflect retail cost (after markup)
- Display shows "Retail cost" language instead of raw wholesale

**Health indicator in footer:**
- Below the Total Allowance, show the allowance-as-%-of-service-price with a color-coded status:
  - Green (6–10%): "Healthy — allowance is X% of service price"
  - Amber (>10%): "High — product cost is X% of service price. Consider raising service price to $Y or reducing product usage"
  - Blue (<6%): "Low — allowance is only X% of service price. You may have room to increase product quality"
- If no service price is available, show a muted note: "Add a service price to see allowance health"

#### 3. Update `ServiceTrackingSection.tsx`

- Add `price` (or `base_price`) to the services query at line 159
- Pass `servicePrice={service.price}` to `AllowanceCalculatorDialog`

#### 4. Update `allowance-billing.ts`

- Add `calculateRetailCostPerGram` as a re-export from `allowance-health.ts` for billing engine consumers
- No changes to overage calculation logic (that already uses its own markup pipeline)

### Files Summary

| File | Action |
|------|--------|
| `src/lib/backroom/allowance-health.ts` | **New** — health check utilities |
| `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx` | Use retail (after-markup) cost per gram; add health indicator in footer |
| `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` | Pass `servicePrice` prop to calculator dialog |

### Why This Matters
This aligns the allowance calculation with Vish's methodology — the allowance represents what the salon is "giving away" at retail value, not wholesale. The 6–10% health check gives operators immediate feedback on whether their pricing structure protects margins.

