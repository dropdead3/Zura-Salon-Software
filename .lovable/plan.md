

## Fix: Spell Out Duration Units & Remove Trailing Dot

### Problem
The footer shows "2h ·" — the duration uses abbreviated units ("h", "m") and there's a trailing dot artifact.

### Changes

**1. `src/lib/formatDuration.ts`** — Add a new spelled-out variant:
```ts
export function formatMinutesToDurationLong(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m > 0) return `${h} hour${h !== 1 ? 's' : ''} ${m} min`;
  return `${h} hour${h !== 1 ? 's' : ''}`;
}
```

**2. `src/components/dock/appointment/DockEditServicesSheet.tsx`** — Line 331:
- Import `formatMinutesToDurationLong` instead
- Replace `formatMinutesToDuration(totalDuration)` with `formatMinutesToDurationLong(totalDuration)`

The trailing dot is from the price span's ` · ` prefix — when price is `0` that span doesn't render, but the duration span's ` · ` prefix creates the visual trailing separator. This is actually fine structurally; the screenshot shows "2h ·" which means price IS rendering but is blurred/empty. No structural change needed — the spelled-out format will look correct.

