import { lazy, Suspense, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizationUsers } from '@/hooks/useOrganizationUsers';
import { TeamMemberHeader } from '@/components/dashboard/team-members/TeamMemberHeader';
import { ArchiveDeliveryReceiptCard } from '@/components/dashboard/team-members/archive/ArchiveDeliveryReceiptCard';
import { useArchiveLogEntry } from '@/hooks/useArchiveTeamMember';

const ProfileTab = lazy(() => import('@/components/dashboard/team-members/tabs/ProfileTab').then(m => ({ default: m.ProfileTab })));
const RoleAccessTab = lazy(() => import('@/components/dashboard/team-members/tabs/RoleAccessTab').then(m => ({ default: m.RoleAccessTab })));
const ScheduleTab = lazy(() => import('@/components/dashboard/team-members/tabs/ScheduleTab').then(m => ({ default: m.ScheduleTab })));
const ServicesTab = lazy(() => import('@/components/dashboard/team-members/tabs/ServicesTab').then(m => ({ default: m.ServicesTab })));
const CompensationTab = lazy(() => import('@/components/dashboard/team-members/tabs/CompensationTab').then(m => ({ default: m.CompensationTab })));
const LevelTab = lazy(() => import('@/components/dashboard/team-members/tabs/LevelTab').then(m => ({ default: m.LevelTab })));
const CoachingTab = lazy(() => import('@/components/dashboard/team-members/tabs/CoachingTab').then(m => ({ default: m.CoachingTab })));
const SecurityTab = lazy(() => import('@/components/dashboard/team-members/tabs/SecurityTab').then(m => ({ default: m.SecurityTab })));

const STYLIST_ROLES = ['stylist', 'stylist_assistant', 'lead_stylist', 'lead'];

export default function TeamMemberDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: members, isLoading: rosterLoading } = useOrganizationUsers(effectiveOrganization?.id, { includeArchived: true });
  const [activeTab, setActiveTab] = useState('profile');

  const member = useMemo(() => members?.find(m => m.user_id === userId), [members, userId]);

  // Fetch full profile (for editing fields not in roster query)
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['team-member-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const isLoading = rosterLoading || profileLoading;

  const showCoaching = useMemo(() => {
    return member?.roles?.some(r => STYLIST_ROLES.includes(r)) ?? false;
  }, [member]);

  const showLevel = useMemo(() => {
    return member?.roles?.some(r => STYLIST_ROLES.includes(r)) ?? false;
  }, [member]);

  const showServices = useMemo(() => {
    // Hide services tab for receptionist/front_desk/operations roles
    const nonServiceRoles = ['receptionist', 'front_desk', 'operations_assistant'];
    if (!member?.roles?.length) return true;
    return !member.roles.every(r => nonServiceRoles.includes(r));
  }, [member]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!member || !profile || !userId) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <DashboardPageHeader
            title="TEAM MEMBER NOT FOUND"
            backTo={dashPath('/admin/team-members')}
            backLabel="Back to Team Members"
          />
          <Card className="mt-6">
            <CardContent className="py-12 text-center">
              <p className={tokens.body.muted}>This team member could not be found in your organization.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const fallback = (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <DashboardPageHeader
          title=""
          backTo={dashPath('/admin/team-members')}
          backLabel="Back to Team Members"
        />
        <TeamMemberHeader member={member} profile={profile} />

        {member.archived_at && (
          <ArchiveLogReceipts
            organizationId={effectiveOrganization?.id}
            userId={userId}
          />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex-wrap h-auto justify-start gap-1 bg-muted/50 p-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="role">Role &amp; Access</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            {showServices && <TabsTrigger value="services">Services</TabsTrigger>}
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
            {showLevel && <TabsTrigger value="level">Level</TabsTrigger>}
            {showCoaching && <TabsTrigger value="coaching">Coaching</TabsTrigger>}
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Suspense fallback={fallback}><ProfileTab userId={userId} profile={profile} /></Suspense>
          </TabsContent>
          <TabsContent value="role" className="mt-6">
            <Suspense fallback={fallback}><RoleAccessTab userId={userId} member={member} /></Suspense>
          </TabsContent>
          <TabsContent value="schedule" className="mt-6">
            <Suspense fallback={fallback}><ScheduleTab userId={userId} /></Suspense>
          </TabsContent>
          {showServices && (
            <TabsContent value="services" className="mt-6">
              <Suspense fallback={fallback}><ServicesTab userId={userId} /></Suspense>
            </TabsContent>
          )}
          <TabsContent value="compensation" className="mt-6">
            <Suspense fallback={fallback}><CompensationTab userId={userId} /></Suspense>
          </TabsContent>
          {showLevel && (
            <TabsContent value="level" className="mt-6">
              <Suspense fallback={fallback}><LevelTab userId={userId} profile={profile} /></Suspense>
            </TabsContent>
          )}
          {showCoaching && (
            <TabsContent value="coaching" className="mt-6">
              <Suspense fallback={fallback}><CoachingTab userId={userId} /></Suspense>
            </TabsContent>
          )}
          <TabsContent value="security" className="mt-6">
            <Suspense fallback={fallback}><SecurityTab userId={userId} profile={profile} /></Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function ArchiveLogReceipts({
  organizationId,
  userId,
}: {
  organizationId: string | undefined;
  userId: string | undefined;
}) {
  const { data: logEntry } = useArchiveLogEntry(organizationId, userId);
  if (!logEntry?.id || !organizationId) return null;
  return (
    <ArchiveDeliveryReceiptCard
      organizationId={organizationId}
      archiveLogId={logEntry.id}
      archivedAt={logEntry.archived_at}
    />
  );
}
