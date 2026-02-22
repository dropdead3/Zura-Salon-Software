

# Animate Scrollbar Fade-In/Out on Hover

## Problem

Current scrollbar visibility is instant (snap on/off). The `transition` property on `::-webkit-scrollbar-thumb` background is ignored by most browsers, so native scrollbar hover-reveal has no animation.

## Solution

Two-pronged approach:

### 1. Radix ScrollArea Component (`src/components/ui/scroll-area.tsx`)

Animate the entire scrollbar container's **opacity** instead of just the thumb color. This gives a true smooth fade because `opacity` transitions work reliably on any element.

- Scrollbar: `opacity-0 transition-opacity duration-300 group-hover/scroll:opacity-100`
- Thumb: solid `bg-border` (always has color, but parent opacity controls visibility)
- This gives a clean 300ms fade-in on hover and fade-out on mouse leave

### 2. Native Scrollbars (`src/index.css`)

WebKit browsers partially support transitions on scrollbar pseudo-elements. Keep the existing `transition: background 0.2s ease` declaration (it works in newer Chromium builds). For browsers that ignore it, the instant show/hide is an acceptable graceful degradation since most scrollable areas use the Radix ScrollArea component anyway.

No changes needed to the native scrollbar CSS -- the transition is already declared.

### 3. Firefox

Firefox's `scrollbar-color` property does not support transitions. No CSS-only animation is possible. Current instant show/hide on hover is the best available behavior.

## Technical Details

**`src/components/ui/scroll-area.tsx`** -- Update ScrollBar:

```tsx
// ScrollAreaScrollbar: add opacity-0, transition-opacity, group-hover fade-in
className: "opacity-0 transition-opacity duration-300 group-hover/scroll:opacity-100"

// ScrollAreaThumb: change from bg-transparent + group-hover to solid bg-border
// (parent opacity now handles visibility)
className: "bg-border"
```

This is a single-file change affecting all 235+ usages of ScrollArea across the app.

