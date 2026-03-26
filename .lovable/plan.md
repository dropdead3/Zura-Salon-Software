

## Expand Variance Threshold Tooltip with Full Context

### Problem
The current tooltip just says "Maximum acceptable deviation from baseline usage before flagging." — it doesn't explain what flagging means, how it triggers, where it surfaces, or what happens when a deviation is detected.

### Changes

**1. `ServiceTrackingSection.tsx` (~line 805)** — Replace the tooltip description with a comprehensive explanation:

> "Sets the maximum acceptable deviation from a service's baseline product usage. When a stylist's actual product usage exceeds this threshold (e.g., using 15% more product than the baseline on a 10% threshold), Zura automatically flags it as a variance exception. These flags surface in the Backroom Command Center alerts, the staff compliance leaderboard, and individual staff reports — giving managers visibility into usage patterns without interrupting the stylist's workflow."

**2. `RecipeBaselineSection.tsx` (~line 74)** — Update the related tooltip to be consistent:

> "The expected amount of each product for a standard application. When actual usage deviates beyond the variance threshold set per service, Zura flags it as an exception in the Command Center and staff compliance reports."

### Files Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`
- `src/components/dashboard/backroom-settings/RecipeBaselineSection.tsx`

