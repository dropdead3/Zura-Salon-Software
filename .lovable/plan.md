

# Fix CTA Button Copy — More Accurate Label

The button says "in savings" but the number includes waste savings + supply fee recovery + time savings — it's broader than just "savings."

## Change

In `BackroomPaywall.tsx`:

1. **Line 379**: Change `"Unlock {formatCurrency(yearlyNetBenefit)}/yr in savings"` → `"Unlock {formatCurrency(yearlyNetBenefit)}/yr in recovered value"`

2. **Line 949**: Change `"{formatCurrency(yearlySavings)}/yr in savings & revenue"` → `"{formatCurrency(yearlySavings)}/yr in recovered value"`

"Recovered value" accurately captures waste reduction, recouped product costs, and time savings without being vague. It aligns with brand voice — precise, measured, no hype.

