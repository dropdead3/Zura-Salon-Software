

# Fix: Navbar Scrollbar Always Visible

## Root Cause

Two CSS issues make scrollbars permanently visible instead of hover-reveal:

1. **Firefox global rule** (line 1409-1412): `* { scrollbar-color: hsl(var(--muted-foreground) / 0.15) transparent; }` applies a 15% opacity thumb to EVERY element unconditionally. Firefox has no hover-based scrollbar pseudo-element support, so this thumb is always visible.

2. **Firefox hover fix needed**: Change the default `scrollbar-color` to `transparent transparent` (fully hidden), then use `*:hover { scrollbar-color: ... }` to reveal on hover. Firefox does support `:hover` on the element itself for `scrollbar-color`.

## Changes

### 1. `src/index.css` (lines 1408-1412)

Replace the Firefox fallback block:

```css
/* Before */
* {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.15) transparent;
}

/* After */
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

*:hover {
  scrollbar-color: hsl(var(--muted-foreground) / 0.25) transparent;
}
```

This makes Firefox scrollbars fully invisible by default and only visible when the specific scrollable container (or its children) is hovered.

### 2. `.scrollbar-minimal` utility (lines 928-932)

The `.scrollbar-minimal` class used by some components should also get the Firefox hover-reveal pattern. Currently it likely inherits the global `*` rule. No additional changes needed since the global fix covers it.

### 3. `.scrollbar-thin` utility (lines 952-955)

Same -- the `scrollbar-color: transparent transparent` default is already set here. Just need to verify the `:hover` variant exists (it does at line 957-959). No changes needed.

## Technical Notes

- WebKit (Chrome, Safari, Edge): The existing `*:hover::-webkit-scrollbar-thumb` rules are correct and work as expected
- Firefox: `scrollbar-color` on the element itself does respond to `:hover`, so `*:hover { scrollbar-color: ... }` will work
- The `:hover` pseudo-class bubbles up (parent elements are also `:hover`), which means the sidebar nav scrollbar appears when hovering anywhere inside the nav -- this is the correct and desired behavior
- No JavaScript required

