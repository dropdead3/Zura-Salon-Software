

# Wire Service Price Uplift into Income Opportunity

## Problem
The "Monthly Uplift" currently calculates only `currentRevenue × (nextCommissionRate - currentCommissionRate)`. This misses a major component: when a stylist levels up, their **service prices also increase** (via `service_level_prices`). The uplift should reflect both the higher commission rate *and* the higher prices the stylist would charge.

## Approach
Create a dedicated hook that fetches the stylist's recent service mix (from appointments) and the price differentials between their current and next level (from `service_level_prices`). It computes a "price-adjusted" monthly revenue estimate and combines both uplift sources.

## Calculation Logic

```text
For each service the stylist performed in the evaluation window:
  currentPrice  = service_level_prices[currentLevelId][serviceId] ?? service.price
  nextPrice     = service_level_prices[nextLevelId][serviceId] ?? currentPrice
  priceDelta    = nextPrice - currentPrice
  serviceVolume = count of completed appointments for this service in window

Revenue at next level  = Σ (nextPrice × serviceVolume)
Revenue at current     = Σ (currentPrice × serviceVolume)  ← actual current revenue

Commission uplift = revenueAtNextLevel × nextCommRate - revenueAtCurrentLevel × currentCommRate
Monthly uplift    = commission uplift (normalized to 30 days)
```

This captures both effects: higher prices generate more gross revenue, *and* a higher commission rate is applied to that larger number.

## Changes

### 1. New Hook: `src/hooks/useLevelUpliftEstimate.ts`
- Accepts `userId`, `currentLevelId`, `nextLevelId`, `currentCommRate`, `nextCommRate`, `evaluationWindowDays`
- Fetches stylist's completed appointments in the window (grouped by `service_id` with count + avg price)
- Fetches `service_level_prices` for both current and next level
- Returns: `{ priceUplift, commissionUplift, totalMonthlyUplift, serviceMix }`
- `priceUplift` = extra revenue from price increases × nextCommRate
- `commissionUplift` = current revenue × rate delta
- `totalMonthlyUplift` = combined

### 2. Update: `src/components/coaching/LevelProgressCard.tsx`
- Replace the inline `monthlyUplift = monthlyRevenue * (nextSvcRate - currentSvcRate)` with the hook
- Show the combined uplift amount
- Optionally break out "from higher prices" vs "from higher commission" in a tooltip or sub-line

### 3. Update: `src/components/dashboard/StylistScorecard.tsx`
- Same replacement in the `commissionInfo` memo — use the hook's `totalMonthlyUplift`
- Keep the commission rate display as-is, just fix the dollar uplift number

### 4. Update: `src/components/coaching/ReportBuilder.tsx`
- Update the report text to reflect the combined uplift calculation

## UI Display
The "Income Opportunity" section stays the same visually — Commission Today / At Next Level / Monthly Uplift. The uplift number just becomes more accurate by including the price component. A subtle sub-label like "includes service price increases" can be added below the uplift amount for transparency.

## Files Changed
| File | Change |
|---|---|
| `useLevelUpliftEstimate.ts` | New hook — computes price + commission uplift from service mix |
| `LevelProgressCard.tsx` | Use new hook for uplift |
| `StylistScorecard.tsx` | Use new hook for uplift |
| `ReportBuilder.tsx` | Update uplift text |

4 files, no database changes.

