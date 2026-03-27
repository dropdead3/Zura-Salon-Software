import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { LeaderboardContent } from '@/components/dashboard/LeaderboardContent';
import { PageExplainer } from '@/components/ui/PageExplainer';

export default function Leaderboard() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <DashboardPageHeader
          title="Team Leaderboard"
          description="See how the team is performing this week."
          className="mb-8"
        />
        <PageExplainer pageId="leaderboard" />
        <LeaderboardContent />
      </div>
    </DashboardLayout>
  );
}
