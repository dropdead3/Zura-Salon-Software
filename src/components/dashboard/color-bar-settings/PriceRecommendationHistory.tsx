/**
 * PriceRecommendationHistory — Collapsible audit log with revert capability.
 */
import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, ChevronDown, Undo2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { usePriceRecommendationHistory, useRevertPriceRecommendation } from '@/hooks/color-bar/useServicePriceRecommendations';
import { format, differenceInHours } from 'date-fns';

export function PriceRecommendationHistory() {
  const { data: history, isLoading } = usePriceRecommendationHistory(20);
  const revertMutation = useRevertPriceRecommendation();
  const [open, setOpen] = React.useState(false);

  if (isLoading || !history?.length) return null;

  const now = new Date();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between h-10 px-4 font-sans text-sm text-muted-foreground hover:text-foreground">
          <span className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Recent Price Actions ({history.length})
          </span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 pt-2 px-1">
          {history.map((entry) => {
            const isAccepted = entry.status === 'accepted';
            const isReverted = entry.status === 'reverted';
            const hoursAgo = differenceInHours(now, new Date(entry.created_at));
            const canRevert = isAccepted && hoursAgo <= 24;

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-sans shrink-0',
                      isAccepted
                        ? 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800'
                        : isReverted
                        ? 'text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800'
                        : 'text-muted-foreground border-border'
                    )}
                  >
                    {isAccepted ? 'Accepted' : isReverted ? 'Reverted' : 'Dismissed'}
                  </Badge>
                  <div className="min-w-0">
                    <div className="text-sm font-sans text-foreground truncate">
                      <span className="font-medium">{entry.service_name || 'Unknown Service'}</span>
                      <span className="text-muted-foreground mx-1">·</span>
                      ${Number(entry.current_price).toFixed(2)} → ${Number(entry.recommended_price).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-sans">
                      Product cost: ${Number(entry.product_cost).toFixed(2)} · Target: {Number(entry.margin_pct_target).toFixed(0)}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {canRevert && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] font-sans text-muted-foreground hover:text-foreground gap-1"
                      onClick={() => revertMutation.mutate(entry.id)}
                      disabled={revertMutation.isPending}
                    >
                      <Undo2 className="w-3 h-3" />
                      Revert
                    </Button>
                  )}
                  <span className="text-[10px] text-muted-foreground font-sans">
                    {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}