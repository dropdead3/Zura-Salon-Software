

## Goal
Hide the dashboard top bar when scrolling **down**, reveal it when scrolling **up**, always show it when at the top of the page — with a smooth transform animation. Apply only to standard dashboard routes (the `hideFooter` mode already has its own hover-based reveal pattern; we'll leave that alone).

## Where it lives

`src/components/dashboard/SuperAdminTopBar.tsx` — line 152-167. Currently:

```tsx
hideFooter
  ? <fixed + hover-reveal logic>
  : cn("sticky", isImpersonating ? "top-[44px]" : "top-0")
```

The non-`hideFooter` branch is what shows on every standard dashboard route (Command Center, Sales, etc.). It's `sticky` and never hides.

## Approach

### 1. New hook: `src/hooks/useScrollDirection.ts`
Tracks scroll position on `window` (or a passed scroll target). Returns:
```ts
{ direction: 'up' | 'down' | null, isAtTop: boolean }
```

Implementation:
- `useEffect` attaches a passive `scroll` listener
- Uses `requestAnimationFrame` to throttle reads (no per-frame state thrash)
- Compares `window.scrollY` against a ref-stored `lastY`
- **Threshold of 8px** before flipping direction → ignores trackpad jitter / momentum bounces
- `isAtTop = scrollY < 16` → forces visible near top
- Returns `null` direction on first mount so we don't animate on page load

### 2. Visibility computation
```ts
const hidden = !isAtTop && direction === 'down';
```

### 3. Wire into `SuperAdminTopBar`
Update the non-`hideFooter` className branch (line 164):

```tsx
cn(
  "sticky transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
  isImpersonating ? "top-[44px]" : "top-0",
  hidden && "-translate-y-[calc(100%+12px)]"  // +12px clears the pt-3 padding
)
```

The `+12px` ensures the top padding zone also slides off so nothing peeks. Transform-based animation is GPU-cheap and won't reflow content below.

### 4. Honor reduce-motion + animation intensity
- `prefers-reduced-motion` → snap (no `transition-transform`)
- Existing `.animations-off` class on `<html>` already nukes transitions globally → no extra work needed
- "Calm" intensity → existing system applies; default `duration-300` already feels calm

### 5. Edge cases handled
- **God Mode banner active** (`isImpersonating`): top offset stays `top-[44px]`. When hidden, the bar slides up past the banner correctly because `translate-y` is relative to its own height, not viewport.
- **`hideFooter` routes** (Schedule, full-screen views): untouched — hover-reveal pattern preserved.
- **Pointer events when hidden**: not strictly needed since the bar is offscreen, but we'll match the existing pattern's `pointer-events-none` when fully translated for safety with hovering tooltips.
- **Scroll containers other than `window`**: dashboard scrolls on `window` (verified by `min-h-screen` in DashboardLayout) → window listener is correct.

## Out of scope
- Sidebar hide-on-scroll (separate fixed element, different UX expectations)
- God Mode banner hide-on-scroll (it's an attention/system layer — should stay visible)
- The `hideFooter` hover-reveal mode (already works as designed for full-screen Schedule view)

## Verification signal
- Scroll down on `/dashboard` → top bar slides up smoothly, content beneath gains the full viewport
- Scroll up by any amount → top bar slides back down
- At `scrollY < 16` → bar always visible, regardless of direction
- Tiny trackpad jitters (< 8px) don't toggle the bar
- Animation Intensity = "Off" → bar snaps instantly, no transition
- God Mode banner visible → bar correctly tucks under the banner when hidden, reveals at `top-[44px]` when shown
- Schedule (`hideFooter`) route → unchanged, still uses hover-reveal

## Files
- **Create**: `src/hooks/useScrollDirection.ts`
- **Modify**: `src/components/dashboard/SuperAdminTopBar.tsx` (className branch on line 164 + import)

## Ship order
1. Create `useScrollDirection` hook
2. Wire into `SuperAdminTopBar` non-`hideFooter` branch
3. Manual scroll test on Command Center

