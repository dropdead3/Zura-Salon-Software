
## Diagnosis

In `src/components/dashboard/schedule/ScheduleHeader.tsx`, `getRelativeDayLabel` returns `null` beyond ±30 days, suppressing the eyebrow. User finds the relative context valuable at any range.

## Fix

Remove the ±30-day cap in `getRelativeDayLabel`:

```ts
function getRelativeDayLabel(offset: number): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (offset === -1) return 'Yesterday';
  if (offset > 1) return `In ${offset} days`;
  return `${Math.abs(offset)} days ago`;
}
```

Return type tightens from `string | null` to `string` (always renders). Update call sites in both compact and full layouts to drop the null guard — render unconditionally.

## Acceptance checks

1. +90 days → "IN 90 DAYS"
2. -180 days → "180 DAYS AGO"
3. Today / Tomorrow / Yesterday unchanged.
4. No layout shift; eyebrow always present in both layouts.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx` — remove ±30-day silence cap, drop null guards at render sites.
