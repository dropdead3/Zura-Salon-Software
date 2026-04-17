

## Goal
Move the **Next Visit Recommendation** rebook card to the very top of the `CheckoutSummarySheet` body, above Client Info, so the rebook script is the first thing the stylist sees.

## Why this works
- The rebook gate is already structurally first in the flow (`gatePhase === 'gate'` blocks checkout). Putting it visually first matches the actual flow and removes the awkward scroll-past-everything-to-rebook pattern.
- Once the stylist completes/declines the rebook, the card disappears (replaced by the tip block lower down in checkout phase), so client + service + payment summary slide up naturally.

## Change

**File:** `src/components/dashboard/schedule/CheckoutSummarySheet.tsx`

Reorder the `<div className="space-y-6 p-5">` body so the conditional `gatePhase === 'gate'` rebook card renders **first**, before the Client Info block. The tip-selection branch (`gatePhase === 'checkout'`) stays in its current position (after Payment Summary) — only the **gate-phase** card moves to the top.

### Structural edit
- Extract the rebook card JSX (currently lines ~691–738) and render it conditionally at the top of the scroll container when `gatePhase === 'gate'`.
- Leave the tip-selection block (the `else` branch) where it is, after Payment Summary, because it's a checkout-phase concern that should follow totals.
- Remove the now-empty rebook slot from its old mid-flow position.

### Result (top → bottom of sheet body)
1. **Next Visit Recommendation** (gate phase only) ← moved here
2. Client Info
3. Service Details
4. Add-Ons (if any)
5. Product Usage Charges (if any)
6. Payment Summary
7. Tip Selection (checkout phase only)

## Out of scope
- No copy changes
- No styling changes to the rebook card itself
- No changes to gate-enforcement logic in `handleOpenChange`

