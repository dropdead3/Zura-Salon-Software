import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { MovementRating } from '@/lib/productMovementRating';
import { Flame, TrendingUp, Minus, TrendingDown, AlertTriangle, XCircle } from 'lucide-react';

const TIER_ICONS: Record<string, typeof Flame> = {
  best_seller: Flame,
  popular: TrendingUp,
  steady: Minus,
  slow_mover: TrendingDown,
  stagnant: AlertTriangle,
  dead_weight: XCircle,
};

interface MovementBadgeProps {
  rating: MovementRating;
  /** Compact mode for table cells */
  compact?: boolean;
  /** Show only positive tiers (for public shop) */
  positiveOnly?: boolean;
  /** Velocity trend change percentage (e.g., +25 or -15). Shows arrow when provided. */
  velocityChange?: number | null;
  className?: string;
}

function TrendIndicator({ change }: { change: number }) {
  if (Math.abs(change) < 5) return null; // Ignore noise
  const isUp = change > 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[9px] tabular-nums font-medium ml-0.5',
      isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
    )}>
      {isUp ? '↑' : '↓'}{Math.abs(Math.round(change))}%
    </span>
  );
}

export function MovementBadge({ rating, compact = false, positiveOnly = false, velocityChange, className }: MovementBadgeProps) {
  if (positiveOnly && !['best_seller', 'popular'].includes(rating.tier)) return null;

  const Icon = TIER_ICONS[rating.tier] || Minus;

  const tooltipText = velocityChange != null && Math.abs(velocityChange) >= 5
    ? `${rating.tooltip} · ${velocityChange > 0 ? '+' : ''}${Math.round(velocityChange)}% vs prior 90 days`
    : rating.tooltip;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'gap-1 border',
            rating.colorClass,
            rating.borderClass,
            rating.bgClass,
            compact ? 'text-[10px] px-1.5 py-0 h-5' : 'text-xs px-2 py-0.5',
            className,
          )}
        >
          <Icon className={cn(compact ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
          {rating.label}
          {velocityChange != null && <TrendIndicator change={velocityChange} />}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
