import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSpatialState } from '@/lib/responsive/useSpatialState';
import type { SpatialState } from '@/lib/responsive/spatial-tokens';

interface SpatialRowProps {
  children: ReactNode;
  className?: string;
  /** Force stacked behavior even at wide widths (for very dense rows). */
  alwaysStackBelow?: number;
}

/**
 * SpatialRow — zone-aware horizontal row that runs phases 1–5.
 * - default: gap-4 (16px), flex-row
 * - compressed: gap-3 (12px), still flex-row
 * - compact: gap-2 (8px floor), flex-row, items may wrap
 * - stacked: flex-col, gap-2
 */
export function SpatialRow({ children, className, alwaysStackBelow }: SpatialRowProps) {
  const { ref, state, width } = useSpatialState<HTMLDivElement>('standard');

  const forceStack = alwaysStackBelow != null && width > 0 && width < alwaysStackBelow;
  const effective: SpatialState = forceStack ? 'stacked' : state;

  const layoutByState: Record<SpatialState, string> = {
    default: 'flex flex-row items-center gap-4',
    compressed: 'flex flex-row items-center gap-3',
    compact: 'flex flex-row flex-wrap items-center gap-2',
    stacked: 'flex flex-col items-stretch gap-2',
  };

  return (
    <div
      ref={ref}
      data-spatial-state={effective}
      className={cn(
        'transition-[gap] duration-200 ease-out',
        layoutByState[effective],
        className,
      )}
    >
      {children}
    </div>
  );
}
