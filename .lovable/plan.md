

# Enhance Solutions Dropdown — Backdrop Overlay, Sharper Radii, Viewport-Aware Positioning

## What Changes

### 1. Full-screen backdrop overlay when dropdown is open
- Add an animated `<motion.div>` overlay behind the dropdown that covers the entire viewport
- Applies `backdrop-blur-sm` and `bg-black/50` to darken and blur all page content beneath the nav
- Overlay fades in/out with the dropdown via `AnimatePresence`
- Clicking the overlay closes the dropdown

### 2. Reduced border radius on dropdown
- Dropdown panel: `rounded-2xl` → `rounded-lg` (8px)
- Inner hover items: `rounded-xl` → `rounded-md` (6px)
- Icon containers stay `rounded-lg` (fine detail)

### 3. Viewport-aware positioning
- Replace the static `left-1/2 -translate-x-1/2` centering with a `useEffect` that measures the dropdown's position after render
- If the dropdown would overflow the right edge of the viewport, shift it left; if it overflows left, shift right
- Use a ref on the dropdown panel + `getBoundingClientRect()` to detect overflow
- Clamp horizontal position so the panel always has at least 16px margin from viewport edges
- This also handles smaller screens (1024–1280px) where the centered dropdown could clip

## Files Modified

### `src/components/marketing/SolutionsMegaMenu.tsx`
- **DesktopDropdown**: Add backdrop overlay `<motion.div>` rendered as a sibling before the panel, using `fixed inset-0 z-40` with blur + darken
- **DesktopDropdown**: Change panel classes from `rounded-2xl` to `rounded-lg`, inner items from `rounded-xl` to `rounded-md`
- **DesktopDropdown**: Add a ref to the panel, run a positioning effect that adjusts `left` style based on viewport bounds
- **SolutionsDesktopTrigger**: Ensure the overlay click handler calls `setOpen(false)`

### `src/components/marketing/MarketingNav.tsx`
- Bump header `z-index` consideration — the overlay needs to sit between the page content and the nav. The overlay will use `z-40` (below nav's `z-50`), so the nav chrome stays clickable above the blur. No changes needed here since the nav is already `z-50`.

## Technical Notes
- Overlay uses `position: fixed; inset: 0` at `z-40`, dropdown panel at `z-50` — nav bar remains interactive
- Viewport detection runs on open and on window resize while open
- No new dependencies

