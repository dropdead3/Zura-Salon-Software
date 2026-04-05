

# Hide-on-Scroll Nav + Bottom Sticky CTA Bar

## Behavior

1. **Top nav**: Visible on page load. Hides when scrolling down. Re-appears (slides down) when scrolling up. Uses scroll direction detection with a small threshold to avoid jitter.
2. **Bottom sticky bar**: Appears only when the top nav is hidden (i.e., user has scrolled down past hero). Shows "Ready for a better salon software? Book A Demo >" as a full-width bottom bar. Hides when top nav reappears on scroll-up.

## Design

**Top nav** (existing floating pill) -- add `translate-y` animation:
- Visible: `translateY(0)`, `opacity: 1`
- Hidden: `translateY(-100%)`, `opacity: 0`
- Smooth `transition-transform duration-300`

**Bottom bar**:
- Fixed bottom-0, full width, glass morphism (`bg-white/[0.06] backdrop-blur-xl border-t border-white/[0.08]`)
- Content: left-aligned text "Ready for a better salon software?" + right-aligned "Book A Demo" link with `ArrowRight` icon, violet gradient pill
- Slides up from bottom with `framer-motion` AnimatePresence
- Height: `py-3 px-6`, compact

## Scroll Logic

Track `lastScrollY` and `scrollDirection`. On each scroll event:
- If `scrollY > lastScrollY + 5` (scrolling down) and past hero (~400px): hide nav, show bottom bar
- If `scrollY < lastScrollY - 5` (scrolling up): show nav, hide bottom bar
- If near top (`scrollY < 100`): always show nav, hide bottom bar

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/MarketingNav.tsx` | **Modify** -- add scroll-direction detection, conditional `translateY` hide/show, and bottom sticky CTA bar with AnimatePresence |

**1 file modified.**

