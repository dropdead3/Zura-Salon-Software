/**
 * HeroScrollIndicator — bottom-of-hero affordance that hints there's more
 * below the fold. Pure subcomponent (no hooks beyond framer-motion's own,
 * no router, no DB) so the live hero AND the editor preview render it
 * identically.
 *
 * Visibility: gated on `show` (operator's `show_scroll_indicator` toggle).
 * Color: when the hero has a media background we render in white-ish to stay
 * visible against the scrim; otherwise muted-foreground against light themes.
 */
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroScrollIndicatorProps {
  show: boolean;
  text?: string;
  /** True when the hero sits over an image/video — switches to white-ish. */
  onMedia: boolean;
  onClick?: () => void;
}

export function HeroScrollIndicator({ show, text, onMedia, onClick }: HeroScrollIndicatorProps) {
  if (!show) return null;
  const label = (text ?? 'Scroll').trim() || 'Scroll';

  return (
    // eslint-disable-next-line no-restricted-syntax -- canonical owner of the hero scroll affordance; every other hero file imports this component instead of hand-rolling motion.button.
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={cn(
        'absolute bottom-8 inset-x-0 mx-auto w-fit flex flex-col items-center gap-2',
        'cursor-pointer z-20 transition-colors',
        onMedia
          ? 'text-white/80 hover:text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]'
          : 'text-foreground/70 hover:text-foreground',
      )}
      aria-label={`${label} — scroll down`}
    >
      <span className="text-xs uppercase tracking-normal md:tracking-[0.2em] font-display">
        {label}
      </span>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown size={20} />
      </motion.div>
    </motion.button>
  );
}
