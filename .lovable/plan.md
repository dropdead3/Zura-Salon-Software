

# Clarify "Due Today" vs "Recurring in 30 Days"

Reframe the dialog into two clear temporal sections instead of cost-type sections.

## Layout (top → bottom)

### 1. Estimated Savings Banner — unchanged

### 2. "What You Pay Right Now" section
- Section label: **"What You Pay Right Now"**
- Hardware line item (scales × $199) — if any
- First month's fixed costs (locations + scale licenses)
- First month's estimated usage
- **Today's total** row summing hardware + first month charges
- Subtitle: *"Your first payment is charged immediately."*

### 3. "Estimated Monthly Payment" section
- Section label: **"Recurring Every 30 Days"**
- Fixed line items (locations + scale licenses) with subtotal
- Variable line item (per-color-service) with ~estimate
- **Est. monthly total** row
- Subtitle: *"Billed every 30 days from today. Actual amount depends on color service volume that month."*

### 4. Card on file — unchanged
### 5. Action buttons — unchanged

## File
`BackroomCheckoutConfirmDialog.tsx` — replace sections 2–5 (lines 82–154) with the two temporal groupings. Compute `todayTotal = hardwareOneTime + estimatedMonthlyGrandTotal` for the "right now" total.

