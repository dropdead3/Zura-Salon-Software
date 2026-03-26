

## Add Slide-In Animation to Bowl Lines

### What Changes

Wrap each bowl line item (color lines and developer lines) in a `motion.div` from framer-motion with a subtle fade + slide-in animation when added. Uses `AnimatePresence` + `layout` for smooth entry/exit.

### Changes to `AllowanceCalculatorDialog.tsx`

1. **Import** `motion, AnimatePresence` from `framer-motion`

2. **Color lines section (line ~712)** — Wrap `colorLines.map(...)` in `<AnimatePresence>` and replace each line's outer `<div>` with `<motion.div>`:
   - `initial={{ opacity: 0, x: -12 }}`
   - `animate={{ opacity: 1, x: 0 }}`
   - `exit={{ opacity: 0, x: 12 }}`
   - `transition={{ duration: 0.2, ease: 'easeOut' }}`
   - Keep existing `key={line.localId}` and classes

3. **Developer lines section (line ~775)** — Same treatment: wrap `devLines.map(...)` in `<AnimatePresence>`, convert inner `<div>` to `<motion.div>` with identical animation props

### Motion Standards Compliance
- Duration: 200ms (within 180–240ms guideline)
- Ease: `easeOut` (no bouncing or elastic effects)
- Subtle 12px horizontal slide (not jarring)

### Single File Change
| File | Action |
|------|--------|
| `AllowanceCalculatorDialog.tsx` | Add `AnimatePresence` + `motion.div` to color and developer line items |

