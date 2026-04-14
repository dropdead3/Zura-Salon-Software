

## Problem

The "DEFAULT" badge on Quick Themes is no longer needed since system color themes now auto-map to matching service category palettes. The `is_default` concept for category themes adds visual clutter without serving a purpose.

## Changes

### 1. `src/components/dashboard/settings/ThemeSelector.tsx` (lines 177-182)

Remove the "Default" badge rendering block:

```tsx
{/* Default badge */}
{theme.is_default && (
  <span className="text-[10px] font-display uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
    Default
  </span>
)}
```

This is a UI-only change — the `is_default` column remains in the database (it's harmless and used for sort ordering), but we stop displaying the badge.

### Files changed
- `src/components/dashboard/settings/ThemeSelector.tsx` — Remove 5 lines (badge block)

