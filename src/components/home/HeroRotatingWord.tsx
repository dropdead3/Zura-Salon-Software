/**
 * HeroRotatingWord — pure subcomponent owning the rotating headline word.
 *
 * 4th entry in the hero parity canon (after HeroNotes, HeroScrollIndicator,
 * HeroEyebrow). Pre-extraction the rotating-word AnimatePresence shipped in
 * three subtly different shapes across HeroSection (legacy), HeroSlideRotator
 * (current), and HeroSectionPreview (editor thumbnail) — exactly the
 * divergence pattern that allowed the May 2026 hero-notes alignment
 * regression and the (twice-now) "rotating words disappeared after a hero
 * refactor" bug. This component absorbs all three so a future hero variant
 * cannot drift.
 *
 * Visibility contract: the wrapper span (with the fixed `h-[1.15em]` height
 * that prevents headline reflow on each cycle) renders ONLY when there is at
 * least one non-empty word AND `show=true`. Otherwise the component returns
 * null — including no wrapper span — so the headline collapses cleanly.
 *
 * Caller owns the `wordIndex` because two surfaces (HeroSection + Rotator)
 * already coordinate index state with other animations (e.g. headline
 * delay-in). Centralising the interval here would force both to reimport
 * useEffect plumbing; passing the index in keeps the component a pure leaf.
 *
 * Gradient treatment: a luxe gradient is applied via bg-clip-text. The
 * gradient stops swap based on `isOverDark` so contrast stays correct
 * whether the headline is rendered over hero media (white-spectrum) or a
 * light theme background (foreground-spectrum). Operator color overrides
 * still win — when the parent passes a `style.color`, we skip the gradient
 * via the `colorOverride` prop so we never silently override the override.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HeroRotatingWordProps {
  /** Operator's `show_rotating_words` toggle. False short-circuits to null. */
  show: boolean;
  /** Pre-filtered list of non-empty words (caller filters whitespace). */
  words: string[];
  /** Active word index, owned by the caller. Clamped if out of bounds. */
  index: number;
  /**
   * True when the headline sits on dark media (auto-contrast = white text).
   * Drives gradient stop selection. Defaults to false (light theme).
   */
  isOverDark?: boolean;
  /**
   * Set to true when the parent applies an explicit color override
   * (operator-picked headline color). Suppresses the gradient so the
   * override wins.
   */
  colorOverride?: boolean;
}

export function HeroRotatingWord({ show, words, index, isOverDark = false, colorOverride = false }: HeroRotatingWordProps) {
  if (!show || words.length === 0) return null;
  const safeIndex = ((index % words.length) + words.length) % words.length;
  const word = words[safeIndex];
  if (!word) return null;

  // Contrast-aware DIAGONAL gradient (~135deg, top-left -> bottom-right) so
  // the sheen reads as raking light across the letters rather than a flat
  // left-to-right fade. Over dark media: bright white -> warm gold/cream.
  // Over light bg: foreground -> softened primary. Stops pin the base color
  // through ~45% then ease into the accent by 100%. NOTE: keep native
  // background-size; doubling it pushes the accent endpoint outside the
  // rendered glyph width and the word reads as pure white.
  const gradientClass = colorOverride
    ? ''
    : isOverDark
      ? 'bg-gradient-to-br from-white from-0% via-white via-45% to-[hsl(var(--primary)/0.95)] to-100% bg-clip-text text-transparent'
      : 'bg-gradient-to-br from-foreground from-0% via-foreground via-45% to-[hsl(var(--primary)/0.85)] to-100% bg-clip-text text-transparent';

  // Subtle grain overlay — breaks up the plasticky look of pure CSS gradients
  // and gives the sheen a brushed-metal feel. Rendered as a sibling absolute
  // span clipped to the word via mix-blend-overlay at low opacity. Hidden
  // when the operator overrides the headline color so we never silently
  // muddy a chosen brand color.
  const grainSvg =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

  return (
    <span data-hero-rotating-word className="block overflow-hidden h-[1.15em]">
      <AnimatePresence mode="wait">
        {/* eslint-disable-next-line no-restricted-syntax -- canonical owner of rotating-word JSX; every other hero file imports this component instead of hand-rolling motion.span. */}
        <motion.span
          key={word}
          className={cn('relative inline-block align-top', gradientClass)}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
          {!colorOverride && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.18]"
              style={{
                backgroundImage: grainSvg,
                backgroundSize: '160px 160px',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {word}
            </span>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
