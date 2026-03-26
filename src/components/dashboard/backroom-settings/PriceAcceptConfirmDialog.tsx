/**
 * PriceAcceptConfirmDialog — Confirmation dialog before applying price recommendations.
 */
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnrichedPriceRecommendation } from '@/hooks/backroom/useServicePriceRecommendations';

interface SingleProps {
  recommendation: EnrichedPriceRecommendation;
  onConfirm: () => void;
  children: React.ReactNode;
}

export function PriceAcceptConfirmDialog({ recommendation: rec, onConfirm, children }: SingleProps) {
  const isIncrease = rec.price_delta > 0;
  const affectedTiers = (rec.level_count || 0) + (rec.location_count || 0);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-base tracking-wide">
            Confirm Price Update
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 font-sans text-sm text-muted-foreground">
              <p>
                Update <span className="font-medium text-foreground">{rec.service_name}</span> pricing:
              </p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Current</div>
                  <div className="text-base font-medium text-foreground tabular-nums">${rec.current_price.toFixed(2)}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Recommended</div>
                  <div className="text-base font-medium text-primary tabular-nums">${rec.recommended_price.toFixed(2)}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[10px] text-muted-foreground">Change</div>
                  <div className={cn('text-sm font-medium tabular-nums', isIncrease ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
                    {isIncrease ? '+' : ''}{rec.price_delta_pct.toFixed(1)}%
                  </div>
                </div>
              </div>
              {affectedTiers > 0 && (
                <p className="text-xs">
                  This will also proportionally scale <span className="font-medium text-foreground">{rec.level_count || 0} level tier{(rec.level_count || 0) !== 1 ? 's' : ''}</span>
                  {(rec.location_count || 0) > 0 && (
                    <> and <span className="font-medium text-foreground">{rec.location_count} location price{rec.location_count !== 1 ? 's' : ''}</span></>
                  )}.
                </p>
              )}
              <p className="text-xs">
                Changes will be reflected on your website and booking wizard immediately.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm Update</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Bulk Accept Confirmation ────────────────────────────────
interface BulkProps {
  count: number;
  totalImpact: number;
  onConfirm: () => void;
  children: React.ReactNode;
}

export function BulkPriceAcceptConfirmDialog({ count, totalImpact, onConfirm, children }: BulkProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-base tracking-wide">
            Accept All Price Recommendations
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 font-sans text-sm text-muted-foreground">
              <p>
                This will update pricing for <span className="font-medium text-foreground">{count} service{count !== 1 ? 's' : ''}</span>,
                including all associated level tiers and location prices.
              </p>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-[10px] text-muted-foreground">Total Price Impact</div>
                <div className="text-lg font-medium text-foreground tabular-nums">
                  {totalImpact >= 0 ? '+' : ''}${totalImpact.toFixed(2)}
                </div>
              </div>
              <p className="text-xs">
                Changes will be reflected on your website and booking wizard immediately.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm All Updates</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
