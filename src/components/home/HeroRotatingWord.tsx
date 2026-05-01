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
 */
import { motion, AnimatePresence } from 'framer-motion';

interface HeroRotatingWordProps {
  /** Operator's `show_rotating_words` toggle. False short-circuits to null. */
  show: boolean;
  /** Pre-filtered list of non-empty words (caller filters whitespace). */
  words: string[];
  /** Active word index, owned by the caller. Clamped if out of bounds. */
  index: number;
}

export function HeroRotatingWord({ show, words, index }: HeroRotatingWordProps) {
  if (!show || words.length === 0) return null;
  const safeIndex = ((index % words.length) + words.length) % words.length;
  const word = words[safeIndex];
  if (!word) return null;

  return (
    <span data-hero-rotating-word className="block overflow-hidden h-[1.15em]">
      <AnimatePresence mode="wait">
        {/* eslint-disable-next-line no-restricted-syntax -- canonical owner of rotating-word JSX; every other hero file imports this component instead of hand-rolling motion.span. */}
        <motion.span
          key={word}
          className="block"
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
