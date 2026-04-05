

# Enhance ZuraInANutshell with Animations and CTA

## Changes

### 1. Scroll-triggered fade-in animations
Add `framer-motion` to each feature row with staggered reveal:
- Section header: fade-in on viewport entry
- Each feature row: fade up (`y: 30 → 0`, `opacity: 0 → 1`) triggered by `useInView`, `once: true`
- Text side and visual side animate independently with a slight delay offset (text first, mockup 150ms later) for a polished staggered feel
- Use `margin: '-60px'` to trigger slightly before fully in view

### 2. "See all features" CTA at bottom
Add a centered CTA row below the feature grid:
- Link text: "See all features →" using `ArrowRight` icon
- Links to `/product`
- Styled as a subtle ghost link: `text-violet-400 hover:text-violet-300` with underline on hover
- Wrapped in motion for consistent scroll reveal

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/ZuraInANutshell.tsx` | **Modify** — add `motion` + `useInView` to section header and each feature row, add bottom CTA |

**1 file modified.**

