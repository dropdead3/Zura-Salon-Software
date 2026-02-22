

# Remove Hover Stroke and Smooth the Magnification Animation

## Changes

### 1. Remove stroke overlay from `src/index.css`
Delete the entire `.appt-card-hover::after` and `.appt-card-hover:hover::after` rule blocks (lines 637-650). The stroke effect is no longer needed.

### 2. Smooth the scale transition in DayView.tsx and WeekView.tsx
Replace `hover:scale-[1.03]` with `hover:scale-[1.02]` (subtler) and replace `transition-all` with `transition-transform duration-200 ease-out` for a smoother, more controlled animation that avoids the "jump" feel. Also remove the `appt-card-hover` class reference since the CSS utility is being deleted.

### Technical Details

| File | Change |
|---|---|
| `src/index.css` | Delete lines 637-650 (`.appt-card-hover::after` and `:hover::after` blocks) |
| `src/components/dashboard/schedule/DayView.tsx` | Replace `transition-all ... hover:scale-[1.03] appt-card-hover` with `transition-transform duration-200 ease-out hover:scale-[1.02]` |
| `src/components/dashboard/schedule/WeekView.tsx` | Same class update as DayView |

No new files, no new dependencies, no database changes.

