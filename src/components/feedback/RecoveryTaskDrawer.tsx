import { useEffect, useState } from 'react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, AlertTriangle, X, UserCircle2, Clock, BellOff } from 'lucide-react';
import {
  RecoveryTaskWithFeedback, RecoveryStatus, STATUS_LABELS,
  useUpdateRecoveryTask, useSnoozeRecoveryTask, useUnsnoozeRecoveryTask, isSnoozed,
} from '@/hooks/useRecoveryTasks';
import { useOrgAssignees, assigneeLabel } from '@/hooks/useOrgAssignees';
import { SendReviewRequestButton } from './SendReviewRequestButton';
import { AIRecoveryDraftButton } from './AIRecoveryDraftButton';
import { CoachingNoteComposer } from './CoachingNoteComposer';
import { format, formatDistanceToNow } from 'date-fns';

interface Props {
  task: RecoveryTaskWithFeedback | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: RecoveryStatus[] = ['new', 'contacted', 'resolved', 'refunded', 'redo_booked', 'closed'];
const UNASSIGNED = '__unassigned__';

const SNOOZE_PRESETS: { hours: number; label: string }[] = [
  { hours: 4, label: '4 hours' },
  { hours: 24, label: 'Tomorrow' },
  { hours: 24 * 3, label: '3 days' },
  { hours: 24 * 7, label: 'Next week' },
];

export function RecoveryTaskDrawer({ task, open, onClose }: Props) {
  const update = useUpdateRecoveryTask();
  const snooze = useSnoozeRecoveryTask();
  const unsnooze = useUnsnoozeRecoveryTask();
  const { data: assignees = [] } = useOrgAssignees();
  const [notes, setNotes] = useState(task?.resolution_notes ?? '');
  const [status, setStatus] = useState<RecoveryStatus>(task?.status ?? 'new');
  const [assignedTo, setAssignedTo] = useState<string>(task?.assigned_to ?? UNASSIGNED);
  const [snoozeReason, setSnoozeReason] = useState('');

  // Reset on task change (effect, not render-phase setState)
  useEffect(() => {
    if (!task) return;
    setNotes(task.resolution_notes ?? '');
    setStatus(task.status);
    setAssignedTo(task.assigned_to ?? UNASSIGNED);
    setSnoozeReason('');
  }, [task?.id]);

  if (!task) return null;
  const fb = task.feedback;
  const snoozed = isSnoozed(task);

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
          {snoozed && task.snoozed_until && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <BellOff className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1 min-w-0">
                <p className="text-xs font-medium">
                  Snoozed until {format(new Date(task.snoozed_until), 'MMM d · h:mm a')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Re-surfaces in {formatDistanceToNow(new Date(task.snoozed_until))}.
                  {task.snooze_reason ? ` Reason: "${task.snooze_reason}"` : ''}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => unsnooze.mutate(task.id)}
                disabled={unsnooze.isPending}
              >
                Resume now
              </Button>
            </div>
          )}

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
            <Label className="flex items-center gap-1.5">
              <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
              Assigned to
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>
                  <span className="text-muted-foreground">Unassigned</span>
                </SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {assigneeLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Owner of this recovery — they'll see it in their queue and SLA clock applies.
            </p>
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

          {!snoozed && task.status !== 'resolved' && task.status !== 'closed' && (
            <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Snooze
              </Label>
              <p className="text-xs text-muted-foreground">
                Park this task and re-surface it later. Useful when you've left a voicemail and are awaiting a callback.
              </p>
              <Textarea
                value={snoozeReason}
                onChange={(e) => setSnoozeReason(e.target.value)}
                placeholder="Optional reason (e.g. Left voicemail, awaiting callback)"
                rows={2}
                className="text-xs"
              />
              <div className="flex flex-wrap gap-2">
                {SNOOZE_PRESETS.map((p) => (
                  <Button
                    key={p.hours}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    disabled={snooze.isPending}
                    onClick={() => snooze.mutate({ id: task.id, hours: p.hours, reason: snoozeReason || null })}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

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

          {task.staff_user_id && (
            <CoachingNoteComposer
              stylistUserId={task.staff_user_id}
              feedbackResponseId={task.feedback_response_id}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-6 border-t border-border/40">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={async () => {
              await update.mutateAsync({
                id: task.id,
                status,
                resolution_notes: notes || null,
                assigned_to: assignedTo === UNASSIGNED ? null : assignedTo,
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
