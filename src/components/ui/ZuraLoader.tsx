import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Deterministic pseudo-random based on cell index
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

/**
 * Size guidance:
 *   sm — inline / tiny indicators (rare; prefer Loader2 for inline)
 *   md — section / card loads (default for DashboardLoader)
 *   lg — full-page loads (route-level)
 *   xl — bootstrap / brand moments only
 */
const SIZES = {
  sm: { cell: 'h-1.5 w-1.5 rounded-[2px]', gap: 'gap-0.5' },
  md: { cell: 'h-2 w-2 rounded-[2px]', gap: 'gap-0.5' },
  lg: { cell: 'h-3 w-3 rounded-[3px]', gap: 'gap-0.5' },
  xl: { cell: 'h-[13px] w-[13px] rounded-[3px]', gap: 'gap-0.5' },
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
  platformColors?: boolean;
}

export function ZuraLoader({ size = 'md', className, platformColors = false }: ZuraLoaderProps) {
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
                  ? platformColors
                    ? 'bg-violet-400/80 border-violet-500/20 zura-shimmer'
                    : 'bg-foreground/80 border-foreground/20 zura-shimmer'
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
