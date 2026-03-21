import { useMemo } from 'react';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { History, CheckCircle2, XCircle, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAssistantRequests, type AssistantRequest } from '@/hooks/useAssistantRequests';
import { cn } from '@/lib/utils';

interface AssistantRequestHistoryCardProps {
  userId: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

export function AssistantRequestHistoryCard({ userId }: AssistantRequestHistoryCardProps) {
  const { formatDate } = useFormatDate();
  const { data: allRequests = [], isLoading } = useAssistantRequests('all');

  // Filter requests related to this user (as assistant or declined by)
  const userRequests = useMemo(() => {
    return allRequests
      .filter(r => 
        r.assistant_id === userId || 
        r.declined_by?.includes(userId)
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);
  }, [allRequests, userId]);

  // Calculate stats
  const stats = useMemo(() => {
    const assigned = userRequests.filter(r => r.assistant_id === userId);
    const accepted = assigned.filter(r => r.accepted_at);
    const completed = assigned.filter(r => r.status === 'completed');
    const declined = allRequests.filter(r => r.declined_by?.includes(userId)).length;
    
    const responseTimes = assigned
      .filter(r => r.response_time_seconds != null)
      .map(r => r.response_time_seconds as number);
    const avgResponse = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

    return {
      total: assigned.length,
      accepted: accepted.length,
      completed: completed.length,
      declined,
      avgResponseSeconds: avgResponse,
    };
  }, [userRequests, allRequests, userId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Request History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Assistant Request History
        </CardTitle>
        <CardDescription>Recent assistant assignments and responses</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-medium">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Assigned</div>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <div className="text-lg font-medium text-green-600">{stats.accepted}</div>
            <div className="text-xs text-muted-foreground">Accepted</div>
          </div>
          <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <div className="text-lg font-medium text-red-600">{stats.declined}</div>
            <div className="text-xs text-muted-foreground">Declined</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-medium">{formatDuration(stats.avgResponseSeconds)}</div>
            <div className="text-xs text-muted-foreground">Avg Response</div>
          </div>
        </div>

        {/* Request History List */}
        <ScrollArea className="h-[300px]">
          {userRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No request history</p>
          ) : (
            <div className="space-y-2">
              {userRequests.map(request => {
                const wasAssigned = request.assistant_id === userId;
                const didDecline = request.declined_by?.includes(userId);
                const wasAccepted = wasAssigned && request.accepted_at;
                const wasCompleted = request.status === 'completed';
                
                return (
                  <div 
                    key={request.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      didDecline && !wasAssigned && "bg-red-50/50 dark:bg-red-950/20 border-red-200",
                      wasCompleted && "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200",
                      wasAccepted && !wasCompleted && "bg-green-50/50 dark:bg-green-950/20 border-green-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {request.client_name}
                          </span>
                          {wasCompleted && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Completed</Badge>
                          )}
                          {wasAccepted && !wasCompleted && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Accepted</Badge>
                          )}
                          {didDecline && !wasAssigned && (
                            <Badge variant="destructive" className="text-xs">Declined</Badge>
                          )}
                          {wasAssigned && !wasAccepted && request.status === 'assigned' && (
                            <Badge className="bg-amber-100 text-amber-800 text-xs">Pending</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{formatDate(parseISO(request.request_date), 'MMM d, yyyy')}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {request.start_time.slice(0, 5)}
                          </span>
                          {request.locations?.name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {request.locations.name}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {request.salon_services?.name}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {wasCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-blue-500" />
                        ) : wasAccepted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : didDecline ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                    </div>
                    
                    {wasAssigned && request.response_time_seconds && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Response time: {formatDuration(request.response_time_seconds)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
