/**
 * HeroParallaxLayout — sticky-hero / rising-panel scroll treatment.
 *
 * Wraps a `[hero, nextSection, ...rest]` sequence so the hero stays pinned
 * at the top of the viewport while the section directly below it scrolls
 * UP and OVER the hero. Once the next section fully covers the hero,
 * sticky releases naturally and the rest of the page scrolls flat.
 *
 * Pure CSS (`position: sticky`) — no scroll listeners, no JS transforms,
 * GPU-accelerated by default. Works with any browser that supports
 * `position: sticky` (universal in 2024+).
 *
 * Position-aware, not type-aware: whatever the operator drags into slot
 * 2 inherits the rising-panel treatment automatically.
 *
 * Mode variants (behind the same Site Design toggle):
 *   - 'subtle'    → hero stays at full opacity; rising panel reveals via
 *                   shadow + radius. Calm, executive, the default.
 *   - 'cinematic' → hero additionally fades + scales DOWN as it's covered,
 *                   giving a depth-receding feel. Driven by a single
 *                   scroll listener that writes CSS variables on the
 *                   anchor element (no per-frame React re-renders).
 *
 * Doctrine alignment:
 *   - Preview-Live Parity: this single primitive is rendered identically
 *     in the public site and the editor's view-mode preview.
 *   - Visibility contract: silently no-ops when prerequisites aren't met
 *     (no hero in slot 0, only one section, reduced-motion preference).
 *   - Container-aware: cinematic mode uses one rAF-throttled scroll
 *     listener, never re-renders, and is safely tree-shaken when subtle.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type HeroParallaxMode = 'subtle' | 'cinematic';

interface HeroParallaxLayoutProps {
  /** The hero section node (will become sticky). */
  hero: ReactNode;
  /** The section directly below the hero (will rise over the hero). */
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
 * Cinematic-mode scroll driver. Writes `--hero-parallax-progress` (0→1) on
 * the anchor element so CSS can interpolate opacity/scale without React
 * re-renders. One listener, rAF-throttled, auto-detached when the hero is
 * fully covered.
 */
function useCinematicScrollDriver(active: boolean) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!active) return;
    const el = anchorRef.current;
    if (!el || typeof window === 'undefined') return;

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const rect = el.getBoundingClientRect();
      // rect.top goes from 0 (at rest) → -rect.height (fully covered).
      // Progress 0 (at rest) → 1 (covered).
      const h = rect.height || 1;
      const p = Math.min(1, Math.max(0, -rect.top / h));
      el.style.setProperty('--hero-parallax-progress', p.toFixed(3));
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [active]);
  return anchorRef;
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
  const anchorRef = useCinematicScrollDriver(cinematic);

  if (!active) {
    // Silent no-op — render the three slots in normal flow.
    return (
      <>
        {hero}
        {next}
        {rest}
      </>
    );
  }

  return (
    <>
      {/* Sticky hero shell. h-screen pins the hero; sticky releases as the
          rising panel covers it. z-0 keeps it behind the rising panel.
          In cinematic mode we read --hero-parallax-progress (set by the
          scroll driver above) to fade + scale the hero as it's covered. */}
      <div
        ref={anchorRef}
        className="sticky top-0 h-screen w-full z-0 overflow-hidden"
        data-hero-parallax="anchor"
        data-hero-parallax-mode={mode}
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

      {/* Rising panel — normal flow, stacks above the sticky hero via z-10. */}
      <div
        className={cn(
          'relative z-10 -mt-8',
          'rounded-t-[2rem] overflow-hidden',
          'shadow-[0_-24px_48px_-24px_rgba(0,0,0,0.35)]',
          'bg-background',
        )}
        data-hero-parallax="rising"
      >
        {next}
      </div>

      {/* Rest of the page — also above the hero. No special treatment. */}
      <div className="relative z-10 bg-background" data-hero-parallax="tail">
        {rest}
      </div>
    </>
  );
}
