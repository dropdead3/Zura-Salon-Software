import { Card, CardContent } from '@/components/ui/card';
import { LiveCountdown } from '@/components/dashboard/LiveCountdown';
import { VisibilityGate } from '@/components/visibility';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useMyPayData } from '@/hooks/useMyPayData';
import { parseISO } from 'date-fns';
import { Banknote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { usePayrollEntitlement } from '@/hooks/payroll/usePayrollEntitlement';
import { useHasEffectivePermission } from '@/hooks/useEffectivePermissions';
import { ConfigurationStubCard } from '@/components/dashboard/ConfigurationStubCard';


function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function PaydayCountdownBanner() {
  const { dashPath } = useOrgDashboardPath();
  const { isEntitled, isLoading: entitlementLoading } = usePayrollEntitlement();
  const { settings, currentPeriod, estimatedCompensation, isLoading } = useMyPayData();
  // Account owners / admins can enable Payroll; everyone else sees a passive
  // explainer with no CTA route (they'd land on a 403).
  const canManageFeatures = useHasEffectivePermission('manage_settings');

  // Defer rendering while data is in flight — silence is correct here, this
  // is a loading state, not a configuration gap.
  if (isLoading || entitlementLoading) return null;

  // Configuration gates — operator opted in via Customize, so render a stub
  // explaining why the live card is silent and (when permitted) a deep link
  // to fix it. Doctrine: distinguish materiality silence from configuration
  // silence (mem://architecture/visibility-contracts).
  if (!isEntitled) {
    return (
      <ConfigurationStubCard
        sectionId="payday_countdown"
        title="Payday Countdown"
        reason={
          canManageFeatures
            ? 'Enable Payroll to surface your next paycheck.'
            : 'Payroll is not enabled for this organization yet.'
        }
        ctaLabel={canManageFeatures ? 'Enable Payroll' : 'Learn more'}
        ctaTo={dashPath('/admin/features')}
        icon={Banknote}
        dismissible
      />
    );
  }

  if (!settings) {
    return (
      <ConfigurationStubCard
        sectionId="payday_countdown"
        title="Payday Countdown"
        reason="Configure your pay setup to start the countdown."
        ctaLabel="Set up"
        ctaTo={dashPath('/my-pay')}
        icon={Banknote}
        dismissible
      />
    );
  }

  const checkDate = parseISO(currentPeriod.checkDate);
  const now = new Date();
  const daysUntil = Math.ceil((checkDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isNear = daysUntil <= 3;

  return (
    <VisibilityGate
      elementKey="payday_countdown_banner"
      elementName="Payday Countdown"
      elementCategory="My Pay"
    >
      <Link to={dashPath('/my-pay')} className="block group">
        <Card className={`border-border/40 transition-all duration-200 ${isNear ? 'ring-1 ring-primary/20' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isNear ? 'bg-primary/15' : 'bg-muted'}`}>
                <Banknote className={`h-4 w-4 ${isNear ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <LiveCountdown
                  expiresAt={checkDate}
                  displayMode="days"
                  urgentThresholdMs={3 * 24 * 60 * 60 * 1000}
                  hideIcon
                  className="text-sm"
                />
              </div>
              {estimatedCompensation && (
                <BlurredAmount className="text-sm font-medium text-primary shrink-0">
                  ~{formatCurrency(estimatedCompensation.netPay)}
                </BlurredAmount>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </VisibilityGate>
  );
}
