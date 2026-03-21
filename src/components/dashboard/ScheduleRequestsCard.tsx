import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Check, X, Loader2, ArrowRight, Clock } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { usePendingScheduleChangeRequests, useReviewScheduleChangeRequest } from '@/hooks/useLocationSchedules';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { useLocations } from '@/hooks/useLocations';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ScheduleRequestsCard() {
  const { formatDate } = useFormatDate();
  const { data: requests, isLoading } = usePendingScheduleChangeRequests();
  const { data: teamMembers } = useTeamDirectory();
  const { data: locations } = useLocations();
  const reviewRequest = useReviewScheduleChangeRequest();

  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'deny' | null>(null);

  const handleReview = async (status: 'approved' | 'denied') => {
    if (!selectedRequest) return;
    
    await reviewRequest.mutateAsync({
      requestId: selectedRequest,
      status,
      reviewNotes,
    });

    setSelectedRequest(null);
    setReviewNotes('');
    setReviewAction(null);
  };

  const getTeamMember = (userId: string) => 
    teamMembers?.find(m => m.user_id === userId);

  const getLocation = (locationId: string) =>
    locations?.find(l => l.id === locationId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <DashboardLoader size="sm" />
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Change Requests
          </CardTitle>
          <CardDescription>No pending schedule change requests</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentRequest = requests.find(r => r.id === selectedRequest);
  const currentMember = currentRequest ? getTeamMember(currentRequest.user_id) : null;
  const currentLocation = currentRequest ? getLocation(currentRequest.location_id) : null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule Change Requests
              </CardTitle>
              <CardDescription>
                {requests.length} pending request{requests.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Badge variant="secondary">{requests.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.slice(0, 5).map((request) => {
            const member = getTeamMember(request.user_id);
            const location = getLocation(request.location_id);

            return (
              <div 
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member?.photo_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(member?.display_name || member?.full_name || '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {member?.display_name || member?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {location?.name || 'Unknown location'} • {formatDate(new Date(request.created_at), 'MMM d')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size={tokens.button.inline}
                    variant="ghost"
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => {
                      setSelectedRequest(request.id);
                      setReviewAction('approve');
                    }}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size={tokens.button.inline}
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setSelectedRequest(request.id);
                      setReviewAction('deny');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog 
        open={!!selectedRequest && !!reviewAction} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
            setReviewAction(null);
            setReviewNotes('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Deny'} Schedule Change
            </DialogTitle>
            <DialogDescription>
              Review {currentMember?.display_name || currentMember?.full_name}'s schedule change request for {currentLocation?.name}
            </DialogDescription>
          </DialogHeader>

          {currentRequest && (
            <div className="space-y-4 py-4">
              {/* Schedule comparison */}
              <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Current</p>
                  <div className="flex flex-wrap gap-1">
                    {DAYS_OF_WEEK.map(day => (
                      <Badge
                        key={day}
                        variant={currentRequest.current_days.includes(day) ? 'default' : 'outline'}
                        className={cn(
                          "text-xs",
                          !currentRequest.current_days.includes(day) && "opacity-40"
                        )}
                      >
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Requested</p>
                  <div className="flex flex-wrap gap-1">
                    {DAYS_OF_WEEK.map(day => (
                      <Badge
                        key={day}
                        variant={currentRequest.requested_days.includes(day) ? 'default' : 'outline'}
                        className={cn(
                          "text-xs",
                          !currentRequest.requested_days.includes(day) && "opacity-40"
                        )}
                      >
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reason */}
              {currentRequest.reason && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm">{currentRequest.reason}</p>
                </div>
              )}

              {/* Review notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about your decision..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedRequest(null);
              setReviewAction(null);
              setReviewNotes('');
            }}>
              Cancel
            </Button>
            <Button
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
              onClick={() => handleReview(reviewAction === 'approve' ? 'approved' : 'denied')}
              disabled={reviewRequest.isPending}
            >
              {reviewRequest.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : reviewAction === 'approve' ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Deny
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
