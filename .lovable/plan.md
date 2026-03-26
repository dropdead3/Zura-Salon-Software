

## Move Info Icon Inline with "Variance Threshold"

### Change
Move the `MetricInfoTooltip` from below the label text to inline, right next to "Variance Threshold" on the same line. Also bump the label text to `text-xs` for consistency with the vessel sizing changes.

### Technical Detail

**File: `ServiceTrackingSection.tsx`** (lines 774–777)

Change the label from a block layout to an inline flex layout:

```tsx
// Before
<label className="text-[10px] font-sans text-muted-foreground">
  Variance Threshold
  <MetricInfoTooltip description="..." />
</label>

// After
<label className="text-xs font-sans text-muted-foreground flex items-center gap-1">
  Variance Threshold
  <MetricInfoTooltip description="Maximum acceptable deviation from baseline usage before flagging." />
</label>
```

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

