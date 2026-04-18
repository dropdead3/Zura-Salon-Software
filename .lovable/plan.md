

## Goal
Three refinements to `RetailPerformanceAlert`:
1. **Smoother expand/collapse animation** — replace the current discrete mount/unmount (`{expanded && ...}`) with a height/opacity transition so the body slides open and closed instead of popping.
2. **Click toggles** — clicking when expanded should collapse (currently `onClick={expand}` only opens; collapse only fires on `onMouseLeave`/`onBlur`).
3. **Smaller headline** — reduce "RETAIL HEALTH · CRITICAL" from `text-xs` to `text-[11px]` (one notch down) to feel less shouty.

## Current behavior (file: `src/components/dashboard/sales/RetailPerformanceAlert.tsx`)
- `onClick={expand}` — always sets true; clicking an open card is a no-op.
- Body renders via `{expanded && <p>...</p>}` with `animate-in fade-in slide-in-from-top-1` — this only animates **in**; on close the element unmounts instantly with no exit animation.
- Headline: `font-display text-xs tracking-wide uppercase`.

## Changes

### 1. Click toggles (not just expands)
Replace `expand`/`collapse` pair with a single `toggle`, keep `collapse` only for `onMouseLeave`/`onBlur`.
```tsx
const toggle = () => setExpanded((v) => !v);
const collapse = () => setExpanded(false);
// onClick={toggle}, onMouseLeave={collapse}, onBlur={collapse}
// onKeyDown Enter/Space → toggle
```

### 2. Smooth expand/collapse animation
Switch from conditional render to a CSS grid-rows trick (the standard Tailwind pattern for unknown-height accordion content — no JS measurement, GPU-friendly, works with multi-line copy).

```tsx
<div
  className={cn(
    'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
    expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
  )}
>
  <div className="overflow-hidden">
    <p className="text-sm text-foreground/90 leading-relaxed mt-2 pl-12">
      {verdict.copy}
    </p>
  </div>
</div>
```
- `grid-rows-[0fr] → [1fr]` animates row height from 0 to content height with no measurement.
- `overflow-hidden` on the inner wrapper clips content during transition.
- Opacity co-animates so the text fades in/out as it expands/collapses.
- Drop the `animate-in fade-in slide-in-from-top-1` classes — those are enter-only Tailwind Animate utilities and don't reverse.

### 3. Reduce padding shift jank
Currently the row toggles between `py-3 px-4` (collapsed) and `p-4` (expanded), causing a 4px vertical jump. Unify to `py-3 px-4` always — the body block already provides its own `mt-2` so vertical rhythm stays clean and the container animates smoothly without parent-padding twitch.

### 4. Smaller headline
```tsx
// before
'flex-1 min-w-0 font-display text-xs tracking-wide uppercase'
// after
'flex-1 min-w-0 font-display text-[11px] tracking-wide uppercase'
```
Honors typography canon (still `font-display`, uppercase, no synthetic bold).

## Edge cases
- Touch devices: `mouseleave` doesn't fire — now click toggles, so users can tap-to-open and tap-to-close. Better than before.
- Keyboard parity: Enter/Space toggles; `onBlur` still collapses when focus leaves the card.
- Transition respects `prefers-reduced-motion` automatically (Tailwind's `transition-*` honors the media query via `motion-reduce:transition-none`? — not by default, but the 300ms duration is gentle. If we want strict compliance, add `motion-reduce:transition-none motion-reduce:duration-0`.) — including reduced-motion guard.

## Out of scope
- Tier copy / thresholds
- Outside-click handler (collapse on mouse-leave + click-toggle covers it)
- Animating the chevron rotation (already smooth via existing `transition-transform`)

## Files
- **Modify**: `src/components/dashboard/sales/RetailPerformanceAlert.tsx` — toggle handler, grid-rows transition wrapper, headline `text-[11px]`, unified padding, reduced-motion guard

