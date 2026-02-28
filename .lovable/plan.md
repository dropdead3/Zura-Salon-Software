

## Problem

The drink ingredient tooltips use CSS `group-hover` to show/hide. Inside the editor's scaled iframe (CSS `transform: scale()`), the browser's hit-testing becomes unreliable — hover detection fires on multiple cards simultaneously because the DOM elements are rendered at full size but visually compressed. This causes all tooltips to appear at once.

## Fix

Replace the CSS `group-hover` approach with JavaScript-managed hover state per card. This makes hover detection explicit and immune to scale-transform quirks.

### File: `src/components/home/DrinkMenuSection.tsx`

**DrinkCard changes:**

1. Add `const [isHovered, setIsHovered] = useState(false)` to each DrinkCard
2. Add `onMouseEnter`/`onMouseLeave` handlers to the card wrapper div
3. Replace all `group-hover:` classes with conditional classnames driven by `isHovered`:
   - Image scale: `group-hover:scale-110` → `isHovered ? 'scale-110' : ''`
   - Tooltip visibility: `opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0` → controlled by `isHovered`
   - Pointer events: `pointer-events-none group-hover:pointer-events-auto` → controlled by `isHovered`
4. Remove `group` from the wrapper className since it's no longer needed

Single file, ~10 line changes within the DrinkCard component.

