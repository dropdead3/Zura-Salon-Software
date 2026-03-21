import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Shield, RotateCcw, Calendar, Loader2, CheckCircle } from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import type { PassUsageRecord } from '@/hooks/usePassHistory';

interface PassHistoryCardProps {
  history: (PassUsageRecord & { user_name?: string })[];
  loading: boolean;
  showUserName?: boolean;
  onRestore?: (passId: string, reason: string) => Promise<boolean>;
  adminUserId?: string;
}

export function PassHistoryCard({
  history,
  loading,
  showUserName = false,
  onRestore,
  adminUserId,
}: PassHistoryCardProps) {
  const { formatDate } = useFormatDate();
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);
  const [restoreReason, setRestoreReason] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    if (!selectedPassId || !onRestore || !restoreReason.trim()) return;

    setIsRestoring(true);
    const success = await onRestore(selectedPassId, restoreReason);
    setIsRestoring(false);

    if (success) {
      setRestoreDialogOpen(false);
      setSelectedPassId(null);
      setRestoreReason('');
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading pass history...</span>
        </div>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span className="text-sm">No Life Happens Passes used yet</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Life Happens Pass History
          </h3>
        </div>
        <div className="divide-y">
          {history.map((record) => (
            <div key={record.id} className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                {showUserName && (
                  <p className="font-medium text-sm">{record.user_name}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(new Date(record.used_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
                <p className="text-sm">
                  Used on Day {record.current_day_at_use} (missed Day {record.day_missed})
                </p>
                {record.restored_at && (
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 mt-1">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Restored
                  </Badge>
                )}
                {record.restore_reason && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Reason: {record.restore_reason}
                  </p>
                )}
              </div>
              {onRestore && adminUserId && !record.restored_at && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPassId(record.id);
                    setRestoreDialogOpen(true);
                  }}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restore
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Life Happens Pass</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will restore one Life Happens Pass to the participant's account. Please provide a reason for this restoration.
            </p>
            <div className="space-y-2">
              <Label htmlFor="restore-reason">Reason for restoration</Label>
              <Input
                id="restore-reason"
                placeholder="e.g., Technical issue, Extenuating circumstances"
                value={restoreReason}
                onChange={(e) => setRestoreReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
              disabled={isRestoring}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestore}
              disabled={!restoreReason.trim() || isRestoring}
            >
              {isRestoring ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Restore Pass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
