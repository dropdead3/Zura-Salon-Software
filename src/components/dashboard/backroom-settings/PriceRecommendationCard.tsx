/**
 * PriceRecommendationCard — Compact inline card shown in service drill-downs
 * when a price recommendation is available.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { PriceRecommendation } from '@/lib/backroom/price-recommendation';

interface Props {
  recommendation: PriceRecommendation;
  onAccept: () => void;
  onDismiss: () => void;
  isAccepting?: boolean;
}

export function PriceRecommendationCard({ recommendation: rec, onAccept, onDismiss, isAccepting }: Props) {
  const isIncrease = rec.price_delta > 0;

  return (
    <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        {isIncrease ? (
          <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        )}
        <span className={cn(tokens.label.tiny, 'text-amber-700 dark:text-amber-300')}>
          Price below target margin
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm font-sans">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">Current</div>
          <div className="font-medium text-foreground">${rec.current_price.toFixed(2)}</div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">Recommended</div>
          <div className="font-medium text-primary">${rec.recommended_price.toFixed(2)}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] text-muted-foreground">Delta</div>
          <div className={cn('text-xs font-medium', isIncrease ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
            {isIncrease ? '+' : ''}{rec.price_delta_pct.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-sans">
        <span>Product cost: ${rec.product_cost.toFixed(2)}</span>
        <span>Current margin: {rec.current_margin_pct.toFixed(1)}%</span>
        <span>Target: {rec.target_margin_pct}%</span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs" onClick={onAccept} disabled={isAccepting}>
          {isAccepting ? 'Applying…' : 'Accept'}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
