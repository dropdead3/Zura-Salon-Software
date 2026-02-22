

# Polish Scrollbars -- Invisible Until Hover

## What Changes

All scrollbars across the app will become invisible by default and only appear (fade in) when the user hovers over the scrollable area. Track backgrounds will be fully transparent -- no visible container/gutter. This applies globally to native scrollbars and to the Radix ScrollArea component.

## Changes

### 1. Global Native Scrollbar Styles (`src/index.css`)

Replace the existing scrollbar block (lines 1364-1434) with:

- **Track**: fully transparent (no background color) in both light and dark mode
- **Thumb**: starts at 0 opacity, transitions to visible on container hover
- **Width**: stays at 8px for comfortable grab target
- **Firefox**: uses `scrollbar-width: thin` with transparent track color; Firefox doesn't support hover-reveal natively, so the thumb will remain subtly visible (`0.15` opacity) but with no track background
- Remove `.sidebar-nav` and `.dashboard-cursor` track background overrides (they become transparent too)
- Remove the `.dashboard-top-bar::after` pseudo-element that filled the scrollbar gutter gap (no longer needed with transparent tracks)

The hover-reveal pattern uses a parent hover selector:

```css
::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
  transition: background 0.2s ease;
}

*:hover::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.25);
}

*:hover::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.4);
}
```

### 2. Radix ScrollArea Component (`src/components/ui/scroll-area.tsx`)

Update the `ScrollBar` component to:
- Remove the `border-l-transparent` / `border-t-transparent` borders (these create visual gutter)
- Make the thumb transparent by default with a hover group pattern
- Add `group` class to the `ScrollArea` root
- Thumb transitions from `bg-transparent` to `bg-border` on group hover

### 3. Existing Utility Classes (`src/index.css`)

The `.scrollbar-minimal` and `.scrollbar-thin` utility classes (lines 920-964) will also be updated to use transparent tracks and hover-reveal thumbs, staying consistent with the global pattern.

## Technical Notes

- WebKit (Chrome, Safari, Edge) supports `::-webkit-scrollbar` pseudo-elements with CSS transitions for full hover-reveal
- Firefox only supports `scrollbar-color` which doesn't support transitions or hover states -- the thumb will be set to a very subtle opacity as a graceful fallback
- No JavaScript required -- pure CSS solution
- The Radix ScrollArea uses Tailwind's `group` / `group-hover` pattern for the same effect

