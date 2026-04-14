

# Break Order Button Below Price on Tight Viewports

## Change

**File:** `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx`, line 270

Replace the `flex items-center justify-between` row with a responsive layout that stacks vertically when space is tight using `flex-wrap` and `gap`.

```
// Before (line 270):
<div className="flex items-center justify-between pt-3 border-t border-border/40">

// After:
<div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40">
```

And make the Button grow to full width when it wraps by adding `flex-grow sm:flex-grow-0`:

```
// Button (line 283-293): add className additions
className={cn(
  tokens.button.cardAction,
  'flex-grow sm:flex-grow-0',
  config.recommended && 'bg-emerald-600 text-white hover:bg-emerald-700'
)}
```

This way: at normal widths, price and button sit side-by-side. When the card gets narrow, the button wraps below the price and stretches to full width for a clean tap target.

