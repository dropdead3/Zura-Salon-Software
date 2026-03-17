import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, User, ExternalLink, XCircle, Loader2 } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useAuth } from '@/contexts/AuthContext';
import { useOneOnOneMeetings, useUpdateMeetingStatus } from '@/hooks/useOneOnOneMeetings';
import { format, parseISO } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';

const meetingTypes = [
  { value: 'coaching', label: 'Coaching Session' },
  { value: 'check_in', label: 'Check-in' },
  { value: 'feedback', label: 'Feedback Review' },
  { value: 'sas', label: 'Success Alignment Session (SAS)' },
  { value: 'other', label: 'Other' },
];

export default function MyMeetings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: meetings = [], isLoading } = useOneOnOneMeetings();
  const updateStatus = useUpdateMeetingStatus();

  const myMeetings = meetings.filter(m => m.requester_id === user?.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-600">Confirmed</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <PlatformPageContainer>
        <div className="space-y-6">
          <div>
            <Link to="/dashboard/schedule-meeting">
              <Button variant="ghost" size={tokens.button.card} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Meetings Hub
              </Button>
            </Link>
             <h1 className={tokens.heading.page}>My Meetings</h1>
             <p className={cn(tokens.body.muted, "mt-1")}>
               View your scheduled and past meetings.
             </p>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-8">
                  <DashboardLoader size="md" />
                </CardContent>
              </Card>
             ) : myMeetings.length === 0 ? (
               <EmptyState
                 icon={Calendar}
                 title="No meetings scheduled"
                 description="Request a meeting to get started"
                 action={
                   <Link to="/dashboard/schedule-meeting/new">
                     <Button size={tokens.button.card}>Request a meeting</Button>
                   </Link>
                 }
               />
            ) : (
              myMeetings.map(meeting => (
                <Card 
                  key={meeting.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors" 
                  onClick={() => navigate(`/dashboard/meeting/${meeting.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                         <span className={tokens.body.emphasis}>
                             {format(parseISO(meeting.meeting_date), 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {meeting.start_time.slice(0, 5)} - {meeting.end_time.slice(0, 5)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            Coach: {meeting.coach?.display_name || meeting.coach?.full_name || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {meetingTypes.find(t => t.value === meeting.meeting_type)?.label || meeting.meeting_type}
                          </Badge>
                          {getStatusBadge(meeting.status)}
                        </div>
                        {meeting.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{meeting.notes}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 items-end">
                        <Button
                          size={tokens.button.inline}
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/meeting/${meeting.id}`); }}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                        
                        {meeting.status === 'pending' && meeting.requester_id === user?.id && (
                          <Button
                            size={tokens.button.inline}
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: meeting.id, status: 'cancelled' }); }}
                            disabled={updateStatus.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </PlatformPageContainer>
    </DashboardLayout>
  );
}
