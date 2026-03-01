import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { ManagerMeetingRequest } from '@/components/coaching/ManagerMeetingRequest';
import { PendingMeetingRequests } from '@/components/coaching/PendingMeetingRequests';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';

export default function MeetingInbox() {
  const { user } = useAuth();
  const roles = useEffectiveRoles();
  const isCoach = roles.includes('admin') || roles.includes('manager') || roles.includes('super_admin');

  return (
    <DashboardLayout>
      <PlatformPageContainer>
        <div className="space-y-6">
          <DashboardPageHeader
            title="Meeting Inbox"
            description="Manager-initiated meeting requests and your pending requests."
          />

          <div className="space-y-4">
            {isCoach && (
              <div className="flex justify-end">
                <ManagerMeetingRequest />
              </div>
            )}
            <PendingMeetingRequests viewAs={isCoach ? 'manager' : 'team_member'} />
          </div>
        </div>
      </PlatformPageContainer>
    </DashboardLayout>
  );
}
