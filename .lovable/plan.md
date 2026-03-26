

## Enhance Allowance Calculator Dialog UI

### Changes — `AllowanceCalculatorDialog.tsx`

1. **Move description to tooltip** — Replace the full paragraph explainer (lines 636–638) with an `Info` icon tooltip next to "Product Allowance" in the `DialogTitle`. Use the existing `MetricInfoTooltip` component or inline `Tooltip`/`TooltipTrigger`/`TooltipContent`. The tooltip text stays the same.

2. **Import additions** — Add `Info` from lucide-react and `Tooltip, TooltipTrigger, TooltipContent` from `@/components/ui/tooltip`.

3. **Header cleanup** — With the paragraph gone, the header becomes tighter: just the title (with info icon) and the service name subtitle.

4. **Footer polish** — Style the footer summary with slightly more visual weight: larger dollar amount, subtle background differentiation.

5. **Vessel card refinements** — Tighten spacing, ensure consistent border radius and padding per design tokens.

### Files Modified
- `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

