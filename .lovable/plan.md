

# Fix Search Bar Dropdown Clipping

## Problem

The top bar container (line 169 of `SuperAdminTopBar.tsx`) uses `rounded-full overflow-x-hidden`, which clips the search dropdown. The `TopBarSearch` component renders its dropdown as `absolute top-full` (line 249), meaning the dropdown tries to appear below the search input but **inside** the bar's overflow-hidden boundary — so it gets cut off.

## Fix

### File: `src/components/dashboard/TopBarSearch.tsx`

Change the dropdown from a positioned-inside-container approach to a **fixed-position portal-style overlay** that escapes the overflow clip.

1. **Replace `absolute top-full left-0 right-0 mt-2`** (line 249) with a dynamically positioned panel that uses `fixed` positioning calculated from the search trigger's bounding rect
2. Use a `useEffect` + `getBoundingClientRect()` on the container ref to position the dropdown below the search button, matching its width
3. This ensures the dropdown renders outside the `overflow-x-hidden` parent

Specific changes:
- Add state for dropdown position (`top`, `left`, `width`)
- On open, calculate position from `containerRef.current.getBoundingClientRect()`
- Change the dropdown div from `absolute top-full left-0 right-0 mt-2` to `fixed` with computed `top`, `left`, `width` styles
- Add a resize/scroll listener to reposition if needed

### No other files change

The container in `SuperAdminTopBar.tsx` keeps `overflow-x-hidden` (needed for the pill shape). The fix is entirely within `TopBarSearch.tsx`.

## Summary

| Item | Detail |
|------|--------|
| Root cause | Dropdown inside `overflow-x-hidden` parent gets clipped |
| Fix | Use `fixed` positioning with computed coordinates |
| Files modified | 1 (`TopBarSearch.tsx`) |

