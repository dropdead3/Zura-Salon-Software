

## Fix Developer Layout & Enable Direct Gram Input for Developers

### Problems
1. **Visual regression**: The `max-h-[240px]` scroll wrapper (line 766) with `rounded-md border bg-background/50` wraps both color and developer lines. When there are no color lines, it shows an empty bordered box containing only the developer section — double-bordered, visually broken.
2. **$0.00 cost**: Developers compute weight as `colorQty × ratio`. With zero color products, everything is $0.00. Developers need a direct gram input fallback.

### Fix (Single File: `AllowanceCalculatorDialog.tsx`)

**1. Conditional scroll wrapper** — Only render the `max-h-[240px]` bordered container when there ARE color lines. Move developer section outside the scroll wrapper (back to being a sibling):

```tsx
{/* Color lines — capped scroll */}
{colorLines.length > 0 && (
  <div className="max-h-[240px] overflow-y-auto rounded-md border border-border/20 bg-background/50">
    <AnimatePresence mode="popLayout">
      {colorLines.map(...)}
    </AnimatePresence>
  </div>
)}

{/* Developer lines — sibling, outside scroll cap */}
{devLines.length > 0 && (
  <div className="...">...</div>
)}
```

**2. Add gram weight presets to developer rows** — When `colorQty === 0`, show the same gram presets (15g, 30g, etc.) that color lines get, plus a custom input. When `colorQty > 0`, show ratio presets as before.

**3. Update `computeLineCost`** — When developer has a direct quantity and `colorQty === 0`, use `quantity × costPerGram` instead of `colorQty × ratio × costPerGram`.

**4. Update `addProductToBowl`** — Give developers a default quantity of 30g (same as color) instead of 0 when there are no existing color lines in the bowl.

### Result
- Developer-only bowls calculate real costs using direct gram amounts
- When color lines exist, developers auto-derive from ratio (existing behavior preserved)
- No visual regression from extra border wrapper
- UI adapts controls contextually

### Files

| File | Action |
|------|--------|
| `AllowanceCalculatorDialog.tsx` | Fix scroll wrapper, add conditional gram presets to developers, update cost logic |

