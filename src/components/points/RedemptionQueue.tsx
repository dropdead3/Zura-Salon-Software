import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, X, User } from 'lucide-react';
import { usePendingRedemptions, useUpdateRedemptionStatus } from '@/hooks/usePoints';
import { format } from 'date-fns';

export function RedemptionQueue() {
  const { data: redemptions = [], isLoading } = usePendingRedemptions();
  const updateStatus = useUpdateRedemptionStatus();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleApprove = (redemptionId: string) => {
    updateStatus.mutate({
      redemptionId,
      status: 'approved',
      notes: notes[redemptionId],
    });
  };

  const handleDeny = (redemptionId: string) => {
    updateStatus.mutate({
      redemptionId,
      status: 'denied',
      notes: notes[redemptionId],
    });
  };

  const handleFulfill = (redemptionId: string) => {
    updateStatus.mutate({
      redemptionId,
      status: 'fulfilled',
      notes: notes[redemptionId],
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (redemptions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
        <p className="text-muted-foreground">No pending redemptions!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {redemptions.map((redemption) => (
        <Card key={redemption.id} className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">
                  {redemption.reward?.name || 'Unknown Reward'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(redemption.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            <Badge variant="secondary">
              {redemption.points_spent.toLocaleString()} pts
            </Badge>
          </div>

          {redemption.reward?.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {redemption.reward.description}
            </p>
          )}

          <div className="space-y-3">
            <Textarea
              placeholder="Add notes (optional)..."
              value={notes[redemption.id] || ''}
              onChange={(e) =>
                setNotes((prev) => ({ ...prev, [redemption.id]: e.target.value }))
              }
              className="min-h-[60px]"
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleApprove(redemption.id)}
                disabled={updateStatus.isPending}
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleFulfill(redemption.id)}
                disabled={updateStatus.isPending}
              >
                <Check className="w-4 h-4 mr-1" />
                Fulfill
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeny(redemption.id)}
                disabled={updateStatus.isPending}
              >
                <X className="w-4 h-4 mr-1" />
                Deny
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
