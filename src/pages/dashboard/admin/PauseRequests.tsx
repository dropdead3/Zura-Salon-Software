import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAllPauseRequests } from '@/hooks/usePauseRequests';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Pause,
  Calendar,
  User,
  Clock,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function PauseRequests() {
  const { user } = useAuth();
  const { requests, loading, reviewRequest } = useAllPauseRequests();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [pauseDays, setPauseDays] = useState(7);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReview = async (decision: 'approved' | 'denied') => {
    if (!selectedRequest || !user) return;
    
    setIsProcessing(true);
    await reviewRequest(
      selectedRequest,
      decision,
      user.id,
      reviewNotes || undefined,
      decision === 'approved' ? pauseDays : undefined
    );
    setIsProcessing(false);
    setSelectedRequest(null);
    setReviewNotes('');
    setPauseDays(7);
  };

  const selectedRequestData = requests.find(r => r.id === selectedRequest);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl mb-2">Pause Requests</h1>
          <p className="text-muted-foreground font-sans">
            Review and manage emergency pause requests from program participants.
          </p>
        </div>

        {requests.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Pause className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg mb-2">No Pending Requests</h3>
            <p className="text-sm text-muted-foreground">
              There are no pause requests waiting for review.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium">{request.user_name}</h3>
                        <p className="text-sm text-muted-foreground">{request.user_email}</p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        Day {request.current_day || '?'}
                      </Badge>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm font-medium mb-1">Reason for pause:</p>
                      <p className="text-sm text-muted-foreground">{request.reason}</p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Requested {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>Requesting {request.requested_duration_days} days</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request.id);
                        setPauseDays(request.requested_duration_days);
                      }}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Pause Request</DialogTitle>
            </DialogHeader>

            {selectedRequestData && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-1">From: {selectedRequestData.user_name}</p>
                  <p className="text-sm text-muted-foreground">Day {selectedRequestData.current_day} of the program</p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-1">Reason:</p>
                  <p className="text-sm text-muted-foreground">{selectedRequestData.reason}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pauseDays">Pause Duration (days)</Label>
                  <Input
                    id="pauseDays"
                    type="number"
                    min={1}
                    max={30}
                    value={pauseDays}
                    onChange={(e) => setPauseDays(parseInt(e.target.value) || 7)}
                  />
                  <p className="text-xs text-muted-foreground">
                    They requested {selectedRequestData.requested_duration_days} days
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes about your decision..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Approving will pause their program and preserve their progress.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => handleReview('denied')}
                disabled={isProcessing}
                className="text-destructive hover:text-destructive"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />}
                Deny
              </Button>
              <Button
                onClick={() => handleReview('approved')}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Approve Pause
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
