/**
 * HeroParallaxLayout — full-screen hero + scroll-revealed rising panel.
 *
 * Structure (the "tall scroll-driver" pattern used by Apple / Stripe /
 * Linear for cinematic hero reveals):
 *
 *   ┌─────────────────────────────────────┐
 *   │ [DRIVER]  height: SCROLL_RUNWAY_VH  │
 *   │   ┌─────────────────────────────┐   │
 *   │   │ [HERO]  sticky top:0        │   │  ← pinned for the whole runway
 *   │   │ height: 100vh               │   │     hero animations fire because
 *   │   └─────────────────────────────┘   │     `useScroll` is bound to the
 *   └─────────────────────────────────────┘     DRIVER (which moves), not the
 *   ┌─────────────────────────────────────┐     hero (which stays put).
 *   │ [RISING PANEL]  rounded-t + shadow  │
 *   │ — sits at normal flow position      │  ← starts BELOW the fold at rest
 *   │   (i.e. immediately after driver)   │     (no negative margin = no bleed)
 *   └─────────────────────────────────────┘
 *   ┌─────────────────────────────────────┐
 *   │ [REST OF PAGE]                      │
 *   └─────────────────────────────────────┘
 *
 * Why this shape:
 *   1. Hero is genuinely full-screen at rest — the rising panel is one
 *      viewport-height below the fold, never bleeding over the hero.
 *   2. Hero animations (split-headline, blur, parallax) work as before
 *      because `useHeroScrollAnimation` reads the driver ref from
 *      `HeroParallaxScrollContext` and binds `useScroll` to the driver.
 *   3. Pure CSS positioning — no scroll listeners, no JS transforms in
 *      the layout primitive itself. Cinematic mode adds a single
 *      rAF-throttled listener that writes a CSS variable on the driver.
 *
 * Position-aware, not type-aware: whatever the operator drags into slot 2
 * inherits the rising-panel treatment automatically.
 *
 * Mode variants (behind the same Site Design toggle):
 *   - 'subtle'    → hero stays at full opacity; rising panel reveals via
 *                   its own shadow + radius as it scrolls up. Default.
 *   - 'cinematic' → hero additionally fades + scales DOWN as it's covered.
 *                   Driven by a single scroll listener that writes
 *                   `--hero-parallax-progress` (0→1) on the driver
 *                   element; CSS does the interpolation.
 *
 * Doctrine alignment:
 *   - Preview-Live Parity: identical primitive in public site + editor view-mode.
 *   - Visibility contract: silent no-op when disabled or reduced-motion.
 *   - Container-aware: cinematic mode uses one rAF-throttled listener,
 *     never re-renders, and is safely tree-shaken when subtle.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HeroParallaxScrollProvider } from './HeroParallaxScrollContext';

export type HeroParallaxMode = 'subtle' | 'cinematic';

/**
 * Total scroll runway for the pinned hero, in vh units. 200vh = the user
 * scrolls one full screen-height while the hero is pinned (during which
 * the hero exit animations play out), then the rising panel takes over.
 *
 * Tunable in one place. Lower = snappier reveal, less animation room.
 * Higher = more cinematic, more scroll required to clear the hero.
 */
const SCROLL_RUNWAY_VH = 200;

interface HeroParallaxLayoutProps {
  /** The hero section node (rendered inside the sticky shell). */
  hero: ReactNode;
  /** The section directly below the hero (rises over the hero on scroll). */
  next: ReactNode;
  /** Everything after the rising section — flows normally. */
  rest: ReactNode;
  /** Operator toggle. When false, renders the three slots flat (no parallax). */
  enabled: boolean;
  /** Intensity. Defaults to 'subtle'. */
  mode?: HeroParallaxMode;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

/**
 * Scroll driver. Writes `--hero-parallax-progress` (0→1) on the driver
 * element so CSS can interpolate transforms (rising panel translateY,
 * cinematic hero opacity/scale) without React re-renders. One listener,
 * rAF-throttled, auto-detached on unmount.
 *
 * Runs whenever parallax is `active` (not just cinematic) — the rising
 * panel needs the same progress signal in subtle mode to translate up
 * over the hero in lockstep with the hero's exit animations.
 */
function useParallaxScrollDriver(
  driverRef: React.RefObject<HTMLDivElement>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const el = driverRef.current;
    if (!el || typeof window === 'undefined') return;

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const rect = el.getBoundingClientRect();
      // Driver enters the viewport at rect.top = 0 and fully exits at
      // rect.top = -(rect.height - window.innerHeight). The hero stays
      // pinned while the driver is in this range; map that range to 0→1.
      const travel = Math.max(1, rect.height - window.innerHeight);
      const traveled = Math.min(travel, Math.max(0, -rect.top));
      const p = traveled / travel;
      el.style.setProperty('--hero-parallax-progress', p.toFixed(3));
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [active, driverRef]);
}

export function HeroParallaxLayout({
  hero,
  next,
  rest,
  enabled,
  mode = 'subtle',
}: HeroParallaxLayoutProps) {
  const reducedMotion = usePrefersReducedMotion();
  const active = enabled && !reducedMotion;
  const cinematic = active && mode === 'cinematic';

  // Driver ref must be created unconditionally to keep hook order stable
  // when the operator flips the toggle while the page is mounted.
  const driverRef = useRef<HTMLDivElement>(null);
  // Driver runs whenever parallax is active so the rising panel can
  // translate up in lockstep with the hero's exit animations (concurrent,
  // not sequential). Cinematic mode reads the same variable for fade/scale.
  useParallaxScrollDriver(driverRef, active);

  if (!active) {
    // Silent no-op — render the three slots in normal flow. Provider
    // value is null so the hero falls back to its own sectionRef.
    return (
      <HeroParallaxScrollProvider value={null}>
        {hero}
        {next}
        {rest}
      </HeroParallaxScrollProvider>
    );
  }

  return (
    <HeroParallaxScrollProvider value={driverRef}>
      {/* Driver — the tall scroll runway. Its height is what gives the
          sticky hero shell room to remain pinned while the user scrolls
          and the hero animations play out. The hero's useScroll is bound
          to THIS element via context, so scrollYProgress advances 0→1
          across the runway exactly like a flat-flow hero. */}
      <div
        ref={driverRef}
        className="relative"
        style={{ height: `${SCROLL_RUNWAY_VH}vh` }}
        data-hero-parallax="driver"
        data-hero-parallax-mode={mode}
      >
        {/* Sticky hero shell. Pinned to top:0 for the full driver height.
            In cinematic mode we read --hero-parallax-progress (set by
            the scroll driver above) to fade + scale the hero as it's
            being covered by the rising panel below. */}
        <div
          className="sticky top-0 h-screen w-full overflow-hidden"
          data-hero-parallax="anchor"
          style={
            cinematic
              ? ({
                  opacity:
                    'calc(1 - 0.6 * var(--hero-parallax-progress, 0))',
                  transform:
                    'scale(calc(1 - 0.05 * var(--hero-parallax-progress, 0)))',
                  transformOrigin: 'center center',
                  willChange: 'opacity, transform',
                } as React.CSSProperties)
              : undefined
          }
        >
          {hero}
        </div>

        {/* Rising panel — absolutely positioned at the BOTTOM of the
            driver so at scroll 0 it sits exactly one viewport-height
            below the fold (translateY(100vh) from its anchor point).
            As the user scrolls, we translate it UP in lockstep with the
            hero's exit animations: by the time the hero has fully faded
            (scrollYProgress ≈ 0.5 → progress ≈ 0.5), the panel has
            traveled half the viewport and is covering the lower half of
            the hero. This makes the two motions concurrent rather than
            sequential.

            We translate from 100vh → 0 across the FULL runway so the
            panel is fully docked at progress = 1 (driver fully exited).
            That keeps the panel attached to its natural document-flow
            position once scrolling continues into the rest of the page. */}
        <div
          className={cn(
            'absolute left-0 right-0 bottom-0',
            'rounded-t-[2rem] overflow-hidden',
            'shadow-[0_-24px_48px_-24px_rgba(0,0,0,0.35)]',
            'bg-background',
            'z-10',
          )}
          style={{
            transform:
              'translateY(calc((1 - var(--hero-parallax-progress, 0)) * 100vh))',
            willChange: 'transform',
          }}
          data-hero-parallax="rising"
        >
          {next}
        </div>
      </div>

      {/* Rest of the page — flows normally below the rising panel. */}
      <div className="relative z-10 bg-background" data-hero-parallax="tail">
        {rest}
      </div>
    </HeroParallaxScrollProvider>
  );
}
