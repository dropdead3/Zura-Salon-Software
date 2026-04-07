import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Calendar, Clock, User, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { useOneOnOneMeetings, useUpdateMeetingStatus } from '@/hooks/useOneOnOneMeetings';
import { MeetingNotes } from '@/components/coaching/MeetingNotes';
import { AccountabilityItems } from '@/components/coaching/AccountabilityItems';
import { ReportBuilder } from '@/components/coaching/ReportBuilder';
import { LevelProgressCard } from '@/components/coaching/LevelProgressCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageExplainer } from '@/components/ui/PageExplainer';

const meetingTypes: Record<string, string> = {
  coaching: 'Coaching Session',
  check_in: 'Check-in',
  feedback: 'Feedback Review',
  sas: 'Success Alignment Session (SAS)',
  other: 'Other',
};

export default function MeetingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = useEffectiveRoles();
  const { formatDate } = useFormatDate();
  const isCoach = roles.includes('admin') || roles.includes('manager') || roles.includes('super_admin');
  
  const { data: meetings = [], isLoading: loadingMeetings } = useOneOnOneMeetings();
  const updateStatus = useUpdateMeetingStatus();

  const meeting = meetings.find(m => m.id === id);

  // Fetch participant profile
  const teamMemberId = meeting?.requester_id;
  const { data: teamMemberProfile } = useQuery({
    queryKey: ['employee-profile', teamMemberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url, email')
        .eq('user_id', teamMemberId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!teamMemberId,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'confirmed':
        return <Badge className="bg-primary text-primary-foreground">Confirmed</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loadingMeetings) {
    return (
      <DashboardLayout>
        <DashboardLoader size="lg" className="p-6 lg:p-8 min-h-[400px]" />
      </DashboardLayout>
    );
  }

  if (!meeting) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
          <DashboardPageHeader
            title="Meeting Details"
          />
        <PageExplainer pageId="meeting-details" />
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Meeting not found.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const isMyMeeting = meeting.coach_id === user?.id || meeting.requester_id === user?.id;
  const canManage = isCoach && meeting.coach_id === user?.id;
  const teamMemberName = teamMemberProfile?.display_name || teamMemberProfile?.full_name || 'Team Member';

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <DashboardPageHeader
          title={`1:1 with ${canManage ? teamMemberName : (meeting.coach?.display_name || meeting.coach?.full_name || 'Coach')}`}
          description={meetingTypes[meeting.meeting_type || 'other'] || meeting.meeting_type}
        />

        {/* Meeting Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={teamMemberProfile?.photo_url || ''} />
                    <AvatarFallback>
                      {(teamMemberProfile?.full_name || 'U').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">
                      1:1 with {canManage ? teamMemberName : (meeting.coach?.display_name || meeting.coach?.full_name || 'Coach')}
                    </CardTitle>
                    <p className="text-muted-foreground">
                      {meetingTypes[meeting.meeting_type || 'other'] || meeting.meeting_type}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(parseISO(meeting.meeting_date), 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{meeting.start_time.slice(0, 5)} - {meeting.end_time.slice(0, 5)}</span>
                  </div>
                  {getStatusBadge(meeting.status)}
                </div>

                {meeting.notes && (
                  <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
                    {meeting.notes}
                  </p>
                )}
              </div>

              {canManage && meeting.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateStatus.mutate({ id: meeting.id, status: 'confirmed' })}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus.mutate({ id: meeting.id, status: 'cancelled' })}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              )}

              {canManage && meeting.status === 'confirmed' && (
                <Button
                  size="sm"
                  onClick={() => updateStatus.mutate({ id: meeting.id, status: 'completed' })}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Completed
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Coaching Tools */}
        {isMyMeeting && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <MeetingNotes meetingId={meeting.id} isCoach={canManage} />
            </div>
            <div className="space-y-6">
              <AccountabilityItems 
                meetingId={meeting.id} 
                teamMemberId={meeting.requester_id}
                isCoach={canManage} 
              />
              <LevelProgressCard userId={meeting.requester_id} compact={!canManage} />
              {canManage && (
                <ReportBuilder 
                  meetingId={meeting.id}
                  teamMemberId={meeting.requester_id}
                  teamMemberName={teamMemberName}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
