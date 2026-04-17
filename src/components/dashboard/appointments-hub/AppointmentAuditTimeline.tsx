import { useAuditLog, type AuditLogEntry } from '@/hooks/useAppointmentAuditLog';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Calendar, Clock, CheckCircle, XCircle, AlertTriangle, UserCheck,
  ArrowRightLeft, RotateCcw, MessageSquare, Edit, Plus, Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const EVENT_ICONS: Record<string, React.ElementType> = {
  created: Plus,
  status_changed: CheckCircle,
  rescheduled: ArrowRightLeft,
  edited: Edit,
  redo_flagged: RotateCcw,
  redo_approved: CheckCircle,
  redo_declined: XCircle,
  checked_in: UserCheck,
  completed: CheckCircle,
  cancelled: XCircle,
  no_show: AlertTriangle,
  note_added: MessageSquare,
  rebook_declined: XCircle,
  rebook_completed_at_checkout: CheckCircle,
};

const EVENT_LABELS: Record<string, string> = {
  created: 'Appointment Created',
  status_changed: 'Status Changed',
  rescheduled: 'Rescheduled',
  edited: 'Edited',
  redo_flagged: 'Redo Flagged',
  redo_approved: 'Redo Approved',
  redo_declined: 'Redo Declined',
  checked_in: 'Checked In',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  note_added: 'Note Added',
  rebook_declined: 'Rebook Declined',
  rebook_completed_at_checkout: 'Rebooked at Checkout',
};

function formatChange(entry: AuditLogEntry): string | null {
  if (entry.event_type === 'rescheduled' && entry.previous_value && entry.new_value) {
    const from = `${entry.previous_value.date || ''} ${entry.previous_value.time || ''}`.trim();
    const to = `${entry.new_value.date || ''} ${entry.new_value.time || ''}`.trim();
    if (from && to) return `${from} → ${to}`;
  }
  if (entry.event_type === 'status_changed' && entry.previous_value && entry.new_value) {
    return `${entry.previous_value.status || '?'} → ${entry.new_value.status || '?'}`;
  }
  if (entry.event_type === 'rebook_declined' && entry.metadata) {
    const label = (entry.metadata as any).reason_label || (entry.metadata as any).reason_code;
    const notes = (entry.metadata as any).reason_notes;
    if (label) return notes ? `${label} — ${notes}` : String(label);
  }
  return null;
}

export function AppointmentAuditTimeline({ appointmentId }: { appointmentId: string | null }) {
  const { data: entries = [], isLoading } = useAuditLog(appointmentId);

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <Clock className={tokens.empty.icon} />
        <p className={tokens.empty.description}>No audit history yet</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-4 py-2">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
      
      {entries.map((entry) => {
        const Icon = EVENT_ICONS[entry.event_type] || Clock;
        const label = EVENT_LABELS[entry.event_type] || entry.event_type;
        const change = formatChange(entry);

        return (
          <div key={entry.id} className="relative flex gap-3">
            {/* Dot */}
            <div className="absolute -left-6 top-0.5 w-[22px] h-[22px] rounded-full bg-muted flex items-center justify-center border border-border">
              <Icon className="w-3 h-3 text-muted-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className={cn(tokens.body.emphasis, 'text-xs')}>{label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {format(parseISO(entry.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              {entry.actor_name && (
                <p className="text-xs text-muted-foreground">by {entry.actor_name}</p>
              )}
              {change && (
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{change}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
