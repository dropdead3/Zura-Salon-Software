import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check, X, Loader2, Clock, Gift, MessageSquare } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { usePendingRedemptions, useUpdateRedemptionStatus } from '@/hooks/usePoints';
import { format } from 'date-fns';

export function RedemptionApprovalsTab() {
  const { data: pendingRedemptions = [], isLoading } = usePendingRedemptions();
  const updateStatus = useUpdateRedemptionStatus();
  
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedRedemption, setSelectedRedemption] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [pendingAction, setPendingAction] = useState<'approved' | 'fulfilled' | 'denied' | null>(null);

  const handleAction = (redemption: any, action: 'approved' | 'fulfilled' | 'denied') => {
    setSelectedRedemption(redemption);
    setPendingAction(action);
    setNotes('');
    
    if (action === 'denied') {
      setNotesDialogOpen(true);
    } else {
      processAction(redemption.id, action, '');
    }
  };

  const processAction = async (redemptionId: string, status: 'approved' | 'fulfilled' | 'denied', note: string) => {
    try {
      await updateStatus.mutateAsync({
        redemptionId,
        status,
        notes: note || undefined,
      });
    } catch (error) {
      console.error('Failed to update redemption:', error);
    } finally {
      setNotesDialogOpen(false);
      setSelectedRedemption(null);
      setPendingAction(null);
    }
  };

  const confirmDenial = () => {
    if (selectedRedemption && pendingAction) {
      processAction(selectedRedemption.id, pendingAction, notes);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pendingRedemptions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Check className="w-12 h-12 mx-auto text-green-500 mb-4" />
          <h3 className="font-display text-lg mb-2">ALL CAUGHT UP</h3>
          <p className="text-muted-foreground text-sm">
            No pending redemptions to review. Check back later!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <CardTitle className="font-display text-lg">PENDING APPROVALS</CardTitle>
            </div>
            <Badge variant="secondary">
              {pendingRedemptions.length} pending
            </Badge>
          </div>
          <CardDescription>
            Review and approve reward redemption requests from your team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRedemptions.map((redemption) => (
            <Card key={redemption.id} className="border-dashed">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs">
                        {redemption.user_id?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Gift className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">
                          {redemption.reward?.name || 'Unknown Reward'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requested {format(new Date(redemption.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {redemption.points_spent} points
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size={tokens.button.card}
                      variant="outline"
                      onClick={() => handleAction(redemption, 'denied')}
                      disabled={updateStatus.isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Deny
                    </Button>
                    <Button
                      size={tokens.button.card}
                      onClick={() => handleAction(redemption, 'approved')}
                      disabled={updateStatus.isPending}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size={tokens.button.card}
                      variant="secondary"
                      onClick={() => handleAction(redemption, 'fulfilled')}
                      disabled={updateStatus.isPending}
                    >
                      <Gift className="w-4 h-4 mr-1" />
                      Fulfill
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Denial Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">DENY REDEMPTION</DialogTitle>
            <DialogDescription>
              Please provide a reason for denying this redemption request.
              This will be visible to the team member.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Gift className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">{selectedRedemption?.reward?.name}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Reason (optional)</span>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Reward is temporarily unavailable..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDenial}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Denial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
