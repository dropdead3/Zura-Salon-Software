

# Show Abbreviated Level Numbers in Schedule Headers

## Problem
The schedule header cells display full level names (e.g., "Studio Artist") which are too long for compact cells. Since this is an internal-facing view, abbreviated level numbers ("L1", "L2", etc.) are more appropriate and space-efficient.

## Changes — `src/components/dashboard/schedule/DayView.tsx`

### 1. Add level number to the `levelLabelMap`
Update the map to also store an abbreviated label based on the level's 1-based index:

```tsx
const m = new Map<string, { label: string; shortLabel: string; index: number }>();
stylistLevels.forEach((l, i) => m.set(l.slug, { label: l.label, shortLabel: `L${i + 1}`, index: i }));
```

### 2. Replace `levelInfo.label` with `levelInfo.shortLabel` in both layouts

**Condensed layout (line ~596):**
```tsx
<span className="text-[10px] text-muted-foreground leading-none truncate max-w-full">
  {levelInfo.shortLabel}
</span>
```

**Normal/Medium layout (line ~618):**
```tsx
<span className="text-[10px] text-muted-foreground truncate">{levelInfo.shortLabel}</span>
```

### Result
- "Studio Artist" → "L1"
- "Senior Stylist" → "L2"
- etc.

The full level name remains available via the existing tooltip on the avatar. Single file change, no new dependencies.

