

## Add Info Tooltip Next to "Configure Allowance" Button

### Change — `ServiceTrackingSection.tsx`

Add a `MetricInfoTooltip` next to the "Configure Allowance" button (around line 766) with the same benchmarking explanation used in the calculator dialog. The tooltip will sit between the `FileText` icon and the button.

**Tooltip text:** "Use benchmark products to set a dollar allowance for this service. Stylists can mix any product — once the allowance is reached, overage costs are passed to the client at checkout."

**Layout:** The existing `flex items-center gap-2` wrapper already supports this. Insert the `MetricInfoTooltip` after the button, keeping the row compact.

### Files Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` (~line 780)

