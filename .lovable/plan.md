

# Add Bottom Scroll Indicator to Criteria Matrix

## What We're Adding
A vertical (bottom-edge) scroll indicator matching the existing right-edge pattern — a gradient fade at the bottom plus a ChevronDown button that scrolls down on click. This tells users there are more rows below (Retention section, etc.).

## Change

### File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`

**1. Add `canScrollDown` state** alongside `canScrollRight` in `ScrollableTableWrapper`.

Update `checkScroll` to also compute:
```ts
const canDown = el.scrollHeight - el.scrollTop - el.clientHeight > 4;
setCanScrollDown(canDown);
```

**2. Render bottom gradient + chevron button** in both fullscreen and inline modes, mirroring the right-edge pattern:

- Bottom gradient: `absolute bottom-0 left-0 right-0 h-12 pointer-events-none bg-gradient-to-t from-card to-transparent` (or `from-background` in fullscreen)
- ChevronDown button: `absolute bottom-2 left-1/2 -translate-x-1/2` with same styling as the right button (`w-7 h-7 rounded-full bg-muted/80 backdrop-blur-sm border border-border/60`)
- `onClick` scrolls down by 200px with smooth behavior

**3. Both render paths** (fullscreen `div` at ~line 175 and inline `div` at ~line 210) get the same bottom indicator treatment.

### Single file edit. No database changes.

