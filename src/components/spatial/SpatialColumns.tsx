import { Children, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSpatialState } from '@/lib/responsive/useSpatialState';
import { SPATIAL_BREAKPOINTS } from '@/lib/responsive/spatial-tokens';

interface SpatialColumnsProps {
  children: ReactNode;
  className?: string;
  /** Min readable width per column in px. Default 160px (doctrine §4). */
  minColumnWidth?: number;
}

/**
 * SpatialColumns — measured column layout.
 *  ≥560px → 3-col (or N-col)
 *  ≥360px → 2-col (extras wrap into a hybrid 2+1 row)
 *  <360px → stacked
 *
 * Uses CSS grid with auto-fit + minmax for healthy width preservation.
 */
export function SpatialColumns({
  children,
  className,
  minColumnWidth = 160,
}: SpatialColumnsProps) {
  const { ref, width, state } = useSpatialState<HTMLDivElement>('standard');
  const childCount = Children.count(children);

  let columns = 1;
  if (width >= SPATIAL_BREAKPOINTS.threeColumn && childCount >= 3) {
    columns = Math.min(childCount, 3);
  } else if (width >= SPATIAL_BREAKPOINTS.twoColumn && childCount >= 2) {
    columns = 2;
  }

  // Gap shrinks under pressure but never below 8px floor
  const gapByState = state === 'compact' || state === 'stacked' ? 'gap-2' : state === 'compressed' ? 'gap-3' : 'gap-4';

  return (
    <div
      ref={ref}
      data-spatial-state={state}
      data-columns={columns}
      className={cn(
        'grid transition-[gap] duration-200 ease-out',
        gapByState,
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(${minColumnWidth}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}
