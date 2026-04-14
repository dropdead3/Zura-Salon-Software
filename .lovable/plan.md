

## Add "Afterpay Only" Note to Surcharge Preview

A single-line addition beneath the surcharge preview grid to inform staff that surcharge-enabled links restrict payment to Afterpay only (no card fallback).

### Change

**File:** `src/components/dashboard/schedule/CheckoutSummarySheet.tsx`

After the closing `</div>` of the grid (line 842), before the enclosing container closes (line 843), insert:

```tsx
<p className="text-[11px] text-muted-foreground/70 italic mt-1">
  ⓘ Client will only see Afterpay as a payment option
</p>
```

This sits inside the existing surcharge preview box, appears only when the surcharge is active, and requires no new props or logic.

