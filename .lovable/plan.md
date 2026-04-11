

# Simplify Stylist Drilldown — Remove Progress Bars, Show Clean Details

## Problem
The expanded stylist rows in the Revenue by Category drilldown show a client mix panel with New/Returning counts and a progress bar. This is noisy and not the most useful detail at this level. The user wants a cleaner drilldown: stylist, appointment details, dollar amounts — no progress bars.

## Approach

Replace the `ClientMixPanel` (progress bar + new/returning breakdown) with a cleaner **appointment detail list** showing the individual services performed by that stylist in this category, with amounts. This gives actual operational insight instead of a redundant client mix visualization.

## Changes

### File: `src/hooks/useRevenueByCategoryDrilldown.ts`

- Already fetches `item_name` and `transaction_date` per item — need to pass individual item details through to the stylist data
- Add `items?: { itemName: string; amount: number; date: string }[]` to `CategoryStylistData`
- In the aggregation loop, collect individual items per stylist per category (name, amount, date)
- Sort items by date descending within each stylist

### File: `src/components/dashboard/sales/RevenueByCategoryPanel.tsx`

- **Remove** the `ClientMixPanel` component entirely (progress bar, new/returning counts)
- **Replace** with a clean `StylistItemsPanel` that shows:
  - Each service/item name on the left
  - Date on the left (subtle, below name)
  - Dollar amount on the right
  - Clean list layout with subtle dividers, no progress bars
- Keep the `ServiceDetailsPanel` for Chemical Overage Fees (already clean)
- Remove `newClients`, `returningClients`, `totalClients` references from stylist rows since they're no longer displayed
- Keep the stylist summary line: count + share percent

### Visual Result
- Stylist row: Avatar + Name + "3 appointments · 42% of category" + $amount + chevron
- Expanded: Clean list of individual items with date and amount — no bars, no client mix
- Chemical Overage Fees: continues to show associated service names (already correct)

### Files Modified
| File | Change |
|---|---|
| `src/hooks/useRevenueByCategoryDrilldown.ts` | Add per-item details array to stylist data |
| `src/components/dashboard/sales/RevenueByCategoryPanel.tsx` | Remove `ClientMixPanel`, replace with `StylistItemsPanel` showing individual service items with dates and amounts |

