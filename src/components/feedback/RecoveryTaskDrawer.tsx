import { useState } from 'react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, AlertTriangle, X } from 'lucide-react';
import {
  RecoveryTaskWithFeedback, RecoveryStatus, STATUS_LABELS,
  useUpdateRecoveryTask,
} from '@/hooks/useRecoveryTasks';
import { SendReviewRequestButton } from './SendReviewRequestButton';
import { AIRecoveryDraftButton } from './AIRecoveryDraftButton';
import { format } from 'date-fns';

interface Props {
  task: RecoveryTaskWithFeedback | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: RecoveryStatus[] = ['new', 'contacted', 'resolved', 'refunded', 'redo_booked', 'closed'];

export function RecoveryTaskDrawer({ task, open, onClose }: Props) {
  const update = useUpdateRecoveryTask();
  const [notes, setNotes] = useState(task?.resolution_notes ?? '');
  const [status, setStatus] = useState<RecoveryStatus>(task?.status ?? 'new');

  // Reset on task change
  if (task && (task.id !== (window as Window & { __lastTaskId?: string }).__lastTaskId)) {
    (window as Window & { __lastTaskId?: string }).__lastTaskId = task.id;
    setNotes(task.resolution_notes ?? '');
    setStatus(task.status);
  }

  if (!task) return null;
  const fb = task.feedback;

  const priorityColor = task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'default' : 'secondary';

  return (
    <PremiumFloatingPanel open={open} onOpenChange={(o) => !o && onClose()} showCloseButton={false}>
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-border/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="font-display text-lg tracking-wide">Recovery Task</h2>
              <Badge variant={priorityColor as 'default' | 'destructive' | 'secondary'}>{task.priority}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Opened {format(new Date(task.created_at), 'MMM d, yyyy · h:mm a')}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {fb && (
            <div className="space-y-3 rounded-xl border border-border/60 bg-card/50 p-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Client Feedback</span>
                <div className="flex items-center gap-1 ml-auto">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${(fb.overall_rating ?? 0) >= s ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                </div>
              </div>
              {fb.nps_score !== null && (
                <p className="text-xs text-muted-foreground">NPS: {fb.nps_score}/10</p>
              )}
              {fb.comments ? (
                <p className="text-sm leading-relaxed">"{fb.comments}"</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No written comments</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as RecoveryStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Resolution Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document outreach, outcome, refund/redo decisions, etc."
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Required when marking as resolved, refunded, or redo booked.
            </p>
          </div>

          {task.appointment_id && (
            <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
              <Label>Follow-up</Label>
              <p className="text-xs text-muted-foreground">
                Send a fresh feedback link if you've resolved the issue and want to re-measure satisfaction.
                Frequency cap and SMS opt-out are enforced automatically.
              </p>
              <SendReviewRequestButton
                appointmentId={task.appointment_id}
                variant="outline"
                size="sm"
                className="gap-2"
              />
            </div>
          )}

          <AIRecoveryDraftButton recoveryTaskId={task.id} />
        </div>

        <div className="flex items-center justify-end gap-2 p-6 border-t border-border/40">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={async () => {
              await update.mutateAsync({
                id: task.id,
                status,
                resolution_notes: notes || null,
              });
              onClose();
            }}
            disabled={update.isPending}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </PremiumFloatingPanel>
  );
}
