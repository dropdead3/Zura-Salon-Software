

# Add QuickReorderButton to StockoutAlertCard

Simple wiring change — the `QuickReorderButton` component already exists and works in the Supply Intelligence feed. This adds it to each stockout alert row in the predictive backroom section.

## Changes

**File: `src/components/dashboard/backroom/predictive-backroom/StockoutAlertCard.tsx`**

1. Replace `ShoppingCart` import with `QuickReorderButton` import
2. In `AlertItem`, replace the static "Order X units" text with the `QuickReorderButton` component, passing `alert.product_id`
3. Keep the recommended quantity display as secondary text next to the button

```text
Before:
  🛒 Order 12 oz        (static text, no action)

After:
  Suggested: 12 oz  [Reorder →]   (one-tap PO creation)
```

**No new files, no DB changes, no new hooks.** Single file edit reusing existing `QuickReorderButton`.

