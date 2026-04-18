import { useState } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, TrendingUp, DollarSign } from 'lucide-react';
import { DecisionActions } from './DecisionActions';
import { LeverDetailPanel } from './LeverDetailPanel';
import { type LeverRecommendation } from '@/hooks/useLeverRecommendations';
import { cn } from '@/lib/utils';
import { useSpatialState } from '@/lib/responsive/useSpatialState';
import { TruncatedText } from '@/components/spatial/TruncatedText';

const CONFIDENCE_STYLES = {
  high: 'border-green-500/30 text-green-600 bg-green-500/5',
  medium: 'border-yellow-500/30 text-yellow-600 bg-yellow-500/5',
  low: 'border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground-muted))]',
};

interface WeeklyLeverBriefProps {
  recommendation: LeverRecommendation;
}

/**
 * WeeklyLeverBrief — pilot of container-aware doctrine for header collision.
 *
 * Header zones:
 *   default/compressed: title left, impact badge right (two-column)
 *   compact/stacked: impact badge wraps below title (single-column)
 *
 * Body zones:
 *   compact: hides "Why now" decorative TrendingUp icon (P3)
 *   stacked: collapses Confidence + Status badges to a tight rail
 *
 * Doctrine: mem://style/container-aware-responsiveness.md
 */
export function WeeklyLeverBrief({ recommendation }: WeeklyLeverBriefProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const isPending = recommendation.status === 'pending';
  const whyNow = Array.isArray(recommendation.why_now) ? recommendation.why_now : [];

  const { ref, state } = useSpatialState<HTMLDivElement>('large');
  const isCompact = state === 'compact' || state === 'stacked';
  const isStacked = state === 'stacked';

  return (
    <Card ref={ref} data-spatial-state={state} className="rounded-2xl">
      <CardHeader className="pb-4">
        <div className={cn(
          'flex gap-3',
          isCompact ? 'flex-col items-stretch' : 'flex-row items-start justify-between',
        )}>
          <div className="space-y-2 min-w-0 flex-1">
            <Badge
              variant="outline"
              className={cn('text-xs capitalize', CONFIDENCE_STYLES[recommendation.confidence])}
            >
              {recommendation.confidence} confidence
            </Badge>
            <CardTitle className={cn(
              'font-medium tracking-tight',
              isStacked ? 'text-lg' : 'text-xl',
            )}>
              <TruncatedText kind="name" as="span" className="block">
                {recommendation.title}
              </TruncatedText>
            </CardTitle>
          </div>
          {recommendation.estimated_monthly_impact && (
            <div className={cn(
              'flex items-center gap-1.5 rounded-xl bg-green-500/10 px-3 py-1.5 text-green-600 shrink-0',
              isStacked && 'self-start',
            )}>
              <DollarSign className="h-4 w-4" />
              {/* numeric values never truncate per doctrine §6 */}
              <span className="text-sm font-medium whitespace-nowrap">
                +{formatCurrencyWhole(recommendation.estimated_monthly_impact)}/mo
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn('space-y-6', isCompact && 'space-y-4')}>
        {/* What to do */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]">
            What to do
          </p>
          <p className={cn(
            'text-sm text-[hsl(var(--platform-foreground))]',
            isCompact && 'line-clamp-3',
          )}>
            {recommendation.what_to_do}
          </p>
        </div>

        {/* Why now */}
        {whyNow.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]">
              Why now
            </p>
            <ul className={cn('space-y-1.5', isCompact && 'space-y-1')}>
              {whyNow.slice(0, isStacked ? 2 : undefined).map((driver, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[hsl(var(--platform-foreground))]">
                  {/* TrendingUp = decorative P3, hidden when compact */}
                  {!isCompact && (
                    <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--platform-accent))]" />
                  )}
                  <span className={cn('min-w-0', isCompact && 'line-clamp-2')}>{String(driver)}</span>
                </li>
              ))}
              {isStacked && whyNow.length > 2 && (
                <li className="text-xs text-[hsl(var(--platform-foreground-muted))] pl-0">
                  +{whyNow.length - 2} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Decision Actions */}
        {isPending && <DecisionActions recommendation={recommendation} />}

        {/* Status badge if already decided */}
        {!isPending && (
          <Badge variant="outline" className="capitalize">
            {recommendation.status}
            {recommendation.decided_at && ` — ${new Date(recommendation.decided_at).toLocaleDateString()}`}
          </Badge>
        )}

        {/* Expandable detail */}
        <Collapsible open={detailOpen} onOpenChange={setDetailOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-2 text-xs font-medium text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] transition-colors">
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', detailOpen && 'rotate-180')} />
            {detailOpen ? 'Hide reasoning' : isStacked ? 'Reasoning' : 'Show reasoning & evidence'}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <LeverDetailPanel recommendation={recommendation} />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
