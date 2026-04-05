

# Fix Nav/CTA Jitter — Add Scroll Dead Zone and Debounce

## Problem

The 5px scroll threshold is far too sensitive. Micro-fluctuations from browser rendering, trackpad inertia, and content reflows cause `navVisible` to toggle rapidly, making both the top nav and bottom CTA pill flicker back and forth.

## Solution

Three changes to the scroll handler in `MarketingNav.tsx`:

1. **Increase dead zone** from 5px to 15px — prevents micro-scroll noise from triggering state changes
2. **Add a direction lock** — require consistent scroll direction across multiple ticks before toggling visibility (track cumulative delta instead of per-tick comparison)
3. **Gate with `requestAnimationFrame`** — ensure at most one state update per frame, preventing rapid re-renders

### Logic (pseudocode)

```text
scrollDelta accumulates (currentY - lastY) each tick
if delta > 15  → scrolling down → hide nav, show CTA, reset delta
if delta < -15 → scrolling up   → show nav, hide CTA, reset delta
if near top (<100px) → always show nav, hide CTA
```

This replaces the current per-tick comparison with cumulative delta tracking, which is inherently jitter-resistant.

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/MarketingNav.tsx` | **Modify** lines 16-35 — replace scroll handler with cumulative-delta approach, increase threshold to 15px, add rAF gating |

**1 file modified.**

