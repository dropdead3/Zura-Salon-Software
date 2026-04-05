

# Floating Glass Morphism Nav Bar

## Concept

Replace the current full-width fixed header with a **floating pill-shaped nav bar** centered at the top of the viewport — inspired by the Nudge reference. The bar floats with margin from the edges, has a rounded-full shape, and uses a glass morphism effect (translucent background + backdrop blur + subtle border).

## Design

```text
          ┌─────────────────────────────────────────────────────┐
          │ [Logo]     Solutions  Ecosystem  Pricing  ...  [CTA]│
          └─────────────────────────────────────────────────────┘
```

- **Shape**: `rounded-full` pill with horizontal padding
- **Positioning**: `fixed top-4 left-4 right-4` (or centered with `max-w-5xl mx-auto`) so it floats away from edges
- **Glass effect**: `bg-white/[0.05] backdrop-blur-xl border border-white/[0.08]` — translucent dark glass
- **Shadow**: Subtle `shadow-lg shadow-black/20` for depth
- **On scroll**: Slightly increase background opacity (`bg-white/[0.08]`) for better contrast over content
- **Transition**: Smooth `transition-all duration-300` between states

## Changes

### MarketingNav.tsx
- Wrap the `<nav>` in a container div that is `fixed top-4 left-1/2 -translate-x-1/2 max-w-5xl w-[calc(100%-2rem)]`
- Apply `rounded-full` + glass morphism classes to the nav container itself
- Remove old full-width header background logic
- Keep all existing nav links, Solutions mega menu, CTAs, and mobile menu intact
- Mobile menu origin adjusts to account for the floating bar position

### MarketingLayout.tsx
- Reduce `pt-20` to `pt-24` to account for the floating bar's top offset

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/MarketingNav.tsx` | **Modify** — floating pill layout with glass morphism |
| `src/components/marketing/MarketingLayout.tsx` | **Modify** — adjust top padding |

**2 files modified.**

