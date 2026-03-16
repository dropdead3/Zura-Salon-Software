

# Enhance Checkout Confirm Dialog with Grand Totals and Savings

## Changes

### 1. Pass savings data to the dialog

Update the `BackroomCheckoutConfirmDialog` props to accept:
- `estimatedMonthlySavings` (totalSavings from the paywall)
- `netBenefit` (monthly net benefit)

Update the invocation in `BackroomPaywall.tsx` (~line 378) to pass `totalSavings` and `netBenefit`.

### 2. Enhance the dialog layout

Add two new summary sections at the bottom of the dialog (before the card-on-file and actions):

**A. Grand Total Summary Box** — a visually prominent section:
- **Due today**: One-time hardware cost (if any) — this is what gets charged immediately
- **Est. monthly total**: Fixed recurring + estimated usage = full estimated monthly cost across all locations
- Clear label: "Estimated total across {N} locations"

**B. Estimated Savings/ROI Row** — emerald-colored highlight:
- **Est. monthly savings**: `+{formatCurrency(totalSavings)}/mo` (waste reduction + supply recovery + staff hours)
- **Net benefit**: `+{formatCurrency(netBenefit)}/mo after Backroom costs`

### 3. File changes

**`BackroomCheckoutConfirmDialog.tsx`**:
- Add `estimatedMonthlySavings` and `netBenefit` to the Props interface
- Compute `estimatedMonthlyGrandTotal = monthlyRecurring + estimatedUsage`
- Add a "Grand Total" summary section with "Due today" and "Est. monthly" rows
- Add an emerald-tinted savings row showing monthly savings and net benefit
- Keep existing line items, card-on-file, and actions as-is

**`BackroomPaywall.tsx`**:
- Pass `totalSavings` and `netBenefit` as new props to the dialog component (~line 378)

