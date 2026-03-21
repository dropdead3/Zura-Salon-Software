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

const CONFIDENCE_STYLES = {
  high: 'border-green-500/30 text-green-600 bg-green-500/5',
  medium: 'border-yellow-500/30 text-yellow-600 bg-yellow-500/5',
  low: 'border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground-muted))]',
};

interface WeeklyLeverBriefProps {
  recommendation: LeverRecommendation;
}

export function WeeklyLeverBrief({ recommendation }: WeeklyLeverBriefProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const isPending = recommendation.status === 'pending';
  const whyNow = Array.isArray(recommendation.why_now) ? recommendation.why_now : [];

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge
              variant="outline"
              className={cn('text-xs capitalize', CONFIDENCE_STYLES[recommendation.confidence])}
            >
              {recommendation.confidence} confidence
            </Badge>
            <CardTitle className="text-xl font-medium tracking-tight">
              {recommendation.title}
            </CardTitle>
          </div>
          {recommendation.estimated_monthly_impact && (
            <div className="flex items-center gap-1.5 rounded-xl bg-green-500/10 px-3 py-1.5 text-green-600">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">
                +{formatCurrencyWhole(recommendation.estimated_monthly_impact)}/mo
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* What to do */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]">
            What to do
          </p>
          <p className="text-sm text-[hsl(var(--platform-foreground))]">
            {recommendation.what_to_do}
          </p>
        </div>

        {/* Why now */}
        {whyNow.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]">
              Why now
            </p>
            <ul className="space-y-1.5">
              {whyNow.map((driver, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[hsl(var(--platform-foreground))]">
                  <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--platform-accent))]" />
                  <span>{String(driver)}</span>
                </li>
              ))}
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
            {detailOpen ? 'Hide reasoning' : 'Show reasoning & evidence'}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <LeverDetailPanel recommendation={recommendation} />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
