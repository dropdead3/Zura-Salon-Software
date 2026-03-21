import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SalesTrendIndicatorProps {
  current: number;
  previous: number;
  className?: string;
  showValue?: boolean;
}

export function SalesTrendIndicator({ 
  current, 
  previous, 
  className,
  showValue = true 
}: SalesTrendIndicatorProps) {
  if (previous === 0 && current === 0) {
    return null;
  }

  const percentChange = previous === 0 
    ? (current > 0 ? 100 : 0)
    : ((current - previous) / previous) * 100;
  
  const isPositive = percentChange > 0;
  const isNeutral = percentChange === 0;
  const absChange = Math.abs(percentChange);

  if (isNeutral) {
    return (
      <div className={cn('flex items-center gap-1 text-muted-foreground', className)}>
        <Minus className="w-3 h-3" />
        {showValue && <span className="text-xs">0%</span>}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-1',
      isPositive ? 'text-success-foreground' : 'text-destructive',
      className
    )}>
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {showValue && (
        <span className="text-xs font-medium">
          {isPositive ? '+' : '-')}{absChange.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
