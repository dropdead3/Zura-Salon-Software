

# Fix: Brand Grid Scroll Overflow

## Problem
The brand card grid inside the Supply Library dialog doesn't scroll. The `BrandCardGrid` wrapper uses `flex-1 h-0` but the `ScrollArea` inside also uses `flex-1 h-0` — both competing for flex sizing without a proper `min-h-0` on the outer wrapper, causing the ScrollArea to not constrain its height and therefore not trigger overflow scrolling.

## Fix (single file)

### `SupplyLibraryDialog.tsx` — `BrandCardGrid` return wrapper (line 89)

Change the root div from:
```
<div className="flex flex-col flex-1 h-0">
```
to:
```
<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
```

And change the ScrollArea (line 124) from:
```
<ScrollArea className="flex-1 h-0">
```
to:
```
<ScrollArea className="flex-1 min-h-0">
```

The key fix is `min-h-0` on both the flex container and the ScrollArea. In flexbox, children default to `min-height: auto` which prevents them from shrinking below their content size — so the ScrollArea never actually overflows. Setting `min-h-0` allows it to shrink within the dialog's `max-h-[85vh]` constraint, enabling the Radix ScrollArea to detect overflow and show the scrollbar.

