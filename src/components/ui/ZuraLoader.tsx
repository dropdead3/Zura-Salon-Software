import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Deterministic pseudo-random based on cell index
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const SIZES = {
  sm: { cell: 'h-2 w-2 rounded-[2px]', gap: 'gap-0.5' },
  md: { cell: 'h-2.5 w-2.5 rounded-[3px]', gap: 'gap-0.5' },
  lg: { cell: 'h-3.5 w-3.5 rounded-[4px]', gap: 'gap-1' },
} as const;

const Z_GRID = [
  '1111111',
  '0000011',
  '0000110',
  '0001100',
  '0011000',
  '0110000',
  '1111111',
];

interface ZuraLoaderProps {
  size?: keyof typeof SIZES;
  className?: string;
}

export function ZuraLoader({ size = 'md', className }: ZuraLoaderProps) {
  const reduceMotion = useReducedMotion();
  const { cell, gap } = SIZES[size];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={reduceMotion ? undefined : { opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn('grid grid-cols-7', gap, className)}
      role="status"
      aria-label="Loading"
    >
      {Z_GRID.flatMap((row, r) =>
        row.split('').map((c, i) => {
          const idx = r * 7 + i;
          const isLit = c === '1';
          const duration = 1.5 + seededRandom(idx) * 2;
          const delay = seededRandom(idx + 100) * 2;

          return (
            <motion.span
              key={`${r}-${i}`}
              className={cn(
                cell,
                'border',
                isLit
                  ? 'bg-foreground/90 border-foreground/15'
                  : 'bg-transparent border-border/40'
              )}
              animate={
                reduceMotion || !isLit
                  ? undefined
                  : {
                      opacity: [0.3, 1, 0.5, 1, 0.3],
                      scale: [1, 1.1, 1, 1.05, 1],
                      boxShadow: [
                        '0 0 0px rgba(255,255,255,0)',
                        '0 0 8px rgba(255,255,255,0.4)',
                        '0 0 2px rgba(255,255,255,0.1)',
                        '0 0 6px rgba(255,255,255,0.3)',
                        '0 0 0px rgba(255,255,255,0)',
                      ],
                    }
              }
              transition={
                reduceMotion || !isLit
                  ? undefined
                  : { duration, repeat: Infinity, delay, ease: 'easeInOut' }
              }
            />
          );
        })
      )}
    </motion.div>
  );
}
