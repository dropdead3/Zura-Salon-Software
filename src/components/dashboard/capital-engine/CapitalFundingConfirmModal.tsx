import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/format';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import {
  calculateMonthlyLiftCents,
  calculateNetMonthlyGainCents,
  calculateCoverageRatio,
} from '@/lib/capital-engine/capital-formulas';
import { getROELabel } from '@/config/capital-engine/capital-config';
import { useInitiateFinancing } from '@/hooks/useFinancedProjects';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { Banknote, TrendingUp, Clock, DollarSign, ShieldCheck, Lock } from 'lucide-react';
import type { ZuraCapitalOpportunity } from '@/hooks/useZuraCapital';

function c(cents: number) { return cents / 100; }

interface Props {
  opportunity: ZuraCapitalOpportunity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CapitalFundingConfirmModal({ opportunity, open, onOpenChange }: Props) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const initiate = useInitiateFinancing();
  const { data: isPrimaryOwner } = useIsPrimaryOwner();

  const monthlyLiftCents = calculateMonthlyLiftCents(
    opportunity.predictedLiftExpectedCents,
    opportunity.breakEvenMonthsExpected,
  );
  const paymentCents = opportunity.providerEstimatedPaymentCents ?? 0;
  const netGainCents = calculateNetMonthlyGainCents(
    opportunity.predictedLiftExpectedCents,
    paymentCents,
    opportunity.breakEvenMonthsExpected,
  );
  const { percent: coveragePercent } = calculateCoverageRatio(
    opportunity.providerOfferAmountCents,
    opportunity.investmentCents,
  );

  const handleFund = async () => {
    setIsRedirecting(true);
    try {
      const result = await initiate.mutateAsync({ opportunityId: opportunity.id });
      if (result?.url) {
        const win = window.open(result.url, '_blank');
        if (!win) {
          window.location.href = result.url;
        }
      }
    } finally {
      setIsRedirecting(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" />
            Fund: {opportunity.title}
          </DialogTitle>
          <DialogDescription className="font-sans text-sm">
            Review the investment metrics before proceeding to payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-sans">Investment</span>
              </div>
              <span className="font-display text-lg tracking-wide">
                <BlurredAmount>{formatCurrency(c(opportunity.investmentCents), { noCents: true })}</BlurredAmount>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-sans">Predicted Lift</span>
              </div>
              <span className="font-display text-lg tracking-wide">
                <BlurredAmount>{formatCurrency(c(opportunity.predictedLiftExpectedCents), { noCents: true })}</BlurredAmount>
                <span className="text-xs text-muted-foreground font-sans">/yr</span>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-sans">ROE</span>
              </div>
              <span className="font-display text-lg tracking-wide text-primary">
                {opportunity.roe.toFixed(1)}x
              </span>
              <span className="text-xs text-muted-foreground font-sans block">
                {getROELabel(opportunity.roe)}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-sans">Break-Even</span>
              </div>
              <span className="font-display text-lg tracking-wide">
                {opportunity.breakEvenMonthsExpected}mo
              </span>
            </div>
          </div>

          {/* Post-Financing Cash Flow */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-primary font-sans font-medium">Post-Financing Net Cash Flow</span>
            </div>
            <span className="font-display text-xl tracking-wide text-primary">
              <BlurredAmount>{netGainCents >= 0 ? '+' : ''}{formatCurrency(c(netGainCents), { noCents: true })}</BlurredAmount>
              <span className="text-xs font-sans text-primary/70">/mo</span>
            </span>
            <p className="text-xs text-muted-foreground font-sans mt-1">
              <BlurredAmount>{formatCurrency(c(monthlyLiftCents), { noCents: true })}</BlurredAmount> lift − <BlurredAmount>{formatCurrency(c(paymentCents), { noCents: true })}</BlurredAmount> repayment over {opportunity.breakEvenMonthsExpected}mo
            </p>
          </div>

          {/* Risk + Confidence */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-sans">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Risk: <span className="capitalize">{opportunity.riskLevel}</span>
            </div>
            <div>
              Confidence: {opportunity.confidenceScore}
            </div>
            {coveragePercent != null && (
              <div>Coverage: {coveragePercent}%</div>
            )}
          </div>

          {!isPrimaryOwner && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground font-sans">
                Only the Account Owner can approve funding. Contact your Account Owner to proceed.
              </p>
            </div>
          )}

          <Button
            onClick={handleFund}
            disabled={isRedirecting || initiate.isPending || !isPrimaryOwner}
            className={`${tokens.button.page} w-full font-sans`}
          >
            {isRedirecting ? 'Redirecting…' : 'Proceed to Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
