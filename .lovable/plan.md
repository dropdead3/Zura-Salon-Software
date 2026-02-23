

## Fix Internal Rounded Corner on Table Inside Card

### Problem
The `Table` component's wrapper `div` uses `rounded-[inherit]`, which inherits `rounded-xl` from the parent Card. When the batch bar sits below the table, this creates a visible double-rounded-corner effect -- the card clips its own corners correctly, but the table's wrapper also draws its own rounded border inside, producing an awkward inner radius visible between the last row and the batch bar.

### Solution
Remove `rounded-[inherit]` from the Table component's wrapper div in `src/components/ui/table.tsx`. The Card's `overflow-hidden` already handles all corner clipping, so the table doesn't need its own rounding.

### File Changed

**`src/components/ui/table.tsx`** (line 7)

```
Current:  <div className="relative w-full overflow-auto rounded-[inherit]">
Updated:  <div className="relative w-full overflow-auto">
```

### Risk Assessment
- `rounded-[inherit]` only has an effect when the Table is inside a rounded parent with visible overflow. Since the Appointments Hub Card already uses `overflow-hidden`, this class is redundant there.
- For any other Table usage outside a Card (e.g., inside a plain div), removing `rounded-[inherit]` has no visual impact since the inherited value would be `0`.
- Net effect: eliminates the internal double-radius artifact with no side effects.

