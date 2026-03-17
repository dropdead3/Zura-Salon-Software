import { BillingOverviewCard } from './BillingOverviewCard';
import { PaymentMethodCard } from './PaymentMethodCard';
import { OrgBillingHistoryCard } from './OrgBillingHistoryCard';
import { PlanComparisonCard } from './PlanComparisonCard';
import { BackroomCostSummaryCard } from './BackroomCostSummaryCard';
import { BillingAlertsBanner } from './BillingAlertsBanner';
import { BillingAccessBanner, BillingOwnerToggleCard, BillingAccessDenied } from './BillingAccessGate';
import { useBillingAccess } from '@/hooks/useBillingAccess';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';

export function AccountBillingContent() {
  const { canViewBilling, isLoading } = useBillingAccess();

  if (isLoading) {
    return <DashboardLoader size="md" className="h-64" />;
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
