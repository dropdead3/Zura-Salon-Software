

# Add Yearly Revenue & Savings Projections to Backroom Paywall

## Overview
Add yearly projections for additional revenue (supply fee recovery) and savings (waste reduction) to the existing sales page, making the annual impact impossible to ignore.

## Changes — `BackroomPaywall.tsx` only

### 1. Add yearly calculation variables (after existing savings calculations ~line 93)
```ts
const yearlySavings = totalSavings * 12;
const yearlyWasteSavings = wasteSavings * 12;
const yearlySupplyRecovery = supplyRecovery * 12;
const yearlyCost = monthlyTotal * 12;
const yearlyNetBenefit = netBenefit * 12;
```

### 2. Add "Estimated Annual Impact" section
Insert a new card between the Savings projection section and the Pricing Overview card (~after line 329). This card will show:

- **Yearly additional revenue** (supply fee recovery × 12) — large animated number, emerald accent
- **Yearly waste savings** (waste reduction × 12)
- **Total annual benefit** (combined)
- **Yearly Backroom cost** vs yearly benefit comparison
- A visual bar showing annual cost vs annual savings

Design: A gradient-accented card with two large KPI numbers side by side ("Additional Revenue" and "Waste Savings"), a divider, then the total annual net benefit as a hero number.

### 3. Update the net benefit hero banner (~line 169)
Add a secondary line under the monthly net benefit: "That's **$X/year** in additional revenue & savings" using `yearlyNetBenefit`.

### 4. Update the ROI callout at bottom (~line 541)
Add yearly figure: "{formatCurrency(yearlyCost)}/yr cost → {formatCurrency(yearlySavings)}/yr in savings & revenue."

### 5. Update CTA button text (~line 517)
When yearly benefit is large, show yearly figure instead: "Unlock $X/year in savings →"

## No other files need changes
All calculations derive from existing `estimate` data — just multiply by 12.

