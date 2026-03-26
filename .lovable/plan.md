

## Fix: Tooltip Not Appearing on Suggested Price Info Icon

### Root Cause
The `MetricInfoTooltip` is placed **inside** the `<Button>` element (line 1063). The button captures all pointer events, preventing the tooltip's hover trigger from firing on the `Info` icon.

### Fix (`AllowanceCalculatorDialog.tsx`)

Move the `MetricInfoTooltip` **outside** the `<Button>`, placing it as a sibling. Wrap both the button and the tooltip in a `flex items-center gap-2` container so the info icon sits beside the button rather than inside it.

**Before (lines ~1048–1067):**
```tsx
<Button ... onClick={...}>
  <ArrowRight className="w-3 h-3" />
  Use $540 suggested price
  <MetricInfoTooltip description="..." />  {/* ← trapped inside button */}
</Button>
```

**After:**
```tsx
<div className="flex items-center gap-2">
  <Button ... onClick={...}>
    <ArrowRight className="w-3 h-3" />
    Use $540 suggested price
  </Button>
  <MetricInfoTooltip
    description="Calculated using the Vish 8% target: ..."
    className="w-3.5 h-3.5 text-amber-500/60"
  />
</div>
```

### Result
- Info icon receives its own hover events → tooltip appears on hover
- Button click behavior unchanged
- Visual layout stays the same (icon sits right next to the button)

### Files
| File | Change |
|------|--------|
| `AllowanceCalculatorDialog.tsx` | Move `MetricInfoTooltip` outside `Button`, wrap both in flex container |

