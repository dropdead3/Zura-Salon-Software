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

  // Self-gating: only render if org has payroll enabled AND user has payroll settings
  if (isLoading || entitlementLoading || !isEntitled || !settings) return null;

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
