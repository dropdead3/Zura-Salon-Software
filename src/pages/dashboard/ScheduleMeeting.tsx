import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { isToday, isTomorrow, isPast } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import {
  CalendarPlus,
  Calendar,
  Inbox,
  ClipboardList,
  MessageSquareMore,
  ChevronRight,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { ManagerMeetingRequest } from '@/components/coaching/ManagerMeetingRequest';
import { TeamMeetingOverview } from '@/components/coaching/TeamMeetingOverview';
import { tokens } from '@/lib/design-tokens';
import { EmptyState } from '@/components/ui/empty-state';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}

function StatCard({ icon: Icon, value, label }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={tokens.card.iconBox}>
          <Icon className={tokens.card.icon} />
        </div>
        <div>
          <p className={cn(tokens.kpi.value, "tabular-nums text-foreground")}>{value}</p>
          <p className={cn(tokens.body.muted, "text-xs")}>{label}</p>
        </div>
      </div>
    </Card>
  );
}

function formatMeetingDate(dateStr: string, formatDate: (d: Date | string | number, f: string) => string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return formatDate(date, 'MMM d');
}

function formatTime(timeStr: string, formatDate: (d: Date | string | number, f: string) => string): string {
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return formatDate(date, 'h:mm a');
}

interface ProfileInfo {
  user_id: string;
  full_name: string;
  display_name: string | null;
}

interface MeetingWithCoach {
  id: string;
  meeting_date: string;
  start_time: string;
  meeting_type: string | null;
  coach_id: string;
  status: string;
  coach?: ProfileInfo;
}

interface RequestWithRequester {
  id: string;
  meeting_date: string;
  start_time: string;
  meeting_type: string | null;
  requester_id: string;
  requester?: ProfileInfo;
}

interface CommitmentWithMember {
  id: string;
  title: string;
  due_date: string | null;
  team_member_id: string;
  priority: string;
  teamMember?: ProfileInfo;
}

export default function ScheduleMeeting() {
  const { user } = useAuth();
  const roles = useEffectiveRoles();
  const { formatDate } = useFormatDate();
  const isCoach = roles.includes('admin') || roles.includes('manager') || roles.includes('super_admin');

  // Fetch dashboard data
  const { data } = useQuery({
    queryKey: ['meeting-dashboard-data', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // Fetch upcoming meetings (as requester) with coach info
      const { data: upcomingMeetings } = await supabase
        .from('one_on_one_meetings')
        .select('id, meeting_date, start_time, meeting_type, coach_id, status')
        .eq('requester_id', user!.id)
        .gte('meeting_date', today)
        .in('status', ['pending', 'confirmed'])
        .order('meeting_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5);

      // Get coach profiles for upcoming meetings
      const coachIds = [...new Set(upcomingMeetings?.map(m => m.coach_id) || [])];
      const { data: coachProfiles } = coachIds.length > 0
        ? await supabase
            .from('employee_profiles')
            .select('user_id, full_name, display_name')
            .in('user_id', coachIds)
        : { data: [] as ProfileInfo[] };

      const coachMap = new Map<string, ProfileInfo>(
        (coachProfiles || []).map(p => [p.user_id, p])
      );

      // Fetch pending requests (as coach)
      const { data: pendingRequests, count: pendingCount } = await supabase
        .from('one_on_one_meetings')
        .select('id, meeting_date, start_time, meeting_type, requester_id', { count: 'exact' })
        .eq('coach_id', user!.id)
        .eq('status', 'pending')
        .order('meeting_date', { ascending: true })
        .limit(3);

      // Get requester profiles
      const requesterIds = [...new Set(pendingRequests?.map(m => m.requester_id) || [])];
      const { data: requesterProfiles } = requesterIds.length > 0
        ? await supabase
            .from('employee_profiles')
            .select('user_id, full_name, display_name')
            .in('user_id', requesterIds)
        : { data: [] as ProfileInfo[] };

      const requesterMap = new Map<string, ProfileInfo>(
        (requesterProfiles || []).map(p => [p.user_id, p])
      );

      // Fetch active commitments (as coach)
      const { data: activeCommitments, count: commitmentsCount } = await supabase
        .from('accountability_items')
        .select('id, title, due_date, team_member_id, priority', { count: 'exact' })
        .eq('coach_id', user!.id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(3);

      // Get team member profiles for commitments
      const teamMemberIds = [...new Set(activeCommitments?.map(c => c.team_member_id) || [])];
      const { data: teamMemberProfiles } = teamMemberIds.length > 0
        ? await supabase
            .from('employee_profiles')
            .select('user_id, full_name, display_name')
            .in('user_id', teamMemberIds)
        : { data: [] as ProfileInfo[] };

      const teamMemberMap = new Map<string, ProfileInfo>(
        (teamMemberProfiles || []).map(p => [p.user_id, p])
      );

      // Fetch meeting inbox count
      const { count: inboxCount } = await supabase
        .from('meeting_requests')
        .select('*', { count: 'exact', head: true })
        .eq('team_member_id', user!.id)
        .eq('status', 'pending');

      return {
        upcomingMeetings: (upcomingMeetings || []).map(m => ({
          ...m,
          coach: coachMap.get(m.coach_id),
        })) as MeetingWithCoach[],
        upcomingCount: upcomingMeetings?.length || 0,
        pendingRequests: (pendingRequests || []).map(m => ({
          ...m,
          requester: requesterMap.get(m.requester_id),
        })) as RequestWithRequester[],
        pendingCount: pendingCount || 0,
        activeCommitments: (activeCommitments || []).map(c => ({
          ...c,
          teamMember: teamMemberMap.get(c.team_member_id),
        })) as CommitmentWithMember[],
        commitmentsCount: commitmentsCount || 0,
        inboxCount: inboxCount || 0,
      };
    },
    enabled: !!user,
  });

  const stats = {
    upcomingMeetings: data?.upcomingCount || 0,
    pendingRequests: data?.pendingCount || 0,
    activeCommitments: data?.commitmentsCount || 0,
    inboxPending: data?.inboxCount || 0,
  };

  return (
    <DashboardLayout>
      <PlatformPageContainer>
        <div className="space-y-8">
          {/* Header with Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className={tokens.heading.page}>Meetings & Accountability</h1>
              <p className={cn(tokens.body.muted, "mt-1")}>
                Schedule 1:1 meetings, track commitments, and manage meeting requests.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 sm:shrink-0">
              <Link to="/dashboard/schedule-meeting/new">
                <Button className="gap-2">
                  <CalendarPlus className="w-4 h-4" />
                  Schedule Meeting
                </Button>
              </Link>
              {isCoach && <ManagerMeetingRequest />}
              <Link to="/dashboard/schedule-meeting/inbox">
                <Button variant="outline" className="gap-2">
                  <MessageSquareMore className="w-4 h-4" />
                  Meeting Inbox
                  {stats.inboxPending > 0 && (
                    <Badge variant="secondary" className="ml-1">{stats.inboxPending}</Badge>
                  )}
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Calendar}
              value={stats.upcomingMeetings}
              label="Upcoming Meetings"
            />
            {isCoach && (
              <StatCard
                icon={Inbox}
                value={stats.pendingRequests}
                label="Pending Requests"
              />
            )}
            {isCoach && (
              <StatCard
                icon={ClipboardList}
                value={stats.activeCommitments}
                label="Active Commitments"
              />
            )}
            <StatCard
              icon={MessageSquareMore}
              value={stats.inboxPending}
              label="Inbox Pending"
            />
          </div>

          {/* Team Meeting Overview - Coach/Admin only */}
          {isCoach && <TeamMeetingOverview />}

          {/* Upcoming Meetings Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                 <div className={tokens.card.iconBox}>
                   <Calendar className={tokens.card.icon} />
                 </div>
                 <div>
                   <CardTitle className={tokens.card.title}>UPCOMING MEETINGS</CardTitle>
                  <CardDescription>Scheduled sessions awaiting you</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data?.upcomingMeetings && data.upcomingMeetings.length > 0 ? (
                <div className="space-y-0 divide-y divide-border">
                  {data.upcomingMeetings.map((meeting) => (
                    <div key={meeting.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className={tokens.body.emphasis}>
                             {formatMeetingDate(meeting.meeting_date, formatDate)} at {formatTime(meeting.start_time, formatDate)}
                           </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {meeting.meeting_type?.replace('_', ' ') || 'Meeting'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          with {meeting.coach?.display_name || meeting.coach?.full_name || 'Coach'}
                        </span>
                        <Badge variant={meeting.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                          {meeting.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                   icon={Calendar}
                   title="No upcoming meetings"
                   description="Schedule a 1:1 to get started"
                 />
              )}
              <Link to="/dashboard/schedule-meeting/my-meetings">
                <Button variant="ghost" size={tokens.button.card} className={tokens.button.cardFooter}>
                  View All Meetings <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Coaching Section - Only for coaches */}
          {isCoach && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Pending Requests Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                     <div className={tokens.card.iconBox}>
                       <Inbox className={tokens.card.icon} />
                     </div>
                     <div>
                       <CardTitle className={tokens.card.title}>PENDING REQUESTS</CardTitle>
                      <CardDescription>Meeting requests awaiting your response</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {data?.pendingRequests && data.pendingRequests.length > 0 ? (
                    <div className="space-y-0 divide-y divide-border">
                      {data.pendingRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                          <div className="flex flex-col">
                             <span className={tokens.body.emphasis}>
                               {request.requester?.display_name || request.requester?.full_name || 'Team Member'}
                             </span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {request.meeting_type?.replace('_', ' ') || 'Meeting'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {formatMeetingDate(request.meeting_date, formatDate)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                     <EmptyState
                       icon={Inbox}
                       title="No pending requests"
                       description="All meeting requests have been addressed"
                     />
                  )}
                  <Link to="/dashboard/schedule-meeting/requests">
                    <Button variant="ghost" size={tokens.button.card} className={tokens.button.cardFooter}>
                      View All Requests <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Active Commitments Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                     <div className={tokens.card.iconBox}>
                       <ClipboardList className={tokens.card.icon} />
                     </div>
                     <div>
                       <CardTitle className={tokens.card.title}>ACTIVE COMMITMENTS</CardTitle>
                      <CardDescription>Open action items from coaching sessions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {data?.activeCommitments && data.activeCommitments.length > 0 ? (
                    <div className="space-y-0 divide-y divide-border">
                      {data.activeCommitments.map((item) => {
                        const isOverdue = item.due_date && isPast(new Date(item.due_date));
                        return (
                          <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                            <div className="flex flex-col">
                              <span className={cn(tokens.body.emphasis, "line-clamp-1")}>{item.title}</span>
                              <span className="text-xs text-muted-foreground">
                                For {item.teamMember?.display_name || item.teamMember?.full_name || 'Team Member'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.due_date && (
                                <span className={cn(
                                  "text-xs flex items-center gap-1",
                                  isOverdue ? "text-destructive" : "text-muted-foreground"
                                )}>
                                  {isOverdue && <AlertCircle className="w-3 h-3" />}
                                  {formatDate(new Date(item.due_date), 'MMM d')}
                                </span>
                              )}
                              {item.priority === 'high' && (
                                <Badge variant="destructive" className="text-xs">High</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                     <EmptyState
                       icon={ClipboardList}
                       title="No active commitments"
                       description="Commitments from coaching sessions will appear here"
                     />
                  )}
                  <Link to="/dashboard/schedule-meeting/commitments">
                    <Button variant="ghost" size={tokens.button.card} className={tokens.button.cardFooter}>
                      View All Commitments <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </PlatformPageContainer>
    </DashboardLayout>
  );
}
