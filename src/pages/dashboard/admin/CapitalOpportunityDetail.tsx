import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { useCapitalOpportunity } from '@/hooks/useCapitalOpportunity';
import { useLogCapitalEvent } from '@/hooks/useCapitalEventLog';
import { useDismissOpportunity } from '@/hooks/useCapitalSurfaceState';
import { getProvider } from '@/lib/capital-engine/capital-provider';
import { calculateCoverageRatio, calculateMonthlyLiftCents } from '@/lib/capital-engine/capital-formulas';
import { getROELabel } from '@/config/capital-engine/capital-config';
import { CapitalMetricTile } from '@/components/dashboard/capital-engine/CapitalMetricTile';
import { CapitalStatusBadge } from '@/components/dashboard/capital-engine/CapitalStatusBadge';
import {
  OPPORTUNITY_TYPE_LABELS,
  CONSTRAINT_LABELS,
  CAPITAL_EVENT_TYPES,
} from '@/config/capital-engine/zura-capital-config';
import type { OpportunityType, ConstraintType } from '@/config/capital-engine/zura-capital-config';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PageExplainer } from '@/components/ui/PageExplainer';
import {
  Landmark, DollarSign, TrendingUp, Target, Clock, ShieldCheck,
  ArrowUpRight, Zap, X, Activity,
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

function c(cents: number) { return cents / 100; }

export default function CapitalOpportunityDetail() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { dashPath } = useOrgDashboardPath();
  const { opportunity: opp, events, isLoading } = useCapitalOpportunity(opportunityId);
  const logEvent = useLogCapitalEvent();
  const dismiss = useDismissOpportunity();
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (isLoading || !opp) {
    return (
      <DashboardLayout>
        <div className={cn(tokens.layout.pageContainer, 'max-w-[1200px] mx-auto')}>
          <DashboardPageHeader title="Loading…" backTo={dashPath('/admin/capital')} backLabel="Back to Queue" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const o = opp as any;
  const investmentDollars = c(Number(o.required_investment_cents));
  const liftExpected = c(Number(o.predicted_revenue_lift_expected_cents));
  const liftLow = c(Number(o.predicted_revenue_lift_low_cents));
  const liftHigh = c(Number(o.predicted_revenue_lift_high_cents));
  const breakEvenExpected = Number(o.break_even_months_expected);
  const roe = Number(o.roe_score);
  const confidence = Number(o.confidence_score);
  const { ratio: _cr, percent: coveragePercent } = calculateCoverageRatio(
    o.provider_offer_amount_cents ? Number(o.provider_offer_amount_cents) : null,
    Number(o.required_investment_cents),
  );
  const monthlyLiftVal = calculateMonthlyLiftCents(Number(o.predicted_revenue_lift_expected_cents), breakEvenExpected);
  const monthlyPaymentCents = o.provider_estimated_payment_cents
    ? Number(o.provider_estimated_payment_cents)
    : Math.round(Number(o.required_investment_cents) / Math.max(1, breakEvenExpected));
  const netMonthlyCents = monthlyLiftVal - monthlyPaymentCents;
  const monthlyLift = c(monthlyLiftVal);
  const monthlyPayment = c(monthlyPaymentCents);
  const netMonthly = c(netMonthlyCents);

  const handleFund = async () => {
    setIsRedirecting(true);
    logEvent.mutate({ opportunityId: o.id, eventType: 'funding_initiated', surfaceArea: 'capital_queue' });
    try {
      const provider = getProvider('stripe');
      const result = await provider.initiateFunding(o.id, '', '');
      if (result.redirectUrl) {
        const win = window.open(result.redirectUrl, '_blank');
        if (!win) window.location.href = result.redirectUrl;
      }
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleDismiss = () => {
    dismiss.mutate({ opportunityId: o.id, surfaceArea: 'capital_queue', reason: 'user_dismissed' });
    logEvent.mutate({ opportunityId: o.id, eventType: 'opportunity_dismissed', surfaceArea: 'capital_queue' });
  };

  return (
    <DashboardLayout>
      <div className={cn(tokens.layout.pageContainer, 'max-w-[1200px] mx-auto')}>
        <DashboardPageHeader
          title={o.title}
          description={o.summary || 'Review opportunity metrics and funding availability.'}
          backTo={dashPath('/admin/capital')}
          backLabel="Back to Queue"
          actions={
            <div className="flex items-center gap-2">
              {o.eligibility_status !== 'funded' && (
                <Button variant="ghost" size="sm" className="font-sans text-xs" onClick={handleDismiss}>
                  <X className="w-3.5 h-3.5 mr-1" /> Dismiss
                </Button>
              )}
              {o.stripe_offer_available && o.eligibility_status !== 'funded' && (
                <Button onClick={handleFund} disabled={isRedirecting} className={`${tokens.button.page} font-sans`}>
                  {isRedirecting ? 'Redirecting…' : o.recommended_action_label || 'Fund This'}
                </Button>
              )}
            </div>
          }
        />

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-sans">
            {OPPORTUNITY_TYPE_LABELS[o.opportunity_type as OpportunityType] ?? o.opportunity_type}
          </Badge>
          {o.constraint_type && (
            <Badge variant="outline" className="text-[10px] font-sans">
              {CONSTRAINT_LABELS[o.constraint_type as ConstraintType] ?? o.constraint_type}
            </Badge>
          )}
          <CapitalStatusBadge status={o.eligibility_status} />
        </div>

        <div className="space-y-6">
          {/* Growth Math */}
          <Card className={tokens.card.wrapper}>
            <CardContent className="p-5">
              <h3 className={cn(tokens.heading.subsection, 'mb-3')}>Growth Math</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CapitalMetricTile icon={<DollarSign className="w-3.5 h-3.5 text-muted-foreground" />} label="Investment" value={formatCurrency(investmentDollars, { noCents: true })} />
                <CapitalMetricTile icon={<TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />} label="Expected Lift" value={`+${formatCurrency(liftExpected, { noCents: true })}/yr`} sub={liftLow > 0 && liftHigh > 0 ? `${formatCurrency(liftLow, { noCents: true })} – ${formatCurrency(liftHigh, { noCents: true })}` : undefined} />
                <CapitalMetricTile icon={<Target className="w-3.5 h-3.5 text-muted-foreground" />} label="ROE" value={`${roe.toFixed(1)}x`} sub={getROELabel(roe)} highlight />
                <CapitalMetricTile icon={<Clock className="w-3.5 h-3.5 text-muted-foreground" />} label="Break-Even" value={`${breakEvenExpected}mo`} sub={Number(o.break_even_months_low) > 0 ? `${o.break_even_months_low}–${o.break_even_months_high}mo range` : undefined} />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-sans mt-3">
                <div className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Risk: <span className="capitalize">{o.risk_level}</span></div>
                <div>Confidence: {confidence}</div>
                {o.momentum_score != null && <div>Momentum: {o.momentum_score}</div>}
              </div>
            </CardContent>
          </Card>

          {/* Funding Availability */}
          {o.stripe_offer_available && o.provider_offer_amount_cents && (
            <Card className={tokens.card.wrapper}>
              <CardContent className="p-5">
                <h3 className={cn(tokens.heading.subsection, 'mb-3')}>Funding Availability</h3>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-2">
                  <div className="flex items-center justify-between text-sm font-sans">
                    <span className="text-muted-foreground">Provider Amount</span>
                    <span className="font-display tracking-wide">{formatCurrency(c(Number(o.provider_offer_amount_cents)), { noCents: true })}</span>
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
                  {o.provider_fees_summary && <p className="text-[10px] text-muted-foreground font-sans">{o.provider_fees_summary}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Net Impact */}
          <Card className={tokens.card.wrapper}>
            <CardContent className="p-5">
              <h3 className={cn(tokens.heading.subsection, 'mb-3')}>Net Impact</h3>
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
                  {formatCurrency(monthlyLift, { noCents: true })} lift − {formatCurrency(monthlyPayment, { noCents: true })} repayment over {breakEvenExpected}mo
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Why This Opportunity Exists */}
          {o.constraint_type && (
            <Card className={tokens.card.wrapper}>
              <CardContent className="p-5">
                <h3 className={cn(tokens.heading.subsection, 'mb-3')}>Why This Opportunity Exists</h3>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-start gap-2">
                    <Zap className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      {o.reason_summary || `This opportunity has been validated with ${roe.toFixed(1)}x ROE and ${confidence} confidence.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          {events.length > 0 && (
            <Card className={tokens.card.wrapper}>
              <CardContent className="p-5">
                <h3 className={cn(tokens.heading.subsection, 'mb-3')}>Activity Timeline</h3>
                <div className="space-y-2">
                  {(events as any[]).map(e => (
                    <div key={e.id} className="flex items-center gap-3 text-xs font-sans">
                      <Activity className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{format(new Date(e.created_at), 'MMM d, yyyy h:mm a')}</span>
                      <span className="capitalize">{(e.event_type as string).replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
