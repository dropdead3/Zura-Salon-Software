import * as React from 'react';
import { cn } from '@/lib/utils';

interface PercentileIndicatorProps {
  percentile: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function PercentileIndicator({ 
  percentile, 
  size = 'md',
  showLabel = true,
  className 
}: PercentileIndicatorProps) {
  const barHeight = size === 'sm' ? 'h-2' : 'h-3';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  const getColor = () => {
    if (percentile >= 75) return 'bg-success-foreground';
    if (percentile >= 50) return 'bg-primary';
    if (percentile >= 25) return 'bg-warning-foreground';
    return 'bg-destructive';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <span className={cn(textSize, 'text-muted-foreground whitespace-nowrap'}>
          Top {100 - percentile}%
        </span>
      )}
      <div className={cn('flex-1 rounded-full overflow-hidden bg-muted', barHeight)}>
        <div 
          className={cn('h-full rounded-full transition-all', getColor())}
          style={{ width: `${percentile}%` }}
        />
      </div>
    </div>
  );
}
