// Lint fixture: must trigger the hero scroll-indicator parity selector.
// Inline <motion.button> JSX is forbidden in hero files — the canonical
// owner is <HeroScrollIndicator /> from @/components/home/HeroScrollIndicator.
//
// This file is intentionally violating the rule. It is excluded from
// `npm run lint` via the top-level `ignores` entry; the smoke test
// `src/test/lint-rule-hero-scroll-indicator.test.ts` lints it explicitly
// with `ignore: false`.
//
// Filename matches the `hero-scroll-indicator-*.tsx` glob in the hero
// block's `files` array — DO NOT rename without updating eslint.config.js.
import { motion } from 'framer-motion';

export function HeroVariantBanned() {
  return (
    <div>
      <motion.button type="button" aria-label="Scroll down">
        Scroll
      </motion.button>
    </div>
  );
}
