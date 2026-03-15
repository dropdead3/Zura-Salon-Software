import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { BillingOverviewCard } from './BillingOverviewCard';
import { PaymentMethodCard } from './PaymentMethodCard';
import { OrgBillingHistoryCard } from './OrgBillingHistoryCard';
import { PlanComparisonCard } from './PlanComparisonCard';
import { BackroomCostSummaryCard } from './BackroomCostSummaryCard';
import { BillingAlertsBanner } from './BillingAlertsBanner';

export function AccountBillingContent() {
  return (
    <div className="space-y-6">
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
