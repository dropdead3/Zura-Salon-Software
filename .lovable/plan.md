

# Intelligent ROI Calculator for Backroom Paywall

## Concept
Transform the static paywall into a data-driven sales page by pulling the salon's actual color service appointment history, calculating their real Backroom cost, and projecting savings from waste reduction and supply fee pass-through. The goal: show them "here's what you spend, here's what you save, here's your net."

## Data Strategy

### New Hook: `useBackroomPricingEstimate`
Query `phorest_appointments` for the salon's last 90 days of appointments, filter using `isColorOrChemicalService()` to count color/chemical services. From that:

- **Monthly color service count** = total color appointments / 3
- **Estimated usage fee** = monthly count x $0.50
- **Estimated total monthly cost** = ($20 x selected locations) + usage fee + scale licenses

Also query `phorest_transaction_items` for the salon's average product cost per color service (items with type `product` on color appointment dates) to estimate:

- **Avg product cost per service** (what they currently spend on color product)
- **Monthly product spend** = avg cost x monthly service count
- **Waste savings** = monthly product spend x 12% (industry baseline waste rate)
- **Supply fee recovery** = avg product cost x monthly service count (if they charge clients)
- **Net monthly benefit** = savings + recovery - Backroom cost

### Fallback
If < 30 days of appointment data, show industry averages instead (e.g., "Average salon with 2 stylists does ~80 color services/month") with a note that estimates will refine once data syncs.

## UI Changes to `BackroomPaywall.tsx`

### New Section: "Your Salon's Numbers" (inserted between pricing overview and location selector)
A card that shows:

```text
┌─────────────────────────────────────────────────┐
│  📊 Your Salon's Numbers                        │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │  ~142        │  │  $2,840      │             │
│  │  color appts │  │  product     │             │
│  │  per month   │  │  spend/mo    │             │
│  └──────────────┘  └──────────────┘             │
│                                                  │
│  Estimated Backroom Cost                        │
│  Location base (2)        $40/mo                │
│  Usage fee (~142 appts)   $71/mo                │
│  Scale license (1)        $10/mo                │
│  ─────────────────────────────────              │
│  Total                    $121/mo               │
│                                                  │
│  Projected Monthly Savings                      │
│  Waste reduction (12%)    -$341                  │
│  Supply fee recovery*     -$2,840               │
│  ─────────────────────────────────              │
│  Net benefit              +$3,060/mo            │
│                                                  │
│  * If you charge clients avg product cost       │
│                                                  │
│  ✅ Backroom pays for itself 25× over           │
└─────────────────────────────────────────────────┘
```

Key design choices:
- Large animated counter for the net benefit ("You could save $X/mo") — hero-level emphasis
- The supply fee recovery line includes a toggle or footnote explaining it's optional (when salons add a supply/chemical fee to services)
- ROI multiplier badge (e.g., "25× return") shown prominently
- If data is loading, skeleton shimmer; if insufficient data, show editable manual inputs (stylist count + avg services/stylist)

### Refinements to Existing Sections
- **Pricing Overview card**: Add subtext "Based on your ~142 monthly color services, your usage fee is ~$71/mo"
- **ROI callout at bottom**: Replace static "$375/mo" with the calculated value
- **CTA button area**: Add a one-liner like "Start saving $3,060/mo →"

## Files to Change

1. **New: `src/hooks/backroom/useBackroomPricingEstimate.ts`**
   - Query `phorest_appointments` for last 90 days, filter with `isColorOrChemicalService`
   - Query `phorest_transaction_items` for avg product cost on color service dates
   - Return: `monthlyColorServices`, `avgProductCostPerService`, `monthlyProductSpend`, `estimatedWasteSavings`, `estimatedSupplyRecovery`, `hasRealData`

2. **Modified: `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`**
   - Import and use the new hook
   - Add "Your Salon's Numbers" card with real data
   - Add dynamic cost breakdown that updates as locations/scales change
   - Add savings projection section with waste + supply fee recovery
   - Update ROI callout with calculated values
   - Update CTA text with personalized savings number
   - Add manual input fallback (stylist count slider) when no appointment data

## Technical Details

- Color service detection uses existing `isColorOrChemicalService()` from `serviceCategorization.ts`
- Product cost estimation joins on `transaction_date` matching appointment dates and `item_type` in product types
- All calculations are client-side from cached query data
- The hook uses `useBackroomOrgId()` for org resolution and `useLocations` for location filtering
- Batched fetching pattern (existing `fetchAllBatched` approach) to handle >1000 appointments

