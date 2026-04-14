import { BillingOverviewCard } from './BillingOverviewCard';
import { PaymentMethodCard } from './PaymentMethodCard';
import { OrgBillingHistoryCard } from './OrgBillingHistoryCard';
import { PlanComparisonCard } from './PlanComparisonCard';
import { ColorBarCostSummaryCard } from './ColorBarCostSummaryCard';
import { BillingAlertsBanner } from './BillingAlertsBanner';
import { BillingAccessBanner, BillingOwnerToggleCard, BillingAccessDenied } from './BillingAccessGate';
import { useBillingAccess } from '@/hooks/useBillingAccess';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { PageExplainer } from '@/components/ui/PageExplainer';

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

      {/* Page Explainer */}
      <PageExplainer pageId="account-management" />

      {/* Row 1: Overview + Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BillingOverviewCard />
        <PaymentMethodCard />
      </div>

      {/* Row 2: Plan Comparison */}
      <PlanComparisonCard />

      {/* Row 3: Color Bar + History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ColorBarCostSummaryCard />
        <OrgBillingHistoryCard />
      </div>
    </div>
  );
}
