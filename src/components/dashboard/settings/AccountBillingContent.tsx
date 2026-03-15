import { BillingOverviewCard } from './BillingOverviewCard';
import { PaymentMethodCard } from './PaymentMethodCard';
import { OrgBillingHistoryCard } from './OrgBillingHistoryCard';
import { PlanComparisonCard } from './PlanComparisonCard';
import { BackroomCostSummaryCard } from './BackroomCostSummaryCard';
import { BillingAlertsBanner } from './BillingAlertsBanner';
import { BillingAccessBanner, BillingOwnerToggleCard, BillingAccessDenied } from './BillingAccessGate';
import { useBillingAccess } from '@/hooks/useBillingAccess';
import { Loader2 } from 'lucide-react';

export function AccountBillingContent() {
  const { canViewBilling, isLoading } = useBillingAccess();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canViewBilling) {
    return <BillingAccessDenied />;
  }

  return (
    <div className="space-y-6">
      {/* Access Info */}
      <BillingAccessBanner />

      {/* Owner Toggle */}
      <BillingOwnerToggleCard />

      {/* Billing Alerts */}
      <BillingAlertsBanner />

      {/* Row 1: Overview + Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BillingOverviewCard />
        <PaymentMethodCard />
      </div>

      {/* Row 2: Plan Comparison */}
      <PlanComparisonCard />

      {/* Row 3: Backroom + History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BackroomCostSummaryCard />
        <OrgBillingHistoryCard />
      </div>
    </div>
  );
}
