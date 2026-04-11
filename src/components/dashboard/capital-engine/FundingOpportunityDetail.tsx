import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/format';
import { getROELabel } from '@/config/capital-engine/capital-config';
import {
  CONSTRAINT_LABELS,
  OPPORTUNITY_TYPE_LABELS,
  FUNDING_STATUS_LABELS,
  ACTIVATION_STATUS_LABELS,
} from '@/config/capital-engine/zura-capital-config';
import { useLogCapitalEvent } from '@/hooks/useCapitalEventLog';
import { useDismissOpportunity } from '@/hooks/useCapitalSurfaceState';
import { getProvider } from '@/lib/capital-engine/capital-provider';
import {
  Landmark,
  TrendingUp,
  Clock,
  DollarSign,
  ShieldCheck,
  Target,
  ArrowUpRight,
  Zap,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { ZuraCapitalOpportunity } from '@/hooks/useZuraCapital';
import type { ConstraintType, OpportunityType } from '@/config/capital-engine/zura-capital-config';

function c(cents: number): number { return cents / 100; }

interface Props {
  opportunity: ZuraCapitalOpportunity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surfaceArea?: 'command_center' | 'ops_hub' | 'service_dashboard' | 'stylist_dashboard' | 'capital_queue' | 'expansion_planner';
}

export function FundingOpportunityDetail({ opportunity, open, onOpenChange, surfaceArea = 'capital_queue' }: Props) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const logEvent = useLogCapitalEvent();
  const dismiss = useDismissOpportunity();

  const investmentDollars = c(opportunity.investmentCents);
  const liftExpected = c(opportunity.predictedLiftExpectedCents);
  const liftLow = c(opportunity.predictedLiftLowCents);
  const liftHigh = c(opportunity.predictedLiftHighCents);

  const monthlyLift = liftExpected / Math.max(1, opportunity.breakEvenMonthsExpected);
  const monthlyPayment = opportunity.providerEstimatedPaymentCents
    ? c(opportunity.providerEstimatedPaymentCents)
    : investmentDollars / Math.max(1, opportunity.breakEvenMonthsExpected);
  const netMonthly = monthlyLift - monthlyPayment;

  const coveragePercent = opportunity.coverageRatio
    ? Math.round(Number(opportunity.coverageRatio) * 100)
    : null;

  const statusInfo = FUNDING_STATUS_LABELS[opportunity.eligibilityStatus] ?? {
    label: opportunity.eligibilityStatus,
    color: 'text-muted-foreground',
  };

  const handleFund = async () => {
    setIsRedirecting(true);
    logEvent.mutate({
      opportunityId: opportunity.id,
      eventType: 'funding_initiated',
      surfaceArea,
    });
    try {
      const provider = getProvider('stripe');
      const result = await provider.initiateFunding(opportunity.id, '', '');
      if (result.redirectUrl) {
        const win = window.open(result.redirectUrl, '_blank');
        if (!win) window.location.href = result.redirectUrl;
      } else if (result.error) {
        console.error('Funding initiation failed:', result.error);
      }
    } finally {
      setIsRedirecting(false);
      onOpenChange(false);
    }
  };

  const handleDismiss = () => {
    dismiss.mutate({
      opportunityId: opportunity.id,
      surfaceArea,
      reason: 'user_dismissed',
    });
    logEvent.mutate({
      opportunityId: opportunity.id,
      eventType: 'opportunity_dismissed',
      surfaceArea,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              <DialogTitle className="font-display text-base tracking-wide">
                {opportunity.title}
              </DialogTitle>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleDismiss}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
          <DialogDescription className="font-sans text-sm">
            {opportunity.summary || 'Review opportunity metrics and funding availability.'}
          </DialogDescription>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-sans">
              {OPPORTUNITY_TYPE_LABELS[opportunity.opportunityType as OpportunityType] ?? opportunity.opportunityType}
            </Badge>
            {opportunity.constraintType && (
              <Badge variant="outline" className="text-[10px] font-sans">
                {CONSTRAINT_LABELS[opportunity.constraintType as ConstraintType] ?? opportunity.constraintType}
              </Badge>
            )}
            <Badge variant="outline" className={`text-[10px] font-sans ${statusInfo.color}`}>
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Growth Math */}
          <div>
            <h3 className="font-display text-xs tracking-[0.15em] text-muted-foreground/60 uppercase mb-2">
              Growth Math
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <MetricTile
                icon={<DollarSign className="w-3.5 h-3.5 text-muted-foreground" />}
                label="Investment"
                value={formatCurrency(investmentDollars, { noCents: true })}
              />
              <MetricTile
                icon={<TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />}
                label="Expected Lift"
                value={`+${formatCurrency(liftExpected, { noCents: true })}/yr`}
                sub={liftLow > 0 && liftHigh > 0
                  ? `${formatCurrency(liftLow, { noCents: true })} – ${formatCurrency(liftHigh, { noCents: true })}`
                  : undefined
                }
              />
              <MetricTile
                icon={<Target className="w-3.5 h-3.5 text-muted-foreground" />}
                label="ROE"
                value={`${opportunity.roe.toFixed(1)}x`}
                sub={getROELabel(opportunity.roe)}
                highlight
              />
              <MetricTile
                icon={<Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                label="Break-Even"
                value={`${opportunity.breakEvenMonthsExpected}mo`}
                sub={opportunity.breakEvenMonthsLow > 0 && opportunity.breakEvenMonthsHigh > 0
                  ? `${opportunity.breakEvenMonthsLow}–${opportunity.breakEvenMonthsHigh}mo range`
                  : undefined
                }
              />
            </div>
          </div>

          {/* Risk + Confidence */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-sans">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Risk: <span className="capitalize">{opportunity.riskLevel}</span>
            </div>
            <div>Confidence: {opportunity.confidenceScore}</div>
            {opportunity.momentumScore !== null && (
              <div>Momentum: {opportunity.momentumScore}</div>
            )}
          </div>

          {/* Funding Availability */}
          {opportunity.stripeOfferAvailable && opportunity.providerOfferAmountCents && (
            <div>
              <h3 className="font-display text-xs tracking-[0.15em] text-muted-foreground/60 uppercase mb-2">
                Funding Availability
              </h3>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-2">
                <div className="flex items-center justify-between text-sm font-sans">
                  <span className="text-muted-foreground">Provider Amount</span>
                  <span className="font-display tracking-wide">
                    {formatCurrency(c(opportunity.providerOfferAmountCents), { noCents: true })}
                  </span>
                </div>
                {coveragePercent != null && (
                  <>
                    <div className="flex items-center justify-between text-xs font-sans text-muted-foreground">
                      <span>Coverage</span>
                      <span>{coveragePercent}%</span>
                    </div>
                    <Progress value={Math.min(coveragePercent, 100)} className="h-1.5" />
                  </>
                )}
                {coveragePercent != null && coveragePercent < 100 && (
                  <p className="text-[10px] text-muted-foreground font-sans">
                    Funding covers {coveragePercent}% of the recommended {formatCurrency(investmentDollars, { noCents: true })} investment.
                  </p>
                )}
                {opportunity.providerFeesSummary && (
                  <p className="text-[10px] text-muted-foreground font-sans">{opportunity.providerFeesSummary}</p>
                )}
              </div>
            </div>
          )}

          {/* Net Impact */}
          <div>
            <h3 className="font-display text-xs tracking-[0.15em] text-muted-foreground/60 uppercase mb-2">
              Net Impact
            </h3>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
              <div className="flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-primary font-sans font-medium">Post-Financing Net Cash Flow</span>
              </div>
              <span className="font-display text-xl tracking-wide text-primary">
                {netMonthly >= 0 ? '+' : ''}{formatCurrency(netMonthly, { noCents: true })}
                <span className="text-xs font-sans text-primary/70">/mo</span>
              </span>
              <p className="text-xs text-muted-foreground font-sans">
                {formatCurrency(monthlyLift, { noCents: true })} lift − {formatCurrency(monthlyPayment, { noCents: true })} repayment over {opportunity.breakEvenMonthsExpected}mo
              </p>
            </div>
          </div>

          {/* Why This Makes Sense */}
          {opportunity.constraintType && (
            <div>
              <h3 className="font-display text-xs tracking-[0.15em] text-muted-foreground/60 uppercase mb-2">
                Why This Opportunity Exists
              </h3>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    {getConstraintExplanation(opportunity)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Not eligible warning */}
          {!opportunity.zuraEligible && (
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs text-destructive font-sans font-medium mb-1">Not eligible for funding</p>
              <ul className="text-[10px] text-muted-foreground font-sans space-y-0.5">
                {opportunity.zuraReasons.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          {opportunity.zuraEligible && (
            <Button
              onClick={handleFund}
              disabled={isRedirecting}
              className={`${tokens.button.page} w-full font-sans`}
            >
              {isRedirecting ? 'Redirecting…' : opportunity.recommendedActionLabel}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Helpers ── */

function MetricTile({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground font-sans">{label}</span>
      </div>
      <span className={`font-display text-lg tracking-wide ${highlight ? 'text-primary' : ''}`}>
        {value}
      </span>
      {sub && (
        <span className="text-[10px] text-muted-foreground font-sans block">{sub}</span>
      )}
    </div>
  );
}

function getConstraintExplanation(opp: ZuraCapitalOpportunity): string {
  const type = opp.constraintType;
  const lift = formatCurrency(opp.predictedLiftExpectedCents / 100, { noCents: true });

  switch (type) {
    case 'capacity_bottleneck':
      return `This location is operating at or near capacity. Expanding capacity is projected to generate ${lift} in additional annual revenue with a ${opp.roe.toFixed(1)}x return on investment.`;
    case 'inventory_bottleneck':
      return `Inventory shortages are limiting bookings. Restocking and expanding inventory coverage is projected to recover ${lift} in annual revenue.`;
    case 'strong_demand':
      return `Demand signals are strong and exceeding current capacity. This investment captures unmet demand with a projected ${lift} lift.`;
    case 'market_opportunity':
      return `Market analysis indicates a high-value expansion opportunity. The projected return of ${opp.roe.toFixed(1)}x ROE meets investment threshold.`;
    case 'stylist_ready_to_scale':
      return `This stylist has demonstrated consistent performance and readiness to scale. The investment supports their growth with an expected ${lift} annual lift.`;
    case 'service_waitlist_pressure':
      return `Service demand is creating waitlist pressure. Expanding capacity is projected to capture ${lift} in additional revenue.`;
    case 'understocking_risk':
      return `Current inventory levels risk service disruptions. This investment ensures continuity and protects an estimated ${lift} in annual revenue.`;
    default:
      return `This opportunity has been validated with ${opp.roe.toFixed(1)}x ROE and ${opp.confidenceScore} confidence based on current performance data.`;
  }
}
