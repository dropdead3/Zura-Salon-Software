import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/format';
import { getROELabel, EXPANSION_TYPE_LABELS } from '@/config/capital-engine/capital-config';
import { isFinancingEligible } from '@/lib/capital-engine/financing-engine';
import { FinancingEligibilityBadge } from './FinancingEligibilityBadge';
import { FundThisDialog } from './FundThisDialog';
import { TrendingUp, Banknote } from 'lucide-react';
import type { QueuedOpportunity } from '@/lib/capital-engine/capital-engine';

interface Props {
  queue: QueuedOpportunity[];
}

function getConfidenceVariant(c: string) {
  if (c === 'high') return 'default';
  if (c === 'medium') return 'secondary';
  return 'outline';
}

export function CapitalPriorityQueue({ queue }: Props) {
  const [fundingTarget, setFundingTarget] = useState<QueuedOpportunity | null>(null);

  if (!queue.length) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className={tokens.card.title}>Capital Priority Queue</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className={tokens.empty.container}>
            <TrendingUp className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No opportunities yet</h3>
            <p className={tokens.empty.description}>
              Create expansion opportunities to see them ranked by ROE.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={tokens.card.wrapper}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className={tokens.card.title}>Capital Priority Queue</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue.map((opp, idx) => {
            const eligible = isFinancingEligible({
              roe: opp.roe,
              confidence: opp.confidence,
              riskLevel: opp.riskLevel,
              capitalRequired: opp.capitalRequired,
            }).eligible;

            return (
              <div
                key={opp.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border/40"
              >
                <span className="font-display text-lg tracking-wide text-muted-foreground w-6 text-center">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm truncate">{opp.title}</p>
                  <p className="text-xs text-muted-foreground font-sans">
                    {EXPANSION_TYPE_LABELS[opp.opportunityType]?.label ?? opp.opportunityType}
                    {opp.city ? ` · ${opp.city}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-display text-base tracking-wide">
                    {opp.roe.toFixed(1)}x
                  </span>
                  <span className="text-xs text-muted-foreground font-sans block">
                    {getROELabel(opp.roe)}
                  </span>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <span className="text-xs font-sans text-muted-foreground">
                    {formatCurrency(opp.capitalRequired, { noCents: true })} →{' '}
                    {formatCurrency(opp.predictedAnnualLift, { noCents: true })}
                  </span>
                  <span className="text-xs text-muted-foreground font-sans block">
                    {opp.breakEvenMonths}mo payback
                  </span>
                </div>
                <Badge variant={getConfidenceVariant(opp.confidence)} className="text-xs capitalize shrink-0">
                  {opp.confidence}
                </Badge>
                <FinancingEligibilityBadge
                  candidate={{
                    roe: opp.roe,
                    confidence: opp.confidence,
                    riskLevel: opp.riskLevel,
                    capitalRequired: opp.capitalRequired,
                  }}
                />
                {eligible && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1 shrink-0 font-sans"
                    onClick={() => setFundingTarget(opp)}
                  >
                    <Banknote className="w-3 h-3" />
                    Fund This
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {fundingTarget && (
        <FundThisDialog
          opportunity={fundingTarget}
          open={!!fundingTarget}
          onOpenChange={(open) => !open && setFundingTarget(null)}
        />
      )}
    </>
  );
}
