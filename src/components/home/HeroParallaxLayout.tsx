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
 * Doctrine alignment:
 *   - Preview-Live Parity: this single primitive is rendered identically
 *     in the public site and the editor's view-mode preview.
 *   - Visibility contract: silently no-ops when prerequisites aren't met
 *     (no hero in slot 0, only one section, reduced-motion preference).
 *   - No hooks beyond `useEffect` for reduced-motion subscription — the
 *     layout itself is a pure render so test fixtures don't need a router
 *     or query client.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HeroParallaxLayoutProps {
  /** The hero section node (will become sticky). */
  hero: ReactNode;
  /** The section directly below the hero (will rise over the hero). */
  next: ReactNode;
  /** Everything after the rising section — flows normally. */
  rest: ReactNode;
  /** Operator toggle. When false, renders the three slots flat (no parallax). */
  enabled: boolean;
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

export function HeroParallaxLayout({ hero, next, rest, enabled }: HeroParallaxLayoutProps) {
  const reducedMotion = usePrefersReducedMotion();
  const active = enabled && !reducedMotion;

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
      {/* Sticky hero shell. h-screen pins the hero to the viewport; sticky
          releases as soon as the parent's scroll position exceeds the
          hero's height (i.e. when the rising panel below has fully
          covered it). z-0 keeps it behind the rising panel. */}
      <div
        className="sticky top-0 h-screen w-full z-0 overflow-hidden"
        data-hero-parallax="anchor"
      >
        {hero}
      </div>

      {/* Rising panel — normal flow but stacks above the sticky hero via
          z-10. The negative top margin pulls the panel up under the hero
          so the SEAM isn't visible at rest; rounded top corners + soft
          shadow draw the reveal edge as the panel scrolls into view. */}
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
