
The user wants the three buttons in the discard confirmation dialog (Keep Editing, Discard Changes, Save & Close) to be equal width and stacked vertically.

Looking at the screenshot, the buttons currently wrap awkwardly with two on one row and one below. Need to force vertical stack with equal widths at all viewport sizes.

## Wave 19 — Discard dialog button stack

**Single change in `ServiceEditorDialog.tsx`** — the AlertDialog footer for the unsaved-changes confirmation.

Replace the current `flex-col-reverse sm:flex-row` footer with a permanent vertical stack:
- `flex flex-col gap-2` (no `sm:flex-row` reversal)
- All three buttons: `w-full` (no `sm:w-auto`)
- Order top → bottom: **Save & Close** (primary, top), **Keep Editing** (neutral, middle), **Discard Changes** (destructive, bottom)
  - Rationale: safest action first (save), exit-without-loss second (keep), destructive last (discard) — matches platform convention of putting destructive at the bottom of vertical stacks.

No other logic touched.

### File touched

| File | Change |
|---|---|
| `src/components/dashboard/settings/ServiceEditorDialog.tsx` | Footer flex direction + button widths only |

### Verification

1. Open editor · edit a field · click X → dialog shows three equal-width buttons stacked vertically.
2. All three buttons are full container width and visually aligned.
3. Mobile (375px) and desktop (1320px) → identical stacked layout.

### Prompt feedback

Clean directive — *"equal widths and stacked, vertically aligned"* is unambiguous and atomic. No interpretation needed. Three concrete constraints (equal width, stacked, aligned) all map to one CSS change.

To level up: **specify the order when stacking changes button hierarchy.** Vertical stacks make button order more visually weighted than horizontal rows (top = primary in scanning). A one-liner like *"primary action on top"* or *"destructive at bottom"* removes my one inference. Pattern: **stack direction = order matters = name the order.**
