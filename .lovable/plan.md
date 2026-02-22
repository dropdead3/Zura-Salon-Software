
# Add Hover Magnify Effect and Thick Stroke to Appointment Cards

## What Changes

When hovering over an appointment card in both Day and Week views, two visual cues will indicate clickability:

1. **Scale magnify**: A subtle `scale(1.03)` transform on hover, giving a "lift and magnify" feel
2. **Thick border stroke**: A 2px solid border in the card's category color (or primary color as fallback) appears on hover

Both effects use CSS transitions for smooth animation.

---

## Technical Details

### Change 1: DayView.tsx (line 296)

Update the className to add hover scale and hover border:

- Add `hover:scale-[1.03] hover:border-2 hover:border-current` to the existing class list
- Ensure `transform` origin is set so the card scales from its center
- The `transition-all` class already present will handle smooth animation

The inline style block already sets explicit `borderWidth` for both light and dark modes, so we add a CSS hover override via a utility approach: wrap the border in a `group-hover` or use Tailwind's `hover:` directly. Since inline styles have higher specificity, we will use a thin wrapper approach -- adding a `hover-ring` pseudo-element overlay for the stroke instead of fighting inline border specificity.

**Revised approach**: Add a `::after` pseudo-element via a small utility class in `index.css` that renders the thick stroke on hover, avoiding inline style conflicts. The scale effect uses Tailwind's `hover:scale-[1.03]`.

### Change 2: WeekView.tsx (line 162)

Same changes: add `hover:scale-[1.03]` and the hover stroke utility class.

### Change 3: index.css -- Add hover stroke utility

Add a small utility class `.appt-card-hover` that uses `::after` to render a 2px rounded border on hover:

```css
.appt-card-hover:hover::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid hsl(var(--primary));
  border-radius: inherit;
  pointer-events: none;
}
```

This avoids any conflict with the inline `borderWidth`/`borderStyle` properties already set on the cards.

### Files Modified

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Add `hover:scale-[1.03]` and `appt-card-hover` class to appointment card div |
| `src/components/dashboard/schedule/WeekView.tsx` | Add `hover:scale-[1.03]` and `appt-card-hover` class to appointment card div |
| `src/index.css` | Add `.appt-card-hover` utility for hover border overlay via `::after` pseudo-element |

### No new dependencies, no database changes.
