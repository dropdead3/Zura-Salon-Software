/**
 * DockServicesTab — Bowl cards grid + "Add Bowl" + session complete action.
 * Queries mix sessions for this appointment and displays bowl status.
 * Tapping a bowl opens DockLiveDispensing. Creating a bowl wires through command layer.
 * In demo mode, bowls are managed in local state (no DB writes).
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, FlaskConical, Loader2, Circle, CheckCircle2, AlertCircle, Check, MoreVertical, Scale, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DockStaffSession } from '@/pages/Dock';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { useDockMixSessions, type DockMixSession } from '@/hooks/dock/useDockMixSessions';
import { normalizeSessionStatus, isTerminalSessionStatus, isActiveSession, requiresReweigh } from '@/lib/backroom/session-state-machine';
import { DockNewBowlSheet } from '../mixing/DockNewBowlSheet';
import { DockLiveDispensing } from '../mixing/DockLiveDispensing';
import { DockSessionCompleteSheet } from '../mixing/DockSessionCompleteSheet';
import { DockBowlDetectionGate } from '../mixing/DockBowlDetectionGate';
import { useCreateDockBowl, type CreatedBowlResult } from '@/hooks/dock/useDockMixSession';
import { useCompleteDockSession, useMarkDockSessionUnresolved } from '@/hooks/dock/useDockSessionComplete';
import type { FormulaLine } from '../mixing/DockFormulaBuilder';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useDockSessionStats } from '@/hooks/dock/useDockSessionStats';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { DockClientAlertsBanner } from './DockClientAlertsBanner';
import { DockFormulaHistorySheet } from './DockFormulaHistorySheet';

interface DockServicesTabProps {
  appointment: DockAppointment;
  staff: DockStaffSession;
}

type BowlStatusInfo = {
  icon: typeof FlaskConical;
  label: string;
  color: string;
  iconBg: string;
};

function getStatusDisplay(status: string): BowlStatusInfo {
  const normalized = normalizeSessionStatus(status as any);
  if (normalized === 'completed') return { icon: CheckCircle2, label: 'Completed', color: 'text-emerald-400', iconBg: 'bg-emerald-500/15 border-emerald-500/20' };
  if (isActiveSession(normalized)) return { icon: FlaskConical, label: 'In Progress', color: 'text-amber-400', iconBg: 'bg-amber-500/15 border-amber-500/20' };
  if (requiresReweigh(normalized)) return { icon: Scale, label: 'Needs Reweigh', color: 'text-rose-400', iconBg: 'bg-rose-500/15 border-rose-500/20' };
  if (normalized === 'cancelled') return { icon: Circle, label: 'Cancelled', color: 'text-[hsl(var(--platform-foreground-muted)/0.4)]', iconBg: 'bg-muted/20 border-border/20' };
  if (normalized === 'unresolved_exception') return { icon: AlertCircle, label: 'Exception', color: 'text-red-400', iconBg: 'bg-red-500/15 border-red-500/20' };
  if (normalized === 'awaiting_stylist_approval') return { icon: AlertCircle, label: 'Approval', color: 'text-amber-400', iconBg: 'bg-amber-500/15 border-amber-500/20' };
  return { icon: Circle, label: 'Draft', color: 'text-blue-400', iconBg: 'bg-blue-500/15 border-blue-500/20' };
}

interface ActiveBowl {
  sessionId: string;
  bowlId: string;
  bowlNumber: number;
  status: string;
}

/** Local demo bowl with ingredient info */
interface DemoBowl {
  id: string;
  bowlNumber: number;
  status: string;
  lines: FormulaLine[];
  totalWeight: number;
  totalCost: number;
  createdAt: string;
}

export function DockServicesTab({ appointment, staff }: DockServicesTabProps) {
  const { isDemoMode } = useDockDemo();
  const { data: sessions, isLoading } = useDockMixSessions(appointment.id);
  const [showNewBowl, setShowNewBowl] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showBowlDetection, setShowBowlDetection] = useState(false);
  const [activeBowl, setActiveBowl] = useState<ActiveBowl | null>(null);
  const createBowl = useCreateDockBowl();
  const completeSession = useCompleteDockSession();
  const markUnresolved = useMarkDockSessionUnresolved();
  const { effectiveOrganization } = useOrganizationContext();

  // Demo-mode local bowl state
  const [demoBowls, setDemoBowls] = useState<DemoBowl[]>([]);
  const [showFormulaHistory, setShowFormulaHistory] = useState(false);

  // Listen for demo reset event
  useEffect(() => {
    const handleReset = () => setDemoBowls([]);
    window.addEventListener('dock-demo-reset', handleReset);
    return () => window.removeEventListener('dock-demo-reset', handleReset);
  }, []);

  // Get the first session ID for stats query
  const primarySessionId = sessions?.[0]?.id || null;
  const { data: sessionStats } = useDockSessionStats(primarySessionId);

  const handleCreateBowl = useCallback((lines: FormulaLine[], _baseWeight: number) => {
    if (isDemoMode) {
      const existingCount = (sessions?.length || 0) + demoBowls.length;
      const bowlNumber = existingCount + 1;
      const totalWeight = lines.reduce((sum, l) => sum + l.targetWeight * l.ratio, 0);
      const totalCost = lines.reduce((sum, l) => sum + (l.targetWeight * l.ratio) * (l.product.wholesale_price || 0), 0);

      const newBowl: DemoBowl = {
        id: `demo-local-bowl-${Date.now()}`,
        bowlNumber,
        status: 'in_progress',
        lines,
        totalWeight,
        totalCost,
        createdAt: new Date().toISOString(),
      };
      setDemoBowls((prev) => [...prev, newBowl]);
      setActiveBowl({
        sessionId: newBowl.id,
        bowlId: newBowl.id,
        bowlNumber,
        status: 'open',
      });
      return;
    }

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
  }, [isDemoMode, sessions, demoBowls, effectiveOrganization, createBowl, appointment, staff]);

  const handleBowlTap = (session: DockMixSession, index: number) => {
    setActiveBowl({
      sessionId: session.id,
      bowlId: session.id,
      bowlNumber: index,
      status: session.status,
    });
  };

  const handleDemoBowlTap = (bowl: DemoBowl) => {
    setActiveBowl({
      sessionId: bowl.id,
      bowlId: bowl.id,
      bowlNumber: bowl.bowlNumber,
      status: bowl.status,
    });
  };

  const handleCompleteSession = (notes?: string) => {
    if (isDemoMode) {
      setShowComplete(false);
      return;
    }
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
    if (isDemoMode) {
      setShowComplete(false);
      return;
    }
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

  const remoteBowls = sessions || [];
  const allBowlCount = remoteBowls.length + demoBowls.length;
  const hasActiveSessions = remoteBowls.some((s) => !isTerminalSessionStatus(s.status as any)) || demoBowls.length > 0;

  const demoTotalDispensed = demoBowls.reduce((sum, b) => sum + b.totalWeight, 0);
  const demoTotalCost = demoBowls.reduce((sum, b) => sum + b.totalCost, 0);

  const completeStats = sessionStats || {
    totalBowls: allBowlCount,
    reweighedBowls: remoteBowls.filter((s) => s.status === 'completed').length,
    totalDispensed: demoTotalDispensed,
    totalLeftover: 0,
    totalNetUsage: demoTotalDispensed,
    totalCost: demoTotalCost,
  };

  // Derive contextual action bar state
  const sessionState = deriveSessionState(remoteBowls, demoBowls);

  return (
    <div className={`relative flex flex-col h-full ${allBowlCount === 0 ? '' : ''}`}>
      <DockClientAlertsBanner
        phorestClientId={appointment.phorest_client_id}
        clientId={appointment.client_id}
        clientName={appointment.client_name}
      />
      <div className={`px-7 py-4 flex-1 overflow-y-auto ${allBowlCount === 0 ? 'flex flex-col' : 'space-y-3'}`}>
        {/* Bowl grid */}
        {allBowlCount > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {remoteBowls.map((session, idx) => (
              <BowlCard
                key={session.id}
                session={session}
                index={idx + 1}
                onTap={() => handleBowlTap(session, idx + 1)}
              />
            ))}
            {demoBowls.map((bowl) => (
              <DemoBowlCard
                key={bowl.id}
                bowl={bowl}
                onTap={() => handleDemoBowlTap(bowl)}
              />
            ))}
            {/* Inline Add Bowl card */}
            <AddBowlCard
              onClick={() => { if (!showBowlDetection) setShowBowlDetection(true); }}
              disabled={createBowl.isPending}
            />
          </div>
        ) : (
          <button
            onClick={() => { if (!showBowlDetection) setShowBowlDetection(true); }}
            disabled={createBowl.isPending}
            className="flex-1 flex flex-col items-center justify-center text-center hover:opacity-80 active:opacity-60 active:scale-[0.98] transition-all cursor-pointer"
          >
            <motion.div
              className="relative mb-6"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="absolute inset-0 rounded-full bg-violet-500/20 scale-150 animate-[glow_2.5s_ease-in-out_infinite]" />
              <div className="relative flex items-center justify-center w-24 h-24 rounded-full border border-violet-500/30 bg-violet-600/10">
                <FlaskConical className="w-12 h-12 text-violet-400" />
              </div>
            </motion.div>
            <span className="font-display text-lg tracking-wide text-violet-300">
              Start Mixing
            </span>
            <span className="text-sm text-[hsl(var(--platform-muted-foreground))] mt-1">
              Tap anywhere to add your first bowl
            </span>
          </button>
        )}
      </div>

      {/* Contextual Action Bar */}
      {allBowlCount > 0 && (
        <ContextualActionBar
          state={sessionState}
          onContinueMixing={() => {
            // Find first active bowl and open it
            const activeRemote = remoteBowls.find(s => isActiveSession(normalizeSessionStatus(s.status as any)));
            if (activeRemote) {
              const idx = remoteBowls.indexOf(activeRemote);
              handleBowlTap(activeRemote, idx + 1);
            } else if (demoBowls.length > 0) {
              const activeDemoBowl = demoBowls.find(b => b.status === 'in_progress') || demoBowls[demoBowls.length - 1];
              handleDemoBowlTap(activeDemoBowl);
            }
          }}
          onAddBowl={() => { if (!showBowlDetection) setShowBowlDetection(true); }}
          onReweigh={() => {
            // Open first bowl needing reweigh
            const reweighBowl = remoteBowls.find(s => requiresReweigh(normalizeSessionStatus(s.status as any)));
            if (reweighBowl) {
              const idx = remoteBowls.indexOf(reweighBowl);
              handleBowlTap(reweighBowl, idx + 1);
            }
          }}
          onCompleteSession={() => setShowComplete(true)}
        />
      )}

      {/* Bowl detection gate */}
      <DockBowlDetectionGate
        open={showBowlDetection}
        isDemoMode={isDemoMode}
        onReady={() => {
          setShowBowlDetection(false);
          setShowNewBowl(true);
        }}
        onCancel={() => setShowBowlDetection(false)}
      />

      {/* New bowl sheet */}
      <DockNewBowlSheet
        open={showNewBowl}
        onClose={() => setShowNewBowl(false)}
        onCreateBowl={handleCreateBowl}
      />

      {/* Session complete sheet */}
      <DockSessionCompleteSheet
        open={showComplete}
        stats={completeStats}
        onComplete={handleCompleteSession}
        onMarkUnresolved={handleMarkUnresolved}
        onClose={() => setShowComplete(false)}
        isPending={completeSession.isPending || markUnresolved.isPending}
      />
    </div>
  );
}

// ─── Session State Derivation ─────────────────────────
type SessionActionState = 'has_active' | 'needs_reweigh' | 'all_complete' | 'mixed';

function deriveSessionState(remote: DockMixSession[], demo: DemoBowl[]): SessionActionState {
  const hasActive = remote.some(s => isActiveSession(normalizeSessionStatus(s.status as any))) || demo.some(b => b.status === 'in_progress');
  const hasReweigh = remote.some(s => requiresReweigh(normalizeSessionStatus(s.status as any)));
  const allTerminal = remote.every(s => isTerminalSessionStatus(s.status as any)) && demo.every(b => b.status !== 'in_progress');

  if (hasActive) return 'has_active';
  if (hasReweigh) return 'needs_reweigh';
  if (allTerminal && (remote.length + demo.length) > 0) return 'all_complete';
  return 'mixed';
}

// ─── Contextual Action Bar ────────────────────────────
function ContextualActionBar({
  state,
  onContinueMixing,
  onAddBowl,
  onReweigh,
  onCompleteSession,
}: {
  state: SessionActionState;
  onContinueMixing: () => void;
  onAddBowl: () => void;
  onReweigh: () => void;
  onCompleteSession: () => void;
}) {
  const config = useMemo(() => {
    switch (state) {
      case 'has_active':
        return {
          primary: { label: 'Continue Mixing', onClick: onContinueMixing, className: 'bg-violet-600 hover:bg-violet-500 text-white' },
          secondary: { label: 'Add Bowl', onClick: onAddBowl },
        };
      case 'needs_reweigh':
        return {
          primary: { label: 'Reweigh Bowl', onClick: onReweigh, className: 'bg-rose-600 hover:bg-rose-500 text-white' },
          secondary: { label: 'Complete Session', onClick: onCompleteSession },
        };
      case 'all_complete':
        return {
          primary: { label: 'Complete Session', onClick: onCompleteSession, className: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
          secondary: { label: 'Mix More', onClick: onAddBowl },
        };
      default: // mixed
        return {
          primary: { label: 'Continue Mixing', onClick: onContinueMixing, className: 'bg-violet-600 hover:bg-violet-500 text-white' },
          secondary: { label: 'Complete Session', onClick: onCompleteSession },
        };
    }
  }, [state, onContinueMixing, onAddBowl, onReweigh, onCompleteSession]);

  return (
    <div className="sticky bottom-0 px-7 py-4 border-t border-[hsl(var(--platform-border)/0.3)] bg-[hsl(var(--platform-bg))/0.8] backdrop-blur-xl">
      <div className="flex gap-3">
        <button
          onClick={config.secondary.onClick}
          className="flex-1 h-11 rounded-xl border border-[hsl(var(--platform-border)/0.4)] text-[hsl(var(--platform-foreground-muted))] text-sm font-medium transition-colors hover:bg-[hsl(var(--platform-bg-hover))]"
        >
          {config.secondary.label}
        </button>
        <button
          onClick={config.primary.onClick}
          className={cn(
            'flex-[1.5] h-11 rounded-xl text-sm font-medium transition-all active:scale-[0.98]',
            config.primary.className
          )}
        >
          {config.primary.label}
        </button>
      </div>
    </div>
  );
}

// ─── Inline Add Bowl Card ─────────────────────────────
function AddBowlCard({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed min-h-[140px]',
        'border-violet-500/30 text-violet-400',
        'hover:bg-violet-600/10 hover:border-violet-500/50',
        'active:scale-[0.98] transition-all duration-150',
        'disabled:opacity-40'
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
        <Plus className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium">Add Bowl</span>
    </button>
  );
}

// ─── Bowl Card (DB sessions) ──────────────────────────
function BowlCard({ session, index, onTap }: { session: DockMixSession; index: number; onTap: () => void }) {
  const status = getStatusDisplay(session.status);
  const StatusIcon = status.icon;
  const isTerminal = isTerminalSessionStatus(session.status as any);

  return (
    <button
      onClick={onTap}
      className={cn(
        'w-full text-left rounded-xl p-4 border transition-all duration-150 min-h-[140px] flex flex-col',
        'bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.3)]',
        'hover:border-[hsl(var(--platform-border)/0.5)]',
        'active:scale-[0.98]',
        isTerminal && 'opacity-60'
      )}
    >
      {/* Header: icon + title + menu */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0', status.iconBg)}>
            <StatusIcon className={cn('w-4.5 h-4.5', status.color)} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
              Bowl {index}
            </p>
            <p className={cn('text-[11px] mt-0.5', status.color)}>
              {status.label}
            </p>
          </div>
        </div>
        <MoreVertical className="w-4 h-4 text-[hsl(var(--platform-foreground-muted)/0.4)] flex-shrink-0 mt-0.5" />
      </div>

      {/* Info area */}
      <div className="flex-1 mt-1">
        {session.unresolved_flag && (
          <p className="text-[10px] text-amber-400/70 mb-1">⚠ Flagged for review</p>
        )}
        {session.notes && (
          <p className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.5)] truncate">
            {session.notes}
          </p>
        )}
      </div>
    </button>
  );
}

/** Demo-mode bowl card with ingredient summary */
function DemoBowlCard({ bowl, onTap }: { bowl: DemoBowl; onTap: () => void }) {
  const previewLines = bowl.lines.slice(0, 3);
  const overflowCount = bowl.lines.length - 3;

  return (
    <button
      onClick={onTap}
      className={cn(
        'w-full text-left rounded-xl p-4 border transition-all duration-150 min-h-[140px] flex flex-col',
        'bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.3)]',
        'hover:border-[hsl(var(--platform-border)/0.5)]',
        'active:scale-[0.98]',
      )}
    >
      {/* Header: icon + title + menu */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <FlaskConical className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
              New Formula
            </p>
            <p className="text-[11px] mt-0.5 text-amber-400">
              In Progress
            </p>
          </div>
        </div>
        <MoreVertical className="w-4 h-4 text-[hsl(var(--platform-foreground-muted)/0.4)] flex-shrink-0 mt-0.5" />
      </div>

      {/* Ingredient lines preview */}
      <div className="flex-1 mt-1 space-y-1">
        {previewLines.map((line, i) => (
          <p key={i} className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.6)] truncate leading-tight">
            <span className="text-[hsl(var(--platform-foreground-muted)/0.8)]">{line.product.name}</span>
            <span className="mx-1">·</span>
            <span>{(line.targetWeight * line.ratio).toFixed(1)}g</span>
          </p>
        ))}
        {overflowCount > 0 && (
          <p className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.4)]">
            +{overflowCount} more
          </p>
        )}
        {previewLines.length === 0 && (
          <p className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.4)] italic">
            No ingredients yet
          </p>
        )}
      </div>

      {/* Footer stats */}
      <div className="mt-2 pt-2 border-t border-[hsl(var(--platform-border)/0.15)] flex items-center justify-between">
        <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.5)]">
          {bowl.totalWeight.toFixed(0)}g total
        </span>
        <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.5)]">
          ${bowl.totalCost.toFixed(2)}
        </span>
      </div>
    </button>
  );
}
