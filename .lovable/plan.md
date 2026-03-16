

# Fix Button Label Overflow

The long text "Unlock $48,948.00/yr in recovered value" plus two icons overflows the button. Shorten the label and allow text to shrink.

## Change (`BackroomPaywall.tsx`)

1. **Line 367**: Add `text-sm` to the button className so the label fits at smaller widths
2. **Line 379**: Shorten copy from `Unlock {formatCurrency(yearlyNetBenefit)}/yr in recovered value` → `Unlock {formatCurrency(yearlyNetBenefit)}/yr`
3. **Line 385**: Shorten `Start saving {formatCurrency(netBenefit)}/mo` → `Unlock {formatCurrency(netBenefit)}/mo`

This keeps the button concise. The "recovered value" context is already conveyed by the ROI section above the button.

