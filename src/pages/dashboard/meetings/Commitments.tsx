import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { AccountabilityOverview } from '@/components/coaching/AccountabilityOverview';
import { PageExplainer } from '@/components/ui/PageExplainer';

export default function Commitments() {
  return (
    <DashboardLayout>
      <PlatformPageContainer>
        <div className="space-y-6">
          <DashboardPageHeader
            title="My Commitments"
            description="Track promises and accountability items made to team members."
          />
        <PageExplainer pageId="meeting-details" />

          <AccountabilityOverview />
        </div>
      </PlatformPageContainer>
    </DashboardLayout>
  );
}
