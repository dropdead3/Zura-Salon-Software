

# Fix: Appointment Cards Not Appearing in Time Slots

## Root Cause

The `.appt-card-hover` utility class added in `src/index.css` includes `position: relative`, which overrides the `position: absolute` required by appointment cards to render at the correct top/height position in the schedule grid. Without absolute positioning, all cards stack at the top of their container and disappear from their time slots.

## Fix

Remove `position: relative` from `.appt-card-hover`. The appointment card `div` already has `position: absolute` set inline (via the `style` prop), and the `::after` pseudo-element will still work correctly since `absolute` is also a positioned element (it establishes a containing block for `::after` just like `relative` does).

### Change in `src/index.css` (line 638-640)

Remove the `position: relative` rule from `.appt-card-hover`:

```css
/* Before */
.appt-card-hover {
  position: relative;
}

/* After */
.appt-card-hover {
  /* position established by inline absolute; ::after inherits correctly */
}
```

Or simply remove the `.appt-card-hover` selector block entirely (keeping only the `::after` and `:hover::after` rules), since `position: absolute` on the parent already establishes a containing block.

---

## Technical Details

| File | Change |
|---|---|
| `src/index.css` | Remove `position: relative` from `.appt-card-hover` |

No other files need changes. The `::after` pseudo-element with `position: absolute` and `inset: 0` works correctly when the parent has `position: absolute` -- both `relative` and `absolute` establish a containing block for absolutely-positioned children.
