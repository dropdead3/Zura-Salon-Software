

## Fix New Bowl Sheet — Open from Top Down

### Problem
`DockNewBowlSheet` uses a `flex-col` layout where the backdrop is `flex-1` (fills top space) and the sheet panel sits below it. This makes the panel anchor to the **bottom** of the screen despite having `y: '-100%'` animation. It needs to match all other Dock sheets: anchored to the top, sliding down.

### Change — `src/components/dock/mixing/DockNewBowlSheet.tsx`

Restructure the layout to match the standard top-anchored pattern used by all other Dock sheets:

1. **Container**: Change from `flex flex-col` to standard overlay pattern — backdrop as a full `absolute inset-0` layer, panel as a separate `absolute inset-x-0 top-0` element
2. **Panel**: Add `rounded-b-2xl` (already present), position with `absolute inset-x-0 top-0`
3. **Animation**: Change to `initial={{ y: '-100%' }}`, `animate={{ y: 0 }}`, `exit={{ y: '-100%' }}` (keep existing spring)
4. **Drag direction**: Already correct — `dragElastic={{ top: 0.6 }}` and dismiss on negative y offset (upward swipe)
5. **Drag handle**: Already at bottom — no change needed

Essentially replacing the `flex-col` + `flex-1 backdrop` pattern with the standard `absolute inset-0` backdrop + `absolute top-0` panel pattern that the other sheets use.

### One file changed
`src/components/dock/mixing/DockNewBowlSheet.tsx`

