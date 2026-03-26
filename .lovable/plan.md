

## Redesign Bowl Layout — Split Pane with Fixed Product Picker

### Problem
From the screenshot: when 6+ products are added to a bowl, the product lines push the product picker (brand/category/product browser) out of view. The user has to scroll past all bowl lines to reach the picker. Additionally, the weight presets + cost info on the right side of each row are getting clipped at the dialog's `max-w-2xl` width.

### Solution: Two-Panel Layout Within Each Bowl

Split each bowl's expanded content into **two vertically stacked sections with independent scroll**, or better — a **side-by-side layout** that keeps the picker always visible alongside the bowl lines.

Given the dialog is `max-w-2xl` (672px), side-by-side would be too cramped. Instead:

**Stack layout with a capped bowl-lines section:**
1. Bowl lines section: capped at `max-h-[240px]` with its own scroll — shows added products
2. Product picker section: always visible below, never pushed out by bowl growth
3. Widen dialog to `max-w-4xl` to give horizontal breathing room for weight presets + cost

### Changes to `AllowanceCalculatorDialog.tsx`

**1. Widen dialog (line 687):**
```
max-w-2xl → max-w-4xl
```
This gives ~896px, enough for swatch + name + 5 weight presets + custom input + cost + delete without clipping.

**2. Cap bowl lines height (lines 766-827, the color lines area):**
Wrap the color lines + developer lines in a container with `max-h-[240px] overflow-y-auto` so they scroll independently. This keeps the product picker always visible below them.

```tsx
<div className="max-h-[240px] overflow-y-auto">
  {/* Color lines AnimatePresence */}
  {/* Developer lines section */}
</div>
```

**3. Product picker stays outside the capped scroll area** — it's already at line 906 (`renderPickerPanel`), positioned after the lines. With the lines capped, the picker is always reachable.

**4. Compact product rows on smaller widths:**
- Reduce weight preset pill padding from `px-2.5` to `px-2`
- This is minor but helps at the wider width

### Result
- Bowl lines scroll within a 240px cap — 4-5 products visible, rest scrollable
- Product picker is always visible and accessible below the lines
- Wider dialog prevents right-side clipping of weight presets and cost
- Footer (total + save) remains pinned at bottom as before

### Files

| File | Action |
|------|--------|
| `AllowanceCalculatorDialog.tsx` | Widen dialog, add scroll cap to bowl lines, keep picker below |

