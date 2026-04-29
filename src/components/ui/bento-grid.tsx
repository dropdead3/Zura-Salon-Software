import React from 'react';
import { cn } from '@/lib/utils';

interface BentoGridProps {
  children: React.ReactNode;
  maxPerRow?: number;
  gap?: string;
  className?: string;
}

export function BentoGrid({ children, maxPerRow = 3, gap = 'gap-3', className }: BentoGridProps) {
  const items = React.Children.toArray(children);
  const count = items.length;

  if (count === 0) return null;

  // Single row if fits
  if (count <= maxPerRow) {
    return (
      <div className={cn('flex flex-col sm:flex-row items-stretch', gap, className)}>
        {items.map((child, i) => (
          <div key={i} className="flex-1 min-w-0 flex">{child}</div>
        ))}
      </div>
    );
  }

  // Multi-row: distribute items evenly across rows
  const rowCount = Math.ceil(count / maxPerRow);
  const basePerRow = Math.floor(count / rowCount);
  const extraRows = count % rowCount;

  // Build rows: first `extraRows` rows get basePerRow+1, rest get basePerRow
  const rows: React.ReactNode[][] = [];
  let cursor = 0;
  for (let r = 0; r < rowCount; r++) {
    const rowSize = r < extraRows ? basePerRow + 1 : basePerRow;
    rows.push(items.slice(cursor, cursor + rowSize));
    cursor += rowSize;
  }

  return (
    <div className={cn('flex flex-col', gap, className)}>
      {rows.map((row, ri) => (
        <div key={ri} className={cn('flex flex-col sm:flex-row', gap)}>
          {row.map((child, ci) => (
            <div key={ci} className="flex-1 min-w-0">{child}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
