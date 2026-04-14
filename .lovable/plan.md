

# Restyle Empty State Buttons to Match Sizes

## Problem
The "Order Hardware" and "Register Reader" buttons are different sizes — one is `outline` variant and one is default, creating visual imbalance.

## Change

**File:** `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` (lines 593-614)

Make both buttons the same size and style — both `variant="outline"` and `size="sm"` for visual consistency, keeping "Register Reader" as the primary action via the default variant:

- Both buttons: same `size="default"` (drop the `sm`)
- "Order Hardware": `variant="outline"`
- "Register Reader": `variant="default"`
- Both use consistent icon sizing and spacing via the standard `gap-2` from the Button component (remove manual `mr-1` margins)

This ensures both buttons are the same height and padding, with only color distinguishing primary from secondary action.

