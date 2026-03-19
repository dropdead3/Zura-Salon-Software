

# Make Inventory Table Header Sticky on Scroll

## Change — `StockTab.tsx` (line ~683)

Add `sticky top-0 z-10 bg-card` to the `<TableHeader>` so it stays fixed when scrolling through inventory rows:

```tsx
// From:
<TableHeader>

// To:
<TableHeader className="sticky top-0 z-10 bg-card">
```

Single class addition — the `top-0` anchors it to the scroll container, `z-10` keeps it above row content, and `bg-card` prevents rows from showing through.

