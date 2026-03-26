

## Fix Vessel Selection UX + Dock Integration

### Problems
1. **Visual clarity**: Active and inactive vessel pills look nearly identical in the cream theme — users can't tell what's selected
2. **Disabled confusion**: When only one vessel is selected (e.g., "bowl"), it's disabled with reduced opacity, making users think the whole control is broken
3. **Data sync**: The configurator writes `container_types` to the `services` table, but the Dock's `useServiceLookup` reads from `phorest_services` — these may not be in sync, so vessel changes in the configurator don't affect what vessels appear in the Dock

### Changes

**1. Redesign vessel pills as toggle chips** (`ServiceTrackingSection.tsx`, lines 694–720)

Replace the current subtle pills with clearly togglable chips:
- **Selected**: Filled background with checkmark icon (`bg-primary text-primary-foreground`) — unmistakable "on" state
- **Unselected**: Outline/dashed border with plus icon (`border-dashed border-muted-foreground/40`) — clearly "off"
- **Remove the `disabled` guard** when only one is selected — instead, show a toast ("At least one vessel type is required") if user tries to deselect the last one. This keeps both buttons always interactive.

**2. Sync `phorest_services.container_types` when `services.container_types` is updated** (`ServiceTrackingSection.tsx`, `updateService` mutation)

After updating the `services` row, also update the matching `phorest_services` row (matched by `name` + `organization_id`) with the same `container_types` value. This ensures the Dock reads the correct vessel configuration.

Alternatively, update `useServiceLookup.ts` to read `container_types` from the `services` table instead of `phorest_services`, since services is the source of truth for backroom configuration.

**3. Dock already respects `container_types`** (`DockServicesTab.tsx`, line 445)

The Dock already reads `container_types` from the service lookup and renders the appropriate "Add Bowl" / "Add Bottle" cards. Once the data sync is fixed, vessel selection in the configurator will automatically control what appears in the Dock.

### Technical Detail

**Vessel chip rendering** (new pattern):
```tsx
{(['bowl', 'bottle'] as const).map((vt) => {
  const active = (service.container_types || []).includes(vt);
  return (
    <button
      key={vt}
      className={cn(
        'px-2.5 py-0.5 rounded-full text-[10px] font-sans capitalize transition-colors border flex items-center gap-1',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-transparent border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground'
      )}
      onClick={(e) => {
        e.stopPropagation();
        const current = service.container_types || [];
        if (active && current.length === 1) {
          toast.error('At least one vessel type is required');
          return;
        }
        const next = active ? current.filter(t => t !== vt) : [...current, vt];
        updateService.mutate({ id: service.id, updates: { container_types: next } });
      }}
    >
      {active ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
      {vt}
    </button>
  );
})}
```

**Data sync** — update `useServiceLookup.ts` to join/fallback to the `services` table for `container_types`, or add a secondary write in the `updateService` mutation to keep `phorest_services` in sync.

### Files Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` — vessel chip redesign, remove disabled guard
- `src/hooks/useServiceLookup.ts` — read `container_types` from `services` table (source of truth) instead of `phorest_services`

