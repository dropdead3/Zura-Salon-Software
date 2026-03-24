

## Raise Down Arrow Above Gradient

**Problem:** The bouncing ChevronDown indicator and the bottom fade gradient both sit at `z-20`, so the gradient covers the arrow.

### Change — `src/components/dock/schedule/DockScheduleTab.tsx`

Line 260: Change `z-20` → `z-25` on the scroll-down indicator div so it renders above the `z-20` gradient.

One class change, one file.

