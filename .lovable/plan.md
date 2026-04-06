

# Floating Scrollbar Handles — Remove Gutters and Background Fill

## Problem
The scrollbars in the criteria matrix (and globally) show visible track gutters and background fills, making them look like traditional system scrollbars rather than modern floating handles overlaid on content.

## Solution
Update the Radix ScrollArea tokens and the global native scrollbar CSS so tracks are fully transparent with no padding/gutter, and thumbs appear to float over content with a slight inset and rounded pill shape.

### Changes

**1. Design tokens (`src/lib/design-tokens.ts`) — scrollbar section**

- **Track**: Remove `p-[1px]` padding from `trackV` and `trackH` — this creates the gutter effect. Make tracks thinner (e.g. `w-1.5` / `h-1.5`) so the thumb floats.
- **Thumb**: Add margin/inset so the thumb doesn't touch the container edge. Use `bg-foreground/20 hover:bg-foreground/35` for a softer, floating appearance against any background.

Updated tokens:
```
track: 'flex touch-none select-none bg-transparent opacity-0 transition-opacity duration-700 ease-in-out group-hover/scroll:opacity-100'
trackV: 'h-full w-2.5 border-l-[3px] border-l-transparent'  // transparent border creates inset
trackH: 'h-2.5 flex-col border-t-[3px] border-t-transparent'
thumb: 'relative flex-1 rounded-full bg-foreground/15 hover:bg-foreground/30'
```

The `border-l-transparent` / `border-t-transparent` trick pushes the thumb inward without a visible gutter.

**2. Global native scrollbar CSS (`src/index.css`)**

Update the global `::webkit-scrollbar` rules (lines ~1440-1483 and ~1520-1532):
- Set scrollbar width/height to `6px` (thinner)
- Remove any background on `::-webkit-scrollbar` itself (already transparent but ensure no override)
- Use `border-radius: 9999px` on thumb
- Add transparent border on thumb to create float effect: `border: 2px solid transparent; background-clip: padding-box`
- Firefox: keep `scrollbar-width: thin` with transparent track

Key CSS changes:
```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 9999px;
  border: 1px solid transparent;
  background-clip: padding-box;
}

*:hover > ::-webkit-scrollbar-thumb,
*:hover::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  background-clip: padding-box;
}
```

### Files Modified
- `src/lib/design-tokens.ts` — scrollbar token updates (3 lines)
- `src/index.css` — native scrollbar CSS refinement (~15 lines across two sections)

### No database changes.

