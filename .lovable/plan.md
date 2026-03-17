

# Adjust Brand Card Layout

## Changes in `SupplyLibraryTab.tsx` (lines 804-831)

Restructure the card content to:

1. **Product count badge** → move to `absolute top-2 left-2` (mirroring the "Missing Data" badge position on the right)
2. **Brand name** → vertically centered in the card using `flex-1 justify-center`
3. **Category summary text** → anchored to `absolute bottom-2` center of card

### Updated card structure:
```
┌──────────────────────┐
│ [3 products]  [Missing Data] │  ← badges top-left / top-right
│                              │
│         (logo)               │
│       Brand Name             │  ← centered vertically
│                              │
│   3 Flooring · 2 Paint ...   │  ← bottom center
└──────────────────────────────┘
```

### Implementation:
- Wrap logo + brand name in a `flex-1 flex flex-col items-center justify-center` container
- Move `PlatformBadge` (product count) to `absolute top-2 left-2`
- Move category summary `<p>` to `absolute bottom-2 left-0 right-0 text-center`
- Adjust card padding to `pt-9 pb-8 px-4` to accommodate absolute-positioned elements

