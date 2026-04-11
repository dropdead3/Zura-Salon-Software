import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/format';
import { useZuraCapital, type ZuraCapitalOpportunity } from '@/hooks/useZuraCapital';
import { useLogCapitalEvent } from '@/hooks/useCapitalEventLog';
import { FundingOpportunityDetail } from './FundingOpportunityDetail';
import {
  OPPORTUNITY_TYPE_LABELS,
  FUNDING_STATUS_LABELS,
} from '@/config/capital-engine/zura-capital-config';
import { Landmark, ArrowRight, ShieldCheck } from 'lucide-react';
import type { OpportunityType } from '@/config/capital-engine/zura-capital-config';

function c(cents: number): number { return cents / 100; }

export function OwnerCapitalQueue() {
  const { opportunities, isLoading } = useZuraCapital();
  const logEvent = useLogCapitalEvent();
  const [selectedOpp, setSelectedOpp] = useState<ZuraCapitalOpportunity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleOpenDetail = (opp: ZuraCapitalOpportunity) => {
    setSelectedOpp(opp);
    setDetailOpen(true);
    logEvent.mutate({
      opportunityId: opp.id,
      eventType: 'opportunity_viewed',
      surfaceArea: 'capital_queue',
    });
  };

  if (isLoading) return null;

  if (opportunities.length === 0) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardContent className="py-12">
          <div className={tokens.empty.container}>
            <Landmark className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No Capital Opportunities</h3>
            <p className={tokens.empty.description}>
              When Zura identifies validated growth opportunities, they will appear here with funding options.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={tokens.card.wrapper}>
        <CardHeader className="flex flex-row items-start justify-between pb-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Capital Queue</CardTitle>
              <CardDescription className="font-sans text-sm">
                Ranked growth opportunities across the organization
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-sans">
            {opportunities.length} opportunit{opportunities.length === 1 ? 'y' : 'ies'}
          </Badge>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block space-y-1">
            <div className="grid grid-cols-[1fr_100px_100px_70px_70px_70px_90px_40px] gap-2 px-3 py-2 text-xs text-muted-foreground font-sans">
              <span>Opportunity</span>
              <span className="text-right">Investment</span>
              <span className="text-right">Expected Lift</span>
              <span className="text-right">ROE</span>
              <span className="text-right">Break-Even</span>
              <span className="text-right">Risk</span>
              <span className="text-right">Status</span>
              <span />
            </div>

            {opportunities.map((opp) => {
              const statusInfo = FUNDING_STATUS_LABELS[opp.eligibilityStatus] ?? {
                label: opp.eligibilityStatus,
                color: 'text-muted-foreground',
              };

              return (
                <div
                  key={opp.id}
                  className="grid grid-cols-[1fr_100px_100px_70px_70px_70px_90px_40px] gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer border border-transparent hover:border-border/40"
                  onClick={() => handleOpenDetail(opp)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-sm truncate">{opp.title}</span>
                      {!opp.zuraEligible && (
                        <ShieldCheck className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-sans">
                      {OPPORTUNITY_TYPE_LABELS[opp.opportunityType as OpportunityType] ?? opp.opportunityType}
                    </span>
                  </div>
                  <span className="font-sans text-sm text-right">
                    {formatCurrency(c(opp.investmentCents), { noCents: true })}
                  </span>
                  <span className="font-sans text-sm text-right">
                    +{formatCurrency(c(opp.predictedLiftExpectedCents), { noCents: true })}
                  </span>
                  <span className={`font-display text-sm text-right tracking-wide ${opp.roe >= 1.8 ? 'text-primary' : ''}`}>
                    {opp.roe.toFixed(1)}x
                  </span>
                  <span className="font-sans text-sm text-right">
                    {opp.breakEvenMonthsExpected}mo
                  </span>
                  <span className="font-sans text-xs text-right capitalize text-muted-foreground">
                    {opp.riskLevel}
                  </span>
                  <div className="flex justify-end">
                    <Badge variant="outline" className={`text-[10px] font-sans ${statusInfo.color}`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-2">
            {opportunities.map((opp) => {
              const statusInfo = FUNDING_STATUS_LABELS[opp.eligibilityStatus] ?? {
                label: opp.eligibilityStatus,
                color: 'text-muted-foreground',
              };

              return (
                <div
                  key={opp.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-2 cursor-pointer"
                  onClick={() => handleOpenDetail(opp)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-sm truncate">{opp.title}</span>
                    <Badge variant="outline" className={`text-[10px] font-sans ${statusInfo.color}`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-sans">
                    <span>{formatCurrency(c(opp.investmentCents), { noCents: true })}</span>
                    <span>+{formatCurrency(c(opp.predictedLiftExpectedCents), { noCents: true })}</span>
                    <span className={opp.roe >= 1.8 ? 'text-primary font-display tracking-wide' : 'font-display tracking-wide'}>
                      {opp.roe.toFixed(1)}x
                    </span>
                    <span>{opp.breakEvenMonthsExpected}mo</span>
                  </div>
                </div>
              );
            })}
          </div>
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
