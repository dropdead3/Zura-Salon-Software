

# Move Tooltip to Info Icon Inside Button

## Change — `StockTab.tsx` (lines 557-573)

Restructure so the `Tooltip` wraps only a small `Info` circle icon inside the button, not the entire button.

```tsx
<Button
  size="sm"
  variant="outline"
  className="font-sans"
  onClick={() => setAutoParDialog(true)}
  disabled={inventory.length === 0}
>
  <SlidersHorizontal className="w-4 h-4 mr-1.5" />
  Auto-Set Pars
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        role="button"
        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground hover:bg-foreground/20 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <Info className="w-3 h-3" />
      </span>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-[300px] text-center">
      A par level is the ideal maximum stock quantity to keep on hand...
    </TooltipContent>
  </Tooltip>
</Button>
```

- Add `Info` to the lucide-react imports
- `e.stopPropagation()` on the info icon prevents clicking it from triggering the button's `onClick`
- Only hovering the small circled "i" icon shows the tooltip

| File | Change |
|------|--------|
| `StockTab.tsx` | Move Tooltip inside button, wrap only an `Info` icon |

