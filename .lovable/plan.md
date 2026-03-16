

# Debug: Backroom Unlock Button → Checkout Flow

## Current Flow Analysis

The "Unlock $48,948.00/yr" button calls `handleCheckout` which invokes the `create-backroom-checkout` edge function. Here's what happens:

1. **Frontend** sends `organization_id`, `location_ids[]`, `scale_count` to the edge function
2. **Edge function** builds Stripe Checkout line items:
   - `$20/mo × N locations` (flat subscription)
   - `$0.50/color service` (usage-based, metered) — **but this is NOT added to line_items** (it's defined as a constant but never used in the session)
   - `$10/mo × scales` (recurring license)
   - `$199 × scales` (one-time hardware)
3. **Stripe Checkout** opens with `mode: "subscription"`

## Issues Found

### 1. Usage fee is shown but not charged
The paywall calculator shows `Usage fee (~X appts) — $Y/mo` but the edge function **never adds `BACKROOM_USAGE_PRICE_ID` to the line items**. The user sees an estimated usage fee in the calculator, but Stripe Checkout won't include it. This creates a **mismatch between what the user expects to pay and what Stripe actually charges**.

### 2. Button shows net benefit, not actual cost
The button says "Unlock $48,948/yr" — that's the **net benefit** (savings minus cost), not what the user will be charged. There's no pre-checkout confirmation showing the actual charge amount and what card will be billed.

### 3. No charge summary before redirect
After clicking, the user is immediately redirected to Stripe Checkout with no intermediate confirmation showing:
- Exact recurring charge amount
- One-time hardware charge
- Which card/account will be billed
- What they're subscribing to

## Recommended Fix

### A. Add a confirmation step before Stripe redirect
Insert a confirmation dialog between button click and checkout that shows:
- **Monthly recurring**: `$20 × N locations + $10 × N scales = $X/mo`
- **One-time**: `$199 × N scales = $X`
- **Usage**: `~$0.50 per color service (billed monthly based on actual usage)`
- The org's billing email or card on file (if available via `useOrgPaymentInfo`)
- A clear "Proceed to Checkout" button

### B. Fix the usage fee in the edge function
Either:
- Add the metered usage price to the Stripe line items (if it's a real metered price), OR
- Remove the usage fee line from the calculator if it's not actually charged

### C. Update button label for clarity
Change from benefit-focused ("Unlock $48,948/yr") to action-focused: **"Subscribe — {formatCurrency(monthlyTotal)}/mo"** so the user knows the actual charge before clicking.

## Implementation

1. **Create `BackroomCheckoutConfirmDialog.tsx`** — A dialog component that:
   - Displays itemized recurring charges (locations, scales)
   - Shows one-time hardware cost
   - Notes usage-based billing
   - Shows billing email from org context
   - Has "Cancel" and "Proceed to Checkout →" buttons

2. **Update `BackroomPaywall.tsx`**:
   - Button click opens the confirmation dialog instead of directly calling `handleCheckout`
   - Dialog's confirm button triggers the actual `handleCheckout`

3. **Fix edge function** (`create-backroom-checkout/index.ts`):
   - Either add the metered usage price to line items or remove it from the calculator display

4. **Optionally update button label** to show cost instead of benefit (e.g., "Subscribe — $X/mo")

