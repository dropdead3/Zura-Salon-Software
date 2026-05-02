# Fix Hero Parallax — Full-Screen Rest + Live Hero Animations

## What's wrong today

Two regressions visible in the screenshot, both caused by the current `HeroParallaxLayout` structure:

1. **Rising panel bleeds into the hero at rest.** The cream rounded edge appears over the hero before any scrolling, because the rising panel uses `-mt-8` (negative margin) to hide the seam. That negative margin pulls the next section UP, exposing its rounded corner over the hero immediately.
2. **Hero scroll animations stop working** (headline split, blur, parallax fade). The hero is wrapped in a `position: sticky; height: 100vh` container, which means the hero's own `<section>` element never moves relative to the viewport while sticky is engaged. Its `useScroll({ target: sectionRef })` consequently reads `scrollYProgress = 0` for the entire reveal — split/blur/parallax never fire.

The user's intent is clear: hero is 100% full-screen at rest, hero animations run during scroll, and the next section parallaxes over the hero only as the user scrolls.

## Solution: tall scroll-driver pattern

Replace the current sticky-hero / negative-margin approach with the canonical "tall scroll driver" pattern used by every premium parallax site (Apple, Stripe, Linear).

```text
┌─────────────────────────────────────┐
│  [DRIVER]   height: 200vh           │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ [HERO]   sticky top:0       │   │  ← hero pins for 200vh of scroll
│   │ height: 100vh, full-bleed   │   │     and runs its own animations
│   │ — runs split/blur/parallax  │   │     against the driver's progress
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  [RISING PANEL]                     │  ← starts at top: 200vh (no bleed
│  rounded-t, shadow, bg-background   │     at rest), scrolls up over the
│                                     │     hero naturally as user scrolls
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  [REST OF PAGE]                     │
└─────────────────────────────────────┘
```

Three structural changes deliver both fixes:

- **Driver wraps the hero** at `height: 200vh` (one screen of full-bleed display + one screen of scroll runway for the animation). Hero is `sticky top:0 h-screen` inside the driver.
- **Rising panel sits at normal flow position 200vh** — no negative margin. At scroll 0 the seam is below the fold, so the hero is genuinely full-screen at rest.
- **Hero's `useScroll` target becomes the DRIVER**, not the hero `<section>`. The driver moves through the viewport as the user scrolls, so `scrollYProgress` advances 0 → 1 across the 200vh range, restoring the split/blur/parallax exactly as on flat sites.

## File-by-file changes

**`src/components/home/HeroParallaxLayout.tsx`** — rewrite the layout primitive:
- Driver `<div>` at `min-h-[200vh] relative` — this is what generates the scroll runway.
- Hero shell `<div>` inside the driver at `sticky top-0 h-screen overflow-hidden`. Children render here.
- Expose the driver ref so the hero can subscribe to it (see below).
- Rising panel sits AFTER the driver in flow with `rounded-t-[2rem] shadow-[...] bg-background` — no negative margin. The shadow + radius become visible naturally as the panel scrolls up.
- Cinematic mode keeps its CSS-variable scroll driver but reads from the new driver ref.

**Hero scroll target rewiring — minimal-touch via context:**
- Add `src/components/home/HeroParallaxScrollContext.tsx`: a tiny React context exposing the driver `RefObject<HTMLElement>` (or `null` when parallax is off).
- `HeroParallaxLayout` provides the context with the driver ref.
- `useHeroScrollAnimation` reads the context. When a parallax driver is present, it binds `useScroll({ target: parallaxDriverRef, offset: ['start start', 'end start'] })`. When absent (parallax off), it falls back to the existing `target: sectionRef` behavior. Hook order stays stable — `useScroll` is always called once.
- This keeps every other consumer of the hero (preview, edit-mode bento, reduced-motion, all 3 Vitest specs we just shipped) working unchanged.

**`src/components/home/PageSectionRenderer.tsx`** — no behavior change; still selects slot-1 as the rising panel and forwards `mode`. The structural fix lives entirely in `HeroParallaxLayout`.

## Tests

Update existing specs and add coverage for the two regressions:

- `HeroParallaxLayout.test.tsx`: assert the driver exists at `[data-hero-parallax="driver"]` with min-height ≥ 100vh, hero shell is `sticky` inside it, rising panel has NO negative margin (no `-mt-` class), and rest still wraps slot 2+. Disabled / reduced-motion specs unchanged.
- New `HeroParallaxLayout.no-bleed.test.tsx`: at scroll 0, `[data-hero-parallax="rising"]` `getBoundingClientRect().top` is `>= window.innerHeight` (the rising panel is below the fold). Locks the bug we're fixing.
- New `useHeroScrollAnimation.parallax-binding.test.ts`: when wrapped in `HeroParallaxScrollContext` with a driver ref, `useScroll` is called with that ref; without context, it falls back to `sectionRef`. Locks the animation-restoration fix.

Existing `HeroSlideRotator.scroll-fx.test.tsx` will be re-validated — it spies on `useScroll` calls and asserts the rotator binds it correctly. The context-aware change must not break that spec.

## Out of scope

- Editor edit-mode is unaffected (`PageSectionRenderer` already short-circuits parallax in edit-mode — bento cards don't get sticky positioning).
- Cinematic-mode fade/scale math stays as-is; only the ref it reads from changes.
- Reduced-motion behavior unchanged — silent no-op.

## Risks & mitigation

- **Risk:** doubling the hero's scroll runway (200vh) means users scroll one extra screen before reaching the rising panel. **Mitigation:** this is the intended UX — it gives the hero animation room to play out cinematically. Tunable via a single constant in the layout (`SCROLL_RUNWAY_VH`) if we want to ease it back to 150vh later.
- **Risk:** the hero is a system-of-record component used by many tenants. **Mitigation:** the context fallback means tenants without parallax see ZERO change — `useHeroScrollAnimation` reads `null` from context and uses `sectionRef` exactly as today.
- **Risk:** test fixture for `useHeroScrollAnimation` needs a Provider wrapper. **Mitigation:** ship a small `HeroParallaxScrollContext.Provider` test helper alongside the context.
