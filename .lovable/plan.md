

## Fix: Silver Shine Stroke Not Visible

### Diagnosis

The shine is invisible because of two compounding issues:

1. **`overflow: hidden`** on `.silver-shine-border` clips the `::before` pseudo-element (which uses `inset: -1px`) back to the element bounds
2. **Inner span uses `h-full w-full`** — it covers the entire button area, leaving zero gap for the gradient to show through along straight edges. The `border-radius` difference only creates a sub-pixel gap at corners, which is imperceptible.

The conic-gradient border trick requires the inner content to be inset by 1px on all sides so the rotating gradient peeks through as a "stroke."

### Fix

**File: `src/components/dashboard/SilverShineButton.tsx`**

Change the outer container to use `p-[1px]` padding to create the 1px border channel, and update the inner span to fill naturally (remove explicit `h-full w-full`):

```tsx
export function SilverShineButton({ children, className, onClick }: SilverShineButtonProps) {
  return (
    <motion.button
      key="collapsed"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClick}
      className={cn(
        'silver-shine-border rounded-md cursor-pointer p-[1px]',
        className,
      )}
    >
      <span className="silver-shine-inner block bg-background rounded-[calc(theme(borderRadius.md)-1px)]">
        <span className="inline-flex items-center gap-2 h-9 px-4 w-full text-sm font-sans whitespace-nowrap">
          {children}
        </span>
      </span>
    </motion.button>
  );
}
```

Changes:
- Add `p-[1px]` to the outer button — this creates a 1px inset channel between the button edge and the inner span, allowing the rotating conic gradient to show through as a border
- Remove `h-full w-full` from the inner span — no longer needed since `p-[1px]` handles the spacing; the inner span fills naturally via block layout

**File: `src/styles/silver-shine.css`** — no changes needed. The `overflow: hidden` is actually fine here because the gradient fills the button area and the 1px padding gap exposes it as a stroke.

### Result

The 1px channel between the outer edge and the inner `bg-background` span will reveal the slowly rotating conic gradient, creating the "occasional light catch on polished metal" effect as designed.

### Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/SilverShineButton.tsx` | Add `p-[1px]`, remove `h-full w-full` from inner span |

