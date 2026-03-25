

## Live Slider Value Display

### Problem
The percentage label (`15%`) only updates after the mutation completes because it reads from `service.variance_threshold_pct` (server state). Need local state to show the value in real-time during drag.

### Changes — `ServiceTrackingSection.tsx` (lines 702–716)

Add `onValueChange` to track the live value in local state, while keeping `onValueCommit` for persistence:

```tsx
// Add a local state map at the component level (near other useState calls)
const [liveThresholds, setLiveThresholds] = useState<Record<string, number>>({});

// In the slider area:
<Slider
  key={`${service.id}-${service.variance_threshold_pct}`}
  defaultValue={[service.variance_threshold_pct]}
  onValueChange={([v]) => {
    setLiveThresholds(prev => ({ ...prev, [service.id]: v }));
  }}
  onValueCommit={([v]) => {
    if (v !== service.variance_threshold_pct) {
      updateService.mutate({ id: service.id, updates: { variance_threshold_pct: v } });
    }
  }}
  min={5} max={50} step={5}
  className="flex-1"
/>
<span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
  {(liveThresholds[service.id] ?? service.variance_threshold_pct)}%
</span>
```

The label now reflects the dragged value instantly via local state, while the DB save still happens on release.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

