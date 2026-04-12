/**
 * SEO Predicted Lift Card.
 * Shows top objects by predicted revenue opportunity with confidence bands.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useSEORevenuePredictions } from '@/hooks/useSEORevenuePrediction';
import { MOMENTUM_DIRECTION_CONFIG } from '@/lib/seo-engine/seo-momentum-calculator';
import type { ConfidenceLevel } from '@/lib/seo-engine/seo-revenue-predictor';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { tokens } from '@/lib/design-tokens';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

interface Props {
  organizationId: string | undefined;
}

const CONFIDENCE_STYLES: Record<ConfidenceLevel, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  medium: { label: 'Medium', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
};

export function SEOPredictedLiftCard({ organizationId }: Props) {
  const { data: predictions = [], isLoading } = useSEORevenuePredictions(organizationId);
  const { formatCurrencyCompact } = useFormatCurrency();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className={tokens.card.title}>Revenue Opportunity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!predictions.length) return null;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={tokens.card.title}>Revenue Opportunity</CardTitle>
              <CardDescription>Predicted 30d incremental lift from pending actions</CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs font-sans">
                Predictions are deterministic estimates based on baseline bookings, task-type impact coefficients, health scores, and momentum. Actual results may vary based on seasonality and execution quality.
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {predictions.slice(0, 3).map((p) => {
              const conf = CONFIDENCE_STYLES[p.prediction.confidence];
              const dir = p.momentumScore >= 10 ? 'gaining' : p.momentumScore <= -10 ? 'losing' : 'holding';
              const MIcon = dir === 'gaining' ? TrendingUp : dir === 'losing' ? TrendingDown : Minus;
              const mConf = MOMENTUM_DIRECTION_CONFIG[dir];

              return (
                <div key={p.seoObjectId} className="rounded-lg border border-border/60 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-sans">
                      <span className="font-display text-xs tracking-wide">{p.objectLabel}</span>
                      <span className="text-muted-foreground"> ({p.locationLabel})</span>
                    </p>
                    <Badge variant="outline" className={`text-[10px] font-sans ${conf.className}`}>
                      {conf.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="text-muted-foreground">
                      Current: {p.currentRevenue > 0 ? <BlurredAmount>{formatCurrencyCompact(p.currentRevenue)}</BlurredAmount> : '—'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MIcon className={`w-3 h-3 ${mConf.color}`} />
                      <span className={mConf.color}>{mConf.label}</span>
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1 text-sm font-display tracking-wide">
                    <span className="text-green-600">
                      +<BlurredAmount>{formatCurrencyCompact(p.prediction.revenueLift.low)}</BlurredAmount>
                    </span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="text-green-600">
                      <BlurredAmount>{formatCurrencyCompact(p.prediction.revenueLift.expected)}</BlurredAmount>
                    </span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="text-green-600">
                      <BlurredAmount>{formatCurrencyCompact(p.prediction.revenueLift.high)}</BlurredAmount>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
