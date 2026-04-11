import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/format';
import { useZuraCapital, type ZuraCapitalOpportunity } from '@/hooks/useZuraCapital';
import { useLogCapitalEvent } from '@/hooks/useCapitalEventLog';
import { computeCoverageRatio } from '@/lib/capital-engine/zura-eligibility-engine';
import { CONSTRAINT_LABELS, OPPORTUNITY_TYPE_LABELS } from '@/config/capital-engine/zura-capital-config';
import { Landmark, TrendingUp, ArrowRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { FundingOpportunityDetail } from './FundingOpportunityDetail';
import type { ConstraintType, OpportunityType } from '@/config/capital-engine/zura-capital-config';

export function ZuraCapitalCard() {
  const { topOpportunity, eligibleOpportunities, isLoading } = useZuraCapital();
  const logEvent = useLogCapitalEvent();
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<ZuraCapitalOpportunity | null>(null);

  // Log surfacing event once per opportunity (deduplicated via ref)
  const surfacedRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (topOpportunity && surfacedRef.current !== topOpportunity.id) {
      surfacedRef.current = topOpportunity.id;
      logEvent.mutate({
        opportunityId: topOpportunity.id,
        eventType: 'surfaced',
        surfaceArea: 'command_center',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topOpportunity?.id]);

  if (isLoading || !topOpportunity) {
    return null;
  }

  const coverage = computeCoverageRatio(
    topOpportunity.capitalRequired,
    topOpportunity.stripeOfferAmount,
  );

  const handleOpenDetail = (opp: ZuraCapitalOpportunity) => {
    setSelectedOpp(opp);
    setDetailOpen(true);
    logEvent.mutate({
      opportunityId: opp.id,
      eventType: 'viewed',
      surfaceArea: 'command_center',
    });
  };

  return (
    <>
      <Card className={`${tokens.card.wrapper} border-primary/20`}>
        <CardHeader className="flex flex-row items-start justify-between pb-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Zura Capital</CardTitle>
              <CardDescription className="font-sans text-sm">
                Top growth opportunity
              </CardDescription>
            </div>
          </div>
          {eligibleOpportunities.length > 1 && (
            <Badge variant="outline" className="text-xs font-sans">
              +{eligibleOpportunities.length - 1} more
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Top Opportunity */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-display text-base tracking-wide">{topOpportunity.title}</span>
                {topOpportunity.city && (
                  <span className="text-xs text-muted-foreground font-sans block">{topOpportunity.city}</span>
                )}
                {topOpportunity.constraintType && (
                  <Badge variant="outline" className="text-[10px] font-sans mt-1">
                    {CONSTRAINT_LABELS[topOpportunity.constraintType as ConstraintType] ?? topOpportunity.constraintType}
                  </Badge>
                )}
              </div>
              <Badge variant="outline" className="text-[10px] font-sans shrink-0">
                {OPPORTUNITY_TYPE_LABELS[topOpportunity.opportunityType as OpportunityType] ?? topOpportunity.opportunityType}
              </Badge>
            </div>

            {topOpportunity.summary && (
              <p className="text-xs text-muted-foreground font-sans">{topOpportunity.summary}</p>
            )}

            {/* Metrics Row */}
            <div className="flex items-center gap-4 pt-1">
              <div className="text-center">
                <span className="font-display text-lg tracking-wide text-primary">
                  {topOpportunity.roe.toFixed(1)}x
                </span>
                <span className="text-[10px] text-muted-foreground font-sans block">ROE</span>
              </div>
              <div className="text-center">
                <span className="font-display text-sm tracking-wide">
                  {formatCurrency(topOpportunity.capitalRequired, { noCents: true })}
                </span>
                <span className="text-[10px] text-muted-foreground font-sans block">Investment</span>
              </div>
              <div className="text-center">
                <span className="font-display text-sm tracking-wide">
                  +{formatCurrency(topOpportunity.predictedAnnualLift, { noCents: true })}
                </span>
                <span className="text-[10px] text-muted-foreground font-sans block">Expected Lift</span>
              </div>
              <div className="text-center">
                <span className="font-display text-sm tracking-wide">
                  {topOpportunity.breakEvenMonths}mo
                </span>
                <span className="text-[10px] text-muted-foreground font-sans block">Break-Even</span>
              </div>
            </div>

            {/* Funding Availability */}
            {topOpportunity.stripeOfferAvailable && topOpportunity.stripeOfferAmount && (
              <div className="flex items-center gap-2 text-xs font-sans text-muted-foreground pt-1">
                <TrendingUp className="w-3 h-3 text-primary" />
                <span>
                  Funding available: {formatCurrency(topOpportunity.stripeOfferAmount, { noCents: true })}
                  {!coverage.covered && (
                    <span className="text-muted-foreground/60"> ({coverage.label} coverage)</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* CTA */}
          <Button
            onClick={() => handleOpenDetail(topOpportunity)}
            className={`${tokens.button.cardAction} font-sans`}
            size="sm"
          >
            {topOpportunity.recommendedActionLabel}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {selectedOpp && (
        <FundingOpportunityDetail
          opportunity={selectedOpp}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
    </>
  );
}
