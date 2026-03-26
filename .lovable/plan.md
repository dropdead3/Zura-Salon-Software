

## Add Tooltip to "No allowance" Label

### Change
Add a `MetricInfoTooltip` next to the "No allowance" text in the service drill-down row, explaining that allowance policies are configured in the Allowances & Billing section.

### Technical Detail

**File: `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`** (around line 681)

When `hasAllowance` is false, add a tooltip after the "No allowance" span:

```tsx
<div className="flex items-center gap-1">
  <FileText className={cn('w-3.5 h-3.5', hasAllowance ? 'text-primary' : 'text-muted-foreground/30')} />
  <span>{hasAllowance ? 'Allowance set' : 'No allowance'}</span>
  {!hasAllowance && (
    <MetricInfoTooltip description="No allowance policy has been set for this service. Allowance policies are configured in the Allowances & Billing section of the Backroom Hub." />
  )}
</div>
```

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

