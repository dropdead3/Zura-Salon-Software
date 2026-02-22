

# Dark Mode Card Polish: Glow, Ring, Transitions, and Grid Dimming

## Summary

Four enhancements to the dark mode appointment card styling: hover glow, selected ring, smooth transitions, and dimmer grid lines. Text hierarchy (enhancement 5) is excluded per your direction.

---

## Change 1: Hover Glow Effect

**File**: `src/utils/categoryColors.ts`

Add a `glow` property to `DarkCategoryStyle` that returns a `box-shadow` string using the category color at ~15% opacity:

```
glow: string;  // e.g. "0 0 12px rgba(250, 204, 21, 0.15)"
```

For grays, use a lower opacity (~0.08) since glow on neutral cards should be very subtle.

**Files**: `DayView.tsx`, `WeekView.tsx`

On the dark mode style block, add `boxShadow: darkStyle.glow` when not in compact mode.

---

## Change 2: Selected State Ring

**File**: `src/utils/categoryColors.ts`

Add a `ring` property returning a 2px outline/box-shadow ring in the light-mode hex:

```
ring: string;  // e.g. "0 0 0 2px #facc15"
```

**Files**: `DayView.tsx`, `WeekView.tsx`

When `isSelected` is true in dark mode, apply `boxShadow: darkStyle.ring` instead of the hover glow.

---

## Change 3: Transition Smoothing

**Files**: `DayView.tsx`, `WeekView.tsx`

Add `transition: 'background-color 150ms ease, box-shadow 150ms ease'` to the dark mode inline style block. This makes hover and selection state changes feel fluid rather than abrupt.

---

## Change 4: Grid Line Dimming in Dark Mode

**File**: `DayView.tsx` (line 145-148)

Current dark mode grid line opacities:
- Hour: `dark:border-border/80`
- Half-hour: `dark:border-border/60`
- Quarter-hour: `dark:border-border/50`

Reduce to:
- Hour: `dark:border-border/50`
- Half-hour: `dark:border-border/35`
- Quarter-hour: `dark:border-border/15`

**File**: `WeekView.tsx` (lines 630-633, 668-671)

Current:
- Hour: `dark:border-border/70`
- Half-hour: `dark:border-border/50`
- Quarter-hour: `dark:border-border/35`

Reduce to:
- Hour: `dark:border-border/50`
- Half-hour: `dark:border-border/30`
- Quarter-hour: `dark:border-border/15`

---

## Technical Details

### Files Modified

| File | Change |
|---|---|
| `src/utils/categoryColors.ts` | Add `glow` and `ring` properties to `DarkCategoryStyle`; compute rgba box-shadow strings |
| `src/components/dashboard/schedule/DayView.tsx` | Apply glow/ring/transition in dark style block; reduce grid line dark opacities |
| `src/components/dashboard/schedule/WeekView.tsx` | Apply glow/ring/transition in dark style block; reduce grid line dark opacities |

### No new files, no new dependencies, no database changes.

