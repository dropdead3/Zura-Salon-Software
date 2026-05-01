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

  // Contrast-aware gradient. Over dark media: bright white -> warm gold/cream
  // for a luxe shimmer that still reads as "light text". Over light bg:
  // foreground -> primary so it stays high-contrast against cream/light themes.
  // Lengthened gradient: pin pure base color through ~50%, then ease into a
  // softened gold (primary lightened ~18%) so the shimmer reads as luxe
  // rather than saturated.
  const gradientClass = colorOverride
    ? ''
    : isOverDark
      ? 'bg-gradient-to-r from-white from-10% via-white via-55% to-[hsl(var(--primary)/0.85)] to-100% bg-clip-text text-transparent [background-size:200%_100%]'
      : 'bg-gradient-to-r from-foreground from-10% via-foreground via-55% to-[hsl(var(--primary)/0.75)] to-100% bg-clip-text text-transparent [background-size:200%_100%]';

  return (
    <span data-hero-rotating-word className="block overflow-hidden h-[1.15em]">
      <AnimatePresence mode="wait">
        {/* eslint-disable-next-line no-restricted-syntax -- canonical owner of rotating-word JSX; every other hero file imports this component instead of hand-rolling motion.span. */}
        <motion.span
          key={word}
          className={cn('block', gradientClass)}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
