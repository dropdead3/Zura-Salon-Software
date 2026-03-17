import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  Clock, 
  XCircle, 
  Loader2,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useMeetingRequests, useUpdateMeetingRequestStatus, type MeetingRequest } from '@/hooks/useMeetingRequests';
import { useAuth } from '@/contexts/AuthContext';
import { parseISO, isPast } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';

interface Props {
  viewAs: 'manager' | 'team_member';
}

export function PendingMeetingRequests({ viewAs }: Props) {
  const { formatDate } = useFormatDate();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: requests = [], isLoading } = useMeetingRequests();
  const updateStatus = useUpdateMeetingRequestStatus();

  // Filter based on role perspective
  const filteredRequests = requests.filter(r => {
    if (viewAs === 'manager') {
      return r.manager_id === user?.id;
    }
    return r.team_member_id === user?.id;
  });

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const otherRequests = filteredRequests.filter(r => r.status !== 'pending');

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-chart-4 text-foreground dark:text-background">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'scheduled':
        return <Badge className="bg-chart-2 text-foreground dark:text-background">Scheduled</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'expired':
        return <Badge variant="outline">Expired</Badge>;
      default:
        return null;
    }
  };

  const handleCancel = (requestId: string) => {
    updateStatus.mutate({ id: requestId, status: 'cancelled' });
  };

  const handleSchedule = (request: MeetingRequest) => {
    // Navigate to schedule tab with pre-selected coach
    navigate(`/dashboard/schedule-meeting?tab=schedule&coach=${request.manager_id}&request=${request.id}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const RequestCard = ({ request, showActions = false }: { request: MeetingRequest; showActions?: boolean }) => {
    const isExpired = request.expires_at && isPast(parseISO(request.expires_at));
    const person = viewAs === 'manager' ? request.team_member : request.manager;

    return (
      <Card className={request.status === 'pending' && isExpired ? 'border-destructive/50' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={person?.photo_url || ''} />
              <AvatarFallback>
                {(person?.full_name || 'U').charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">
                  {viewAs === 'manager' 
                    ? `To: ${person?.display_name || person?.full_name || 'Unknown'}`
                    : `From: ${person?.display_name || person?.full_name || 'Unknown'}`
                  }
                </span>
                {getPriorityBadge(request.priority)}
                {getStatusBadge(request.status)}
              </div>

              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{request.reason}</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Sent {formatDate(parseISO(request.created_at), 'MMM d, yyyy')}</span>
                </div>
                {request.expires_at && (
                  <div className={`flex items-center gap-1 ${isExpired ? 'text-destructive' : ''}`}>
                    <Calendar className="h-3 w-3" />
                    <span>
                      {isExpired ? 'Expired' : `Schedule by ${formatDate(parseISO(request.expires_at), 'MMM d')}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {showActions && request.status === 'pending' && (
              <div className="flex flex-col gap-2">
                {viewAs === 'team_member' && (
                  <Button
                    size={tokens.button.card}
                    onClick={() => handleSchedule(request)}
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Schedule
                  </Button>
                )}
                <Button
                  size={tokens.button.card}
                  variant="outline"
                  onClick={() => handleCancel(request.id)}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {viewAs === 'manager' ? 'Cancel' : 'Decline'}
                </Button>
              </div>
            )}

            {request.status === 'scheduled' && request.linked_meeting_id && (
              <Button
                size={tokens.button.inline}
                variant="ghost"
                onClick={() => navigate(`/dashboard/meeting/${request.linked_meeting_id}`)}
              >
                View Meeting
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            {viewAs === 'manager' ? 'Awaiting Response' : 'Action Required'}
          </h3>
          {pendingRequests.map(request => (
            <RequestCard key={request.id} request={request} showActions />
          ))}
        </div>
      )}

      {/* Other Requests */}
      {otherRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Previous Requests
          </h3>
          {otherRequests.map(request => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {viewAs === 'manager' 
              ? "No meeting requests sent yet."
              : "No meeting requests from managers."
            }
          </CardContent>
        </Card>
      )}
    </div>
  );
}
