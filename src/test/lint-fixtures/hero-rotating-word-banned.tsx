// Lint fixture: must trigger the hero rotating-word parity selector.
// Inline <motion.span> JSX is forbidden in hero files — the canonical owner
// is <HeroRotatingWord /> from @/components/home/HeroRotatingWord.

import { motion } from 'framer-motion';

export function HeroVariantBanned({ word }: { word: string }) {
  return (
    <span className="block overflow-hidden h-[1.15em]">
      <motion.span key={word} className="block">
        {word}
      </motion.span>
    </span>
  );
}
