import { 
  CreditCard, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  PauseCircle,
  XCircle,
  Sparkles
} from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import type { BillingStatus } from '@/hooks/useOrganizationBilling';
import type { BillingCalculation } from '@/hooks/useBillingCalculations';
import { formatCurrency } from '@/hooks/useBillingCalculations';

interface BillingStatusCardProps {
  billingStatus: BillingStatus;
  calculation: BillingCalculation;
  nextInvoiceDate?: string | null;
  planName?: string;
  /** @deprecated billingCycle is no longer used — monthly only */
  billingCycle?: unknown;
}

const statusConfig: Record<BillingStatus, { 
  icon: React.ReactNode; 
  variant: 'success' | 'warning' | 'error' | 'default' | 'primary';
  label: string;
}> = {
  draft: { icon: <Clock className="h-4 w-4" />, variant: 'default', label: 'Draft' },
  trialing: { icon: <Sparkles className="h-4 w-4" />, variant: 'primary', label: 'Trial' },
  active: { icon: <CheckCircle2 className="h-4 w-4" />, variant: 'success', label: 'Active' },
  past_due: { icon: <AlertCircle className="h-4 w-4" />, variant: 'error', label: 'Past Due' },
  paused: { icon: <PauseCircle className="h-4 w-4" />, variant: 'warning', label: 'Paused' },
  cancelled: { icon: <XCircle className="h-4 w-4" />, variant: 'default', label: 'Cancelled' },
};

export function BillingStatusCard({
  billingStatus,
  calculation,
  nextInvoiceDate,
  planName,
}: BillingStatusCardProps) {
  const { formatDate } = useFormatDate();
  const status = statusConfig[billingStatus];

  return (
    <PlatformCard variant="glass" className="border-violet-500/30">
      <PlatformCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <PlatformCardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-violet-400" />
            Billing Status
          </PlatformCardTitle>
          <PlatformBadge variant={status.variant} className="flex items-center gap-1">
            {status.icon}
            {status.label}
          </PlatformBadge>
        </div>
      </PlatformCardHeader>
      <PlatformCardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Current Plan */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Current Plan</p>
            <p className="text-lg font-medium text-white">{planName || 'No Plan'}</p>
          </div>

          {/* Billing Cycle */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Billing Cycle</p>
            <p className="text-lg font-medium text-white">Monthly</p>
          </div>

          {/* Effective Rate */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Effective Rate</p>
            <p className="text-lg font-medium text-white">
              {formatCurrency(calculation.effectiveMonthlyAmount)}
              <span className="text-sm text-slate-400">/mo</span>
            </p>
          </div>

          {/* Next Invoice */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Next Invoice</p>
            {calculation.isInTrial ? (
              <p className="text-lg font-medium text-violet-400">
                {calculation.daysUntilTrialEnds} days left
              </p>
            ) : nextInvoiceDate ? (
              <p className="text-lg font-medium text-white">
                {formatDate(new Date(nextInvoiceDate), 'MMM d, yyyy')}
              </p>
            ) : (
              <p className="text-lg font-medium text-slate-500">Not scheduled</p>
            )}
          </div>
        </div>

        {/* Promotional Banner */}
        {calculation.isInPromo && (
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-violet-300">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">
                Promotional pricing active • {calculation.daysUntilPromoEnds} days remaining
              </span>
            </div>
            <p className="text-xs text-violet-400/70 mt-1">
              Saving {formatCurrency(calculation.promoSavings)}/mo during promo period
            </p>
          </div>
        )}
      </PlatformCardContent>
    </PlatformCard>
  );
}
