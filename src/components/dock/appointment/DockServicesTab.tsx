/**
 * DockServicesTab — Bowl cards grid + "Add Bowl" action for the appointment.
 * Queries mix sessions for this appointment and displays bowl status.
 */

import { Plus, FlaskConical, Loader2, Circle, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DockStaffSession } from '@/pages/Dock';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { useDockMixSessions, type DockMixSession } from '@/hooks/dock/useDockMixSessions';
import { normalizeSessionStatus, isTerminalSessionStatus, isActiveSession, requiresReweigh } from '@/lib/backroom/session-state-machine';

interface DockServicesTabProps {
  appointment: DockAppointment;
  staff: DockStaffSession;
}

function getStatusDisplay(status: string) {
  const normalized = normalizeSessionStatus(status as any);
  if (normalized === 'completed') return { icon: CheckCircle2, label: 'Completed', color: 'text-emerald-400' };
  if (isActiveSession(normalized)) return { icon: FlaskConical, label: 'Mixing', color: 'text-violet-400' };
  if (requiresReweigh(normalized)) return { icon: AlertCircle, label: 'Reweigh', color: 'text-amber-400' };
  if (normalized === 'cancelled') return { icon: Circle, label: 'Cancelled', color: 'text-[hsl(var(--platform-foreground-muted)/0.4)]' };
  if (normalized === 'unresolved_exception') return { icon: AlertCircle, label: 'Exception', color: 'text-red-400' };
  if (normalized === 'awaiting_stylist_approval') return { icon: AlertCircle, label: 'Approval', color: 'text-amber-400' };
  return { icon: Circle, label: 'Draft', color: 'text-blue-400' };
}

export function DockServicesTab({ appointment, staff }: DockServicesTabProps) {
  const { data: sessions, isLoading } = useDockMixSessions(appointment.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
      </div>
    );
  }

  const bowls = sessions || [];

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Bowl grid */}
      {bowls.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {bowls.map((session, idx) => (
            <BowlCard key={session.id} session={session} index={idx + 1} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center pt-12 text-center">
          <FlaskConical className="w-10 h-10 text-violet-400/30 mb-3" />
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
            No bowls yet
          </p>
          <p className="text-xs text-[hsl(var(--platform-foreground-muted)/0.6)] mt-1">
            Tap + to start mixing
          </p>
        </div>
      )}

      {/* Add Bowl FAB */}
      <button className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-violet-500/40 text-violet-400 bg-violet-600/10 hover:bg-violet-600/20 transition-colors text-sm font-medium">
        <Plus className="w-4 h-4" />
        Add Bowl
      </button>
    </div>
  );
}

function BowlCard({ session, index }: { session: DockMixSession; index: number }) {
  const status = getStatusDisplay(session.status);
  const StatusIcon = status.icon;
  const isTerminal = isTerminalSessionStatus(session.status as any);

  return (
    <button
      className={cn(
        'w-full text-left rounded-xl p-4 border transition-all duration-150',
        'bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.3)]',
        'hover:border-[hsl(var(--platform-border)/0.5)]',
        'active:scale-[0.98]',
        isTerminal && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">
          Bowl {index}
        </span>
        <StatusIcon className={cn('w-4 h-4', status.color)} />
      </div>
      <p className={cn('text-xs', status.color)}>
        {status.label}
      </p>
      {session.notes && (
        <p className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.6)] mt-1 truncate">
          {session.notes}
        </p>
      )}
    </button>
  );
}
