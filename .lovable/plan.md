

## Move Chemical Badge to Left of Tracked Toggle

### Change

In `ServiceTrackingSection.tsx`, move the `Chemical`, `Suggested`, and `Configured ✓` badges out of the service name cell (lines 588–602) and into the tracking toggle cell (lines 624–631), placed to the left of the `Switch`.

### Implementation — `ServiceTrackingSection.tsx`

**1. Remove badges from the Service name cell (lines 588–602)**

Strip out the Chemical badge, Suggested badge, Configured badge, and the component/allowance icons from the name `<div>`. Leave only the service name text.

**2. Add badges into the Tracked toggle cell (lines 624–631)**

Wrap the cell content in a `flex items-center gap-2 justify-end` container. Place badges first (right-aligned, before the Switch), then the Switch. This gives a clean horizontal alignment: `[Chemical] [Switch]` across all rows.

```tsx
<TableCell onClick={(e) => e.stopPropagation()}>
  <div className="flex items-center gap-2 justify-end">
    {type === 'chemical' && (
      <Badge variant="default" className="text-[10px] shrink-0">Chemical</Badge>
    )}
    {type === 'suggested' && (
      <Badge variant="outline" className="text-[10px] shrink-0 border-amber-500/40 text-amber-600 dark:text-amber-400">Suggested</Badge>
    )}
    {service.backroom_config_dismissed && (
      <Badge variant="outline" className="text-[10px] shrink-0 border-primary/30 text-primary">Configured ✓</Badge>
    )}
    {service.is_backroom_tracked && !service.backroom_config_dismissed && (
      <div className="flex items-center gap-1 shrink-0">
        <Package className={cn('w-3 h-3', hasComponents ? 'text-primary' : 'text-muted-foreground/30')} />
        <FileText className={cn('w-3 h-3', hasAllowance ? 'text-primary' : 'text-muted-foreground/30')} />
      </div>
    )}
    <Switch
      checked={service.is_backroom_tracked}
      onCheckedChange={(v) => toggleTracking.mutate({ id: service.id, tracked: v })}
      className="scale-90"
    />
  </div>
</TableCell>
```

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` (lines 581–631)

