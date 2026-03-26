

## Build "Your Savings" Dashboard — Backroom Value & ROI Center

### Problem
The existing `BackroomROICard` is a small card buried in the subscription page. Salon owners can't easily see how the backroom is saving them money, making it easy to question the subscription value. We need a prominent, transparent savings dashboard that builds retention by showing real data-driven value.

### Approach
Create a dedicated **"Your Savings"** section in the Backroom Hub sidebar (under Operations) that consolidates and expands on the existing ROI logic. Unlike the current card, this will break down *each savings category* with plain-English explanations of how every number is calculated.

### Data Sources (already available — no new tables needed)
- **`backroom_analytics_snapshots`**: waste_pct, total_product_cost, ghost_loss_cost, total_waste_qty, avg_chemical_cost_per_service
- **`checkout_usage_charges`**: supply cost recovery (recouped overage charges)
- **`useBackroomROI`**: existing waste reduction vs baseline calculation
- **`useSupplyCostRecovery`**: existing overage charge aggregation

### Savings Categories (with transparent formulas)

| Category | Calculation | Plain English |
|----------|------------|---------------|
| **Waste Reduction** | (12% baseline - your actual waste%) × avg daily product cost × 30 | "Industry average waste is 12%. Your backroom tracks at X%. That difference saves you $Y/month." |
| **Ghost Product Recovery** | Sum of ghost_loss_cost from snapshots | "Product that went missing without being logged. Zura caught $X worth." |
| **Supply Cost Recovery** | Sum of approved checkout_usage_charges | "Overage charges collected from clients when they exceed their service allowance." |
| **Cost-per-Service Visibility** | Qualitative — show avg cost/service trend | "Knowing your true cost per service helps you price correctly. Your avg is $X." |

### UI Design

**Hero Section**: Large "Total Estimated Savings" number with a subtitle like "Based on X days of your real usage data" and a progress ring or bar showing savings vs subscription cost.

**Breakdown Cards**: Each savings category gets its own card with:
- Icon + label + dollar amount
- A small "How is this calculated?" expandable section (Collapsible) with the formula in plain language
- Trend indicator (up/down vs prior period when enough data exists)

**"How We Calculate" Footer**: A single collapsible panel explaining the industry baseline assumption (12% waste rate) and data sources, so owners trust the numbers.

**Not Enough Data State**: Warm message with a progress indicator (X of 7 days) — reuses the existing pattern from `BackroomROICard`.

### Changes

| File | Action |
|------|--------|
| `src/pages/dashboard/admin/BackroomSettings.tsx` | Add `'savings'` to `BackroomSection` union; add sidebar entry with `Coins` icon under Operations |
| `src/hooks/backroom/useBackroomSavings.ts` | **New** — unified hook combining `useBackroomROI` logic + `useSupplyCostRecovery` into a single categorized breakdown |
| `src/components/dashboard/backroom-settings/BackroomSavingsSection.tsx` | **New** — full savings dashboard with hero total, category cards, formula explanations, and subscription comparison |

### Result
Salon owners get a dedicated "Your Savings" page showing exactly how much money the backroom is saving them, with transparent formulas they can verify. This directly supports retention by making the cost-benefit undeniable.

