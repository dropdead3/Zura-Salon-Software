

## Show Demo Badge Inside the iPad Device Frame

**Problem:** The `DockDemoBadge` currently renders with `fixed top-3 left-3` positioning outside the device mockup. It appears on the outer page but not inside the simulated iPad screen where users are looking.

### Change — `src/components/dock/DockLayout.tsx`

Move `<DockDemoBadge />` inside `dockContent` so it renders within the device frame on all screens (schedule, active, clients, settings, appointment detail). It's already inside the `DockDemoProvider` context so `isDemoMode` will work.

- Add `<DockDemoBadge />` inside the `dockContent` div, above the content area
- Keep the existing outer `<DockDemoBadge />` for the non-constrained (full) layout as well

### Change — `src/components/dock/DockDemoBadge.tsx`

Change positioning from `fixed` to `absolute` so it's contained within the device frame's `relative` container. This ensures it stays inside the iPad mockup.

```
fixed top-3 left-3 → absolute top-3 left-3
```

Two files, minimal changes.

