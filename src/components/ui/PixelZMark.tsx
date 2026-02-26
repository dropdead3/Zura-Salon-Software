import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Deterministic pseudo-random based on cell index
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export function PixelZMark({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const cells = [
    '1111111',
    '0000011',
    '0000110',
    '0001100',
    '0011000',
    '0110000',
    '1111111',
  ];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className={cn('grid grid-cols-7 gap-1.5', className)}
      aria-hidden="true"
    >
      {cells.flatMap((row, r) =>
        row.split('').map((c, i) => {
          const idx = r * 7 + i;
          const isLit = c === '1';
          const duration = 1.5 + seededRandom(idx) * 2;
          const delay = seededRandom(idx + 100) * 2;

          return (
            <motion.span
              key={`${r}-${i}`}
              className={cn(
                'h-3.5 w-3.5 rounded-[4px] border',
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
