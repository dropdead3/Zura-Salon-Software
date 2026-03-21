import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarClock, Check, X, Loader2, ArrowRight, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { usePendingScheduleChangeRequests, useReviewScheduleChangeRequest } from '@/hooks/useLocationSchedules';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { useLocations } from '@/hooks/useLocations';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ScheduleRequests() {
  const { formatDate } = useFormatDate();
  const { data: pendingRequests, isLoading: pendingLoading } = usePendingScheduleChangeRequests();
  const { data: teamMembers } = useTeamDirectory();
  const { data: locations } = useLocations();
  const reviewRequest = useReviewScheduleChangeRequest();

  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'deny' | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  // Fetch all requests for stats and reviewed tab
  const { data: allRequests } = useQuery({
    queryKey: ['all-schedule-change-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_change_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

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

  // Calculate stats
  const stats = {
    pending: allRequests?.filter(r => r.status === 'pending').length || 0,
    approved: allRequests?.filter(r => r.status === 'approved').length || 0,
    denied: allRequests?.filter(r => r.status === 'denied').length || 0,
  };

  const reviewedRequests = allRequests?.filter(r => r.status !== 'pending') || [];
  const currentRequest = pendingRequests?.find(r => r.id === selectedRequest) || 
                         allRequests?.find(r => r.id === selectedRequest);
  const currentMember = currentRequest ? getTeamMember(currentRequest.user_id) : null;
  const currentLocation = currentRequest ? getLocation(currentRequest.location_id) : null;

  const renderRequestCard = (request: any, showActions: boolean = true) => {
    const member = getTeamMember(request.user_id);
    const location = getLocation(request.location_id);

    return (
      <Card key={request.id} className="overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            {/* Employee Info */}
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={member?.photo_url || undefined} />
                <AvatarFallback>
                  {(member?.display_name || member?.full_name || '?')[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {member?.display_name || member?.full_name || 'Unknown'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {location?.name || 'Unknown location'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Submitted {formatDate(new Date(request.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* Status badge for reviewed requests */}
            {!showActions && (
              <Badge 
                variant={request.status === 'approved' ? 'default' : 'destructive'}
                className="shrink-0"
              >
                {request.status === 'approved' ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</>
                ) : (
                  <><XCircle className="w-3 h-3 mr-1" /> Denied</>
                )}
              </Badge>
            )}
          </div>

          {/* Schedule comparison */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Current</p>
                <div className="flex flex-wrap gap-1">
                  {DAYS_OF_WEEK.map(day => (
                    <Badge
                      key={day}
                      variant={request.current_days?.includes(day) ? 'default' : 'outline'}
                      className={cn(
                        "text-xs",
                        !request.current_days?.includes(day) && "opacity-40"
                      )}
                    >
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Requested</p>
                <div className="flex flex-wrap gap-1">
                  {DAYS_OF_WEEK.map(day => (
                    <Badge
                      key={day}
                      variant={request.requested_days?.includes(day) ? 'default' : 'outline'}
                      className={cn(
                        "text-xs",
                        !request.requested_days?.includes(day) && "opacity-40"
                      )}
                    >
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Reason */}
          {request.reason && (
            <div className="mt-3 p-3 bg-muted/20 rounded-lg">
              <p className="text-sm text-muted-foreground italic">"{request.reason}"</p>
            </div>
          )}

          {/* Review notes for reviewed requests */}
          {request.review_notes && (
            <div className="mt-3 p-3 border-l-2 border-muted">
              <p className="text-xs text-muted-foreground mb-1">Review Notes:</p>
              <p className="text-sm">{request.review_notes}</p>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="mt-4 flex gap-2 justify-end">
              <Button
                size={tokens.button.card}
                variant="destructive"
                onClick={() => {
                  setSelectedRequest(request.id);
                  setReviewAction('deny');
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Deny
              </Button>
              <Button
                size={tokens.button.card}
                variant="default"
                onClick={() => {
                  setSelectedRequest(request.id);
                  setReviewAction('approve');
                }}
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardPageHeader
          title="Schedule Change Requests"
          description="Review and manage employee schedule change requests"
        />

        {/* Stats */}
        <div className="grid gap-4 grid-cols-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-display font-medium text-chart-4">
                {stats.pending}
              </div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-display font-medium text-chart-2">
                {stats.approved}
              </div>
              <p className="text-sm text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-display font-medium text-destructive">
                {stats.denied}
              </div>
              <p className="text-sm text-muted-foreground">Denied</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              {stats.pending > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {stats.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pendingLoading ? (
              <DashboardLoader size="md" className="py-12" />
            ) : !pendingRequests || pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">No pending requests</p>
                  <p className="text-sm text-muted-foreground">All schedule change requests have been reviewed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingRequests.map(request => renderRequestCard(request, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviewed" className="mt-4">
            {reviewedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No reviewed requests yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {reviewedRequests.map(request => renderRequestCard(request, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

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
                        variant={currentRequest.current_days?.includes(day) ? 'default' : 'outline'}
                        className={cn(
                          "text-xs",
                          !currentRequest.current_days?.includes(day) && "opacity-40"
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
                        variant={currentRequest.requested_days?.includes(day) ? 'default' : 'outline'}
                        className={cn(
                          "text-xs",
                          !currentRequest.requested_days?.includes(day) && "opacity-40"
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
    </DashboardLayout>
  );
}
