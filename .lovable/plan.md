

# Fix Invisible Download Dropdown on Level Roadmap

## Problem
The Level Roadmap is rendered as a `fixed inset-0 z-[80]` overlay (line 216). The Radix `DropdownMenuContent` portals to `document.body` with `z-50` from the base component. Since `z-50 < z-[80]`, the dropdown menu renders behind the overlay — invisible but still clickable.

## Fix
Add `z-[90]` to the `DropdownMenuContent` className on line 232 so it renders above the `z-[80]` overlay.

```tsx
<DropdownMenuContent align="end" className="w-52 z-[90]">
```

One line change. One file.

| File | Change |
|------|--------|
| `src/components/dashboard/settings/LevelRoadmapView.tsx` | Add `z-[90]` to `DropdownMenuContent` className (line 232) |

