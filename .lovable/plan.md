

# Move Health Legend Out of Column Headers

The legend is currently duplicated inside every `BrowseColumn` header, making it cramped. Move it to a single shared row above the three-column browser.

## Changes

### 1. `BrowseColumn.tsx` — Remove the inline legend
Delete the health dot legend block (lines 97-113). The column headers will only show the title and search filter.

### 2. `SupplyLibraryTab.tsx` (~line 1362) — Add a shared legend above the browser
Insert a single horizontal legend row between the `space-y-3` div start and the column browser container. Only render it when health data exists (same condition). This gives it breathing room and avoids repetition.

```text
┌─────────────────────────────────────────────────┐
│  ● Complete   ● Some missing   ● Most missing   │  ← shared legend row
├──────────┬──────────────┬───────────────────────┤
│ CATEGORIES│ PRODUCT LINES│ PRODUCTS              │
│  Color 103│  Epilogue  77│  ...                  │
│  ...      │  ...         │                       │
└──────────┴──────────────┴───────────────────────┘
```

The legend will use the same dot styling but at a comfortable `text-[10px]` size with `gap-4` spacing, right-aligned or left-aligned above the browser panel.

