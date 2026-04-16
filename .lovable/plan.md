

# Restyle Break Blocks to Match Appointment Cards

## What's changing

The break/lunch overlays on the schedule currently use a flat hatched-pattern style. We'll restyle them to match the appointment card aesthetic: rounded corners, left border accent, proper padding, readable typography, and hover effects.

## Design

Break blocks will adopt the same visual language as appointment cards:
- **Rounded `rounded-lg`** container (matching `AppointmentCardContent` grid cards)
- **4px left border** accent (amber for break/lunch, muted for off/blocked, primary for meeting)
- **Solid background** with subtle opacity instead of hatched lines — removing the `repeating-linear-gradient` pattern
- **Card-like content layout**: icon + label on first line, time range on second line (when tall enough)
- **Hover effect**: `hover:shadow-md hover:brightness-[1.08]` matching appointment cards
- **Status badge** style label using a small pill (e.g., "Break", "Lunch")
- Keeps the existing tooltip on hover for full details

## File changes

### `src/components/dashboard/schedule/BreakBlockOverlay.tsx`

1. Replace the hatched `backgroundImage` with solid fills using theme-aware colors (amber-based for breaks, muted for off/blocked)
2. Add `rounded-lg`, `border-l-4`, `hover:shadow-md`, `transition-all` to match appointment card classes
3. Structure internal content to show:
   - **Compact** (< 28px): icon only
   - **Medium** (28–54px): icon + label
   - **Full** (≥ 55px): icon + label + time range
4. Remove the diagonal stripe pattern entirely
5. Add a small `mx-0.5` margin so break blocks don't touch the column edges flush (matching appointment card inset)

### Color mapping (updated)

| Block type | Background | Left border | Text |
|-----------|-----------|------------|------|
| break | `bg-amber-500/20` | `border-l-amber-500` | `text-amber-900 dark:text-amber-200` |
| lunch | `bg-amber-500/20` | `border-l-amber-500` | `text-amber-900 dark:text-amber-200` |
| off | `bg-muted/50` | `border-l-muted-foreground/40` | `text-muted-foreground` |
| blocked | `bg-muted/40` | `border-l-muted-foreground/30` | `text-muted-foreground` |
| meeting | `bg-primary/15` | `border-l-primary` | `text-primary` |

No other files change — DayView and WeekView already render `BreakBlockOverlay` correctly.

