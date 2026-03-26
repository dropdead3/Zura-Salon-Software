

## Add "Unconfigured" Amber Ghost Badge + Equal Width

### Change
Add an amber ghost "Unconfigured" badge for tracked services that haven't been finalized. Make both badges equal width using a fixed `min-w` so they align visually.

### Technical Detail

**File: `ServiceTrackingSection.tsx`** (~lines 631–638)

Replace the current conditional block with:

```tsx
{service.backroom_config_dismissed ? (
  <Badge variant="outline" className="text-[10px] shrink-0 min-w-[6.5rem] justify-center border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
    Configured ✓
  </Badge>
) : service.is_backroom_tracked ? (
  <Badge variant="outline" className="text-[10px] shrink-0 min-w-[6.5rem] justify-center border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400">
    Unconfigured
  </Badge>
) : null}
```

This removes the old `FileText` icon block for non-configured tracked services and replaces it with a matching amber ghost badge. Both badges share `min-w-[6.5rem] justify-center` for equal width.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

