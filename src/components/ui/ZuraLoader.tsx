import { useEffect, useState } from 'react';
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
  const [mounted, setMounted] = useState(false);
  const { cell, gap } = SIZES[size];

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={cn(
        'grid grid-cols-7 transition-opacity duration-200',
        gap,
        mounted ? 'opacity-100' : 'opacity-0',
        className,
      )}
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
            <span
              key={`${r}-${i}`}
              className={cn(
                cell,
                'border',
                isLit
                  ? 'bg-foreground/80 border-foreground/20 zura-shimmer'
                  : 'bg-transparent border-border/30',
              )}
              style={
                isLit
                  ? {
                      animationDuration: `${duration}s`,
                      animationDelay: `${delay}s`,
                    }
                  : undefined
              }
            />
          );
        }),
      )}
    </div>
  );
}
