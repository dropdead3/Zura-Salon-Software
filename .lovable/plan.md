

## Add Product Budget Ceiling to Allowance Health Footer

The user wants a clear indicator showing: "Based on your $X service price and an 8% target, your product budget ceiling is $Y." This gives operators immediate clarity on how much they can spend on product before margins erode — and frames the delta as room to go more premium.

### Logic

The 8% target budget is already calculated as `suggestedAllowance` in the `allowance-health.ts` engine (`servicePrice * 0.08`). Currently it only shows for `status: 'low'`. The enhancement is to **always show this budget ceiling** when a service price is set, regardless of health status — reframed per status:

- **Healthy**: "Product budget at 8% target: $X" — confirms they're within range
- **High**: "Max product budget at 8% target: $X" — shows the ceiling they've exceeded
- **Low**: Already shows "Upgrade budget: $X" — no change needed

### Changes

**1. `src/lib/backroom/allowance-health.ts`**
- Always compute `suggestedAllowance` (the 8% target amount), not just when status is `low`. Move it out of the conditional so it's returned for all three statuses.

**2. `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`**

- **For `high` status** (~line 1626): Add a budget ceiling pill **above** the existing suggested price button:
  ```
  Max product budget: $X.XX
  ```
  Styled amber to match, with a tooltip: "At your current service price, the 8% industry target means your total product cost (at retail) should not exceed this amount."

- **For `healthy` status** (~line 1625): Add a subtle pill:
  ```
  Product budget at 8%: $X.XX
  ```
  Styled emerald to match, with tooltip: "Based on your service price and the 8% target, you can spend up to this amount on product while maintaining ideal margins."

- **For `low` status** (line 1679): Already shows "Upgrade budget" — keep as-is but update tooltip to also mention "you could spend up to this amount to go more luxury."

### Net effect
- Every status now shows the concrete dollar ceiling
- High status: "you're over budget — here's the max"
- Healthy: "you're within range — here's your ceiling"
- Low: "you have room — here's your upgrade budget"
- All three reinforce the 8% target as a concrete dollar figure operators can act on

