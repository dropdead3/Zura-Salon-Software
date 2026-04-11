/**
 * SEO Campaign Prediction block.
 * Shows predicted revenue lift for a specific campaign with progress and remaining impact.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useSEOCampaignPrediction } from '@/hooks/useSEORevenuePrediction';
import { computeRemainingLift, type ConfidenceLevel } from '@/lib/seo-engine/seo-revenue-predictor';
import { Info, TrendingUp } from 'lucide-react';

interface Props {
  organizationId: string;
  campaignId: string;
}

const CONFIDENCE_STYLES: Record<ConfidenceLevel, { label: string; className: string }> = {
  high: { label: 'High confidence', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  medium: { label: 'Medium confidence', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  low: { label: 'Low confidence', className: 'bg-muted text-muted-foreground' },
};

function fmt(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

export function SEOCampaignPrediction({ organizationId, campaignId }: Props) {
  const { data, isLoading } = useSEOCampaignPrediction(organizationId, campaignId);

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data || data.pendingCount === 0) return null;

  const { prediction, completedCount, totalCount } = data;
  const remaining = computeRemainingLift(prediction, completedCount, totalCount);
  const conf = CONFIDENCE_STYLES[prediction.confidence];

  return (
    <TooltipProvider>
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs font-display tracking-wide text-green-700">Expected Lift (30d)</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={`text-[10px] font-sans ${conf.className}`}>
                {conf.label}
              </Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs text-xs font-sans">
                  {prediction.confidenceReason}. Actual results may vary based on seasonality and execution quality.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 text-lg font-display tracking-wide">
            <span className="text-green-600">+{fmt(prediction.revenueLift.low)}</span>
            <span className="text-muted-foreground text-xs">→</span>
            <span className="text-green-600 text-xl">{fmt(prediction.revenueLift.expected)}</span>
            <span className="text-muted-foreground text-xs">→</span>
            <span className="text-green-600">{fmt(prediction.revenueLift.high)}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-sans text-muted-foreground">
            <span>
              Progress: {completedCount}/{totalCount} actions complete
            </span>
            {completedCount > 0 && (
              <span>
                Remaining: +{fmt(remaining.expected)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
