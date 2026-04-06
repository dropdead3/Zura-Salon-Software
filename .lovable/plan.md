

# Replace Base-Level Promotion Dashes with "N/A" Indicator

## Problem

The base level (Level 1 / index 0) cannot have promotion criteria — there's no level below it to promote from. Currently these cells show `—` dashes, identical to unconfigured cells elsewhere, which misleads users into thinking they can or should configure them.

## Solution

Replace the `—` dash in base-level promotion cells with a styled `N/A` label (or `×` if preferred). This clearly communicates "not applicable" vs "not yet set."

### Change in `StylistLevelsEditor.tsx`

**Line 591** — the `isPromotionSkip` branch for read-only base-level cells:

```tsx
// Before
<span className="text-muted-foreground/40">—</span>

// After
<span className="text-muted-foreground/30 text-xs select-none">N/A</span>
```

This uses smaller, lighter text to visually distinguish "not applicable" from the clickable "Configure" and unconfigured `—` states in other columns.

### Files Modified

- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — one line change at ~591

### No database changes.

