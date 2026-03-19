/**
 * DockServicesTab — Bowl cards grid + "Add Bowl" + session complete action.
 * Queries mix sessions for this appointment and displays bowl status.
 * Tapping a bowl opens DockLiveDispensing. Creating a bowl wires through command layer.
 */

import { useState } from 'react';
import { Plus, FlaskConical, Loader2, Circle, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DockStaffSession } from '@/pages/Dock';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { useDockMixSessions, type DockMixSession } from '@/hooks/dock/useDockMixSessions';
import { normalizeSessionStatus, isTerminalSessionStatus, isActiveSession, requiresReweigh } from '@/lib/backroom/session-state-machine';
import { DockNewBowlSheet } from '../mixing/DockNewBowlSheet';
import { DockLiveDispensing } from '../mixing/DockLiveDispensing';
import { DockSessionCompleteSheet } from '../mixing/DockSessionCompleteSheet';
import { useCreateDockBowl, type CreatedBowlResult } from '@/hooks/dock/useDockMixSession';
import { useCompleteDockSession, useMarkDockSessionUnresolved } from '@/hooks/dock/useDockSessionComplete';
import type { FormulaLine } from '../mixing/DockFormulaBuilder';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useDockSessionStats } from '@/hooks/dock/useDockSessionStats';

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

interface ActiveBowl {
  sessionId: string;
  bowlId: string;
  bowlNumber: number;
  status: string;
}

export function DockServicesTab({ appointment, staff }: DockServicesTabProps) {
  const { data: sessions, isLoading } = useDockMixSessions(appointment.id);
  const [showNewBowl, setShowNewBowl] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [activeBowl, setActiveBowl] = useState<ActiveBowl | null>(null);
  const createBowl = useCreateDockBowl();
  const completeSession = useCompleteDockSession();
  const markUnresolved = useMarkDockSessionUnresolved();
  const { effectiveOrganization } = useOrganizationContext();

  const handleCreateBowl = (lines: FormulaLine[], _baseWeight: number) => {
    if (!effectiveOrganization?.id) return;

    createBowl.mutate({
      appointmentId: appointment.id,
      organizationId: effectiveOrganization.id,
      locationId: appointment.location_id || undefined,
      staffUserId: staff.userId,
      lines,
      baseWeight: _baseWeight,
    }, {
      onSuccess: (result: CreatedBowlResult) => {
        setActiveBowl({
          sessionId: result.sessionId,
          bowlId: result.bowlId,
          bowlNumber: result.bowlNumber,
          status: 'open',
        });
      },
    });
  };

  const handleBowlTap = (session: DockMixSession, index: number) => {
    setActiveBowl({
      sessionId: session.id,
      bowlId: session.id,
      bowlNumber: index,
      status: session.status,
    });
  };

  const handleCompleteSession = (notes?: string) => {
    const session = sessions?.[0];
    if (!session || !effectiveOrganization?.id) return;
    completeSession.mutate({
      sessionId: session.id,
      organizationId: effectiveOrganization.id,
      locationId: appointment.location_id || undefined,
      notes,
    }, {
      onSuccess: () => setShowComplete(false),
    });
  };

  const handleMarkUnresolved = (reason: string) => {
    const session = sessions?.[0];
    if (!session || !effectiveOrganization?.id) return;
    markUnresolved.mutate({
      sessionId: session.id,
      organizationId: effectiveOrganization.id,
      locationId: appointment.location_id || undefined,
      reason,
    }, {
      onSuccess: () => setShowComplete(false),
    });
  };

  // Full-screen dispensing view
  if (activeBowl) {
    return (
      <DockLiveDispensing
        sessionId={activeBowl.sessionId}
        bowlId={activeBowl.bowlId}
        bowlNumber={activeBowl.bowlNumber}
        organizationId={effectiveOrganization?.id || ''}
        bowlStatus={activeBowl.status}
        onBack={() => setActiveBowl(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
      </div>
    );
  }

  const bowls = sessions || [];
  const hasActiveSessions = bowls.some((s) => !isTerminalSessionStatus(s.status as any));

  // Session summary stats for the complete sheet
  const sessionStats = {
    totalBowls: bowls.length,
    reweighedBowls: bowls.filter((s) => s.status === 'completed').length,
    totalDispensed: 0,
    totalLeftover: 0,
    totalNetUsage: 0,
    totalCost: 0,
  };

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Bowl grid */}
      {bowls.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {bowls.map((session, idx) => (
            <BowlCard
              key={session.id}
              session={session}
              index={idx + 1}
              onTap={() => handleBowlTap(session, idx + 1)}
            />
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
      <button
        onClick={() => setShowNewBowl(true)}
        disabled={createBowl.isPending}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-violet-500/40 text-violet-400 bg-violet-600/10 hover:bg-violet-600/20 transition-colors text-sm font-medium disabled:opacity-40"
      >
        <Plus className="w-4 h-4" />
        {createBowl.isPending ? 'Creating...' : 'Add Bowl'}
      </button>

      {/* Complete Session button — shown when bowls exist */}
      {bowls.length > 0 && (
        <button
          onClick={() => setShowComplete(true)}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 text-sm font-medium transition-colors hover:bg-emerald-600/25"
        >
          <Check className="w-4 h-4" />
          Complete Session
        </button>
      )}

      {/* New bowl sheet */}
      <DockNewBowlSheet
        open={showNewBowl}
        onClose={() => setShowNewBowl(false)}
        onCreateBowl={handleCreateBowl}
      />

      {/* Session complete sheet */}
      <DockSessionCompleteSheet
        open={showComplete}
        stats={sessionStats}
        onComplete={handleCompleteSession}
        onMarkUnresolved={handleMarkUnresolved}
        onClose={() => setShowComplete(false)}
        isPending={completeSession.isPending || markUnresolved.isPending}
      />
    </div>
  );
}

function BowlCard({ session, index, onTap }: { session: DockMixSession; index: number; onTap: () => void }) {
  const status = getStatusDisplay(session.status);
  const StatusIcon = status.icon;
  const isTerminal = isTerminalSessionStatus(session.status as any);

  return (
    <button
      onClick={onTap}
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
      {session.unresolved_flag && (
        <p className="text-[10px] text-amber-400/70 mt-1">⚠ Flagged for review</p>
      )}
      {session.notes && (
        <p className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.6)] mt-1 truncate">
          {session.notes}
        </p>
      )}
    </button>
  );
}
