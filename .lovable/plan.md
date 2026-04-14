

## Problem

"Add a Tip" is top-left aligned and sits above the subtotal. The user wants it centered, below the subtotal, with added context that the tip is in addition to the subtotal.

## Solution

Reorder and restyle the TipScreen header in `S710CheckoutSimulator.tsx`.

### Changes

**File:** `src/components/dashboard/settings/terminal/S710CheckoutSimulator.tsx` (lines 192–196)

1. **Move subtotal block above "Add a Tip"** — swap the order so subtotal comes first.
2. **Center "Add a Tip"** — change from left-aligned (`text-white/40 text-[8px]`) to centered.
3. **Add context line** — insert a small muted line below "Add a Tip": `"Tip is added to the subtotal above"`.

Replace lines 192–196 with:

```tsx
<div className="text-center mb-2">
  <p className="text-white/50 text-[9px] tracking-wider uppercase">Subtotal</p>
  <p className="text-white text-base font-medium font-mono mt-0.5">{fmt(total)}</p>
</div>
<div className="text-center mb-4">
  <p className="text-white/40 text-[9px] tracking-[0.15em] uppercase">Add a Tip</p>
  <p className="text-white/25 text-[7px] mt-0.5">In addition to the subtotal above</p>
</div>
```

