

# Fix: Anchor Command Surface to Search Bar Position

## Root Cause

The command surface panel (lines 325-336 of `ZuraCommandSurface.tsx`) uses viewport-centered positioning:
```
left: 'calc(50% + var(--sidebar-offset, 0px))',
transform: 'translateX(-50%)',
```
This places it in the center of the content area regardless of where the search bar actually sits. The search bar lives in the LEFT zone of the top bar (line 176-183 of `SuperAdminTopBar.tsx`), so the panel appears disconnected — centered on screen instead of growing from the pill.

## Solution: Ref-Based Anchor Measurement

1. Add a `ref` to `TopBarSearch` and forward it up to `DashboardLayout`
2. Pass the ref into `ZuraCommandSurface`
3. On open, measure `ref.getBoundingClientRect()` to get the pill's exact screen position
4. Position the panel's top-left corner at the pill's top-left corner (with the pill's Y as `top`, pill's X as `left`)
5. The panel grows downward and rightward from that anchor — no centering, no `translateX(-50%)`

## Files to Edit (4)

### `TopBarSearch.tsx` — Add forwardRef
- Convert to `forwardRef` so the button element's DOM rect can be measured from parent
- Forward ref to the root `<button>`

### `SuperAdminTopBar.tsx` — Accept and forward searchBarRef
- Add `searchBarRef?: React.RefObject<HTMLButtonElement>` to props
- Pass to `TopBarSearch` via `ref={searchBarRef}`

### `DashboardLayout.tsx` — Create ref, pass to both top bar and command surface
- Create `searchBarRef = useRef<HTMLButtonElement>(null)`
- Pass to `SuperAdminTopBar` as `searchBarRef`
- Pass to `ZuraCommandSurface` as `anchorRef`

### `ZuraCommandSurface.tsx` — Replace centering with anchor-based positioning
- Accept `anchorRef?: React.RefObject<HTMLElement>`
- On open (inside effect or useMemo), call `anchorRef.current?.getBoundingClientRect()` to get `{ top, left, width, height }`
- Position panel: `top: rect.top`, `left: rect.left` (no centering transform)
- Width stays `max-w-[720px]` / `max-w-[1080px]` but grows rightward from anchor
- Add `max-w` guard so it doesn't overflow viewport right edge: `maxWidth: min(720, viewportWidth - rect.left - 16)`
- Set `transformOrigin: 'top left'` on the motion.div
- Keep existing spring animation but change initial from `y: -12` to `scale: 0.97, opacity: 0` with `transformOrigin: 'top left'` for a subtle grow-from-pill effect
- Mobile: keep existing full-screen sheet behavior (unchanged)
- Recalculate position on resize via a simple state + resize listener

## Animation Refinement

Open: `scale: 0.97, opacity: 0 → scale: 1, opacity: 1` with `transformOrigin: 'top left'` using existing `SPRING_OPEN`. This makes it feel like the pill expands into the panel.

Close: reverse — `scale: 1 → scale: 0.97, opacity: 0` with `SPRING_CLOSE`, collapsing back toward the pill origin.

The `y: -12` translate is removed — scale-from-origin replaces it since the panel now actually originates from the pill's position.

## Geometry on Desktop

- Panel top = search pill top (typically ~top of the h-14 bar)
- Panel left = search pill left
- Panel grows down + right from there
- Max height unchanged: `min(560px, calc(100vh - top - 40px))`
- Right-edge overflow guard ensures panel stays within viewport

## No Other Changes

All internal content (proactive state, results, AI fallback, chain bar, preview panel, footer) remains untouched. Only the outer container positioning and animation origin change.

