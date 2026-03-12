import { differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useClientProductAffinity } from '@/hooks/useClientProductAffinity';
import { cn } from '@/lib/utils';

interface ClientAffinityBadgesProps {
  phorestClientId: string | null | undefined;
  className?: string;
  compact?: boolean;
}

export function ClientAffinityBadges({ phorestClientId, className, compact = false }: ClientAffinityBadgesProps) {
  const { data: affinities, isLoading } = useClientProductAffinity(phorestClientId);

  if (isLoading || !affinities || affinities.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {!compact && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShoppingBag className="w-3 h-3" />
          <span className="font-sans">Frequently Purchased</span>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {affinities.map((a) => {
          const daysAgo = a.lastPurchaseDate
            ? differenceInDays(new Date(), new Date(a.lastPurchaseDate))
            : null;
          const recencyLabel = daysAgo !== null
            ? daysAgo === 0 ? 'today'
            : daysAgo === 1 ? 'yesterday'
            : `${daysAgo}d ago`
            : '';

          return (
            <Tooltip key={a.itemName}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-xs cursor-default border-border/60 bg-muted/40 hover:bg-muted/60"
                >
                  {a.itemName}
                  <span className="ml-1 text-muted-foreground">×{a.purchaseCount}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Purchased {a.purchaseCount} time{a.purchaseCount !== 1 ? 's' : ''}
                {recencyLabel && ` · Last: ${recencyLabel}`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
