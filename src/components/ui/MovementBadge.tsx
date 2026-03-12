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
  className?: string;
}

export function MovementBadge({ rating, compact = false, positiveOnly = false, className }: MovementBadgeProps) {
  if (positiveOnly && !['best_seller', 'popular'].includes(rating.tier)) return null;

  const Icon = TIER_ICONS[rating.tier] || Minus;

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
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs">
        {rating.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
