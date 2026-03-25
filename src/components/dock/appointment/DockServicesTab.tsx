/**
 * DockServicesTab — Per-service bowl configurator.
 * Groups bowls by individual color/chemical service on the appointment.
 * Each service section has its own bowl grid and "Add Bowl" card.
 * Non-mixing services (haircuts, styling) are excluded.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, FlaskConical, Loader2, Circle, CheckCircle2, AlertCircle, Check, MoreVertical, Scale, History, TestTube2 } from 'lucide-react';
import { toast } from 'sonner';
import { DockBowlActionSheet, type BowlAction } from '../mixing/DockBowlActionSheet';
import { DockRenameBowlDialog } from '../mixing/DockRenameBowlDialog';
import { cn } from '@/lib/utils';
import type { DockStaffSession } from '@/pages/Dock';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { useDockMixSessions, type DockMixSession } from '@/hooks/dock/useDockMixSessions';
import { normalizeSessionStatus, isTerminalSessionStatus, isActiveSession, requiresReweigh } from '@/lib/backroom/session-state-machine';
import { DockNewBowlSheet } from '../mixing/DockNewBowlSheet';
import { DockLiveDispensing, type BowlLine } from '../mixing/DockLiveDispensing';
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
import { isColorOrChemicalService } from '@/utils/serviceCategorization';
import { useServiceLookup, type ContainerType } from '@/hooks/useServiceLookup';

interface DockServicesTabProps {
  appointment: DockAppointment;
  staff: DockStaffSession;
  effectiveServiceName?: string | null;
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

/** Convert builder FormulaLine[] to dispensing BowlLine[] */
function formulaLinesToBowlLines(lines: FormulaLine[]): BowlLine[] {
  return lines.map((l, i) => ({
    id: `demo-line-${i}`,
    product_id: l.product.id,
    product_name_snapshot: l.product.name,
    brand_snapshot: l.product.brand ?? null,
    dispensed_quantity: l.targetWeight * (l.ratio || 1),
    dispensed_unit: 'g',
    dispensed_cost_snapshot: l.product.wholesale_price ?? 0,
    swatch_color: l.product.swatch_color ?? null,
  }));
}

interface ActiveBowl {
  sessionId: string;
  bowlId: string;
  bowlNumber: number;
  status: string;
  demoLines?: BowlLine[];
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
  serviceLabel: string | null;
}

/** Parse service_name into individual service tokens */
function parseServices(serviceName: string | null | undefined): string[] {
  if (!serviceName) return [];
  // Try ` + ` first (Phorest multi-service), then `, `
  const delim = serviceName.includes(' + ') ? ' + ' : ', ';
  return serviceName.split(delim).map(s => s.trim()).filter(Boolean);
}

/** Get only color/chemical services from an appointment */
function getChemicalServices(serviceName: string | null | undefined): string[] {
  return parseServices(serviceName).filter(s => isColorOrChemicalService(s));
}

export function DockServicesTab({ appointment, staff, effectiveServiceName }: DockServicesTabProps) {
  const { isDemoMode } = useDockDemo();
  const { data: sessions, isLoading } = useDockMixSessions(appointment.id);
  const [showNewBowl, setShowNewBowl] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showBowlDetection, setShowBowlDetection] = useState(false);
  const [activeBowl, setActiveBowl] = useState<ActiveBowl | null>(null);
  const [activeServiceLabel, setActiveServiceLabel] = useState<string | null>(null);
  const createBowl = useCreateDockBowl();
  const completeSession = useCompleteDockSession();
  const markUnresolved = useMarkDockSessionUnresolved();
  const { effectiveOrganization } = useOrganizationContext();

  // Demo-mode local bowl state — persisted in sessionStorage per appointment
  const demoBowlsKey = `dock-demo-bowls::${appointment.id}`;
  const [demoBowls, setDemoBowls] = useState<DemoBowl[]>(() => {
    try {
      const stored = sessionStorage.getItem(demoBowlsKey);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showFormulaHistory, setShowFormulaHistory] = useState(false);
  const [bowlMenuTarget, setBowlMenuTarget] = useState<{ type: 'remote'; session: DockMixSession; index: number } | { type: 'demo'; bowl: DemoBowl } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ type: 'remote'; session: DockMixSession } | { type: 'demo'; bowl: DemoBowl } | null>(null);

  // Sync demo bowls to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(demoBowlsKey, JSON.stringify(demoBowls));
  }, [demoBowls, demoBowlsKey]);

  // Listen for demo reset event
  useEffect(() => {
    const handleReset = () => {
      setDemoBowls([]);
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('dock-demo-bowls::')) sessionStorage.removeItem(key);
      }
    };
    window.addEventListener('dock-demo-reset', handleReset);
    return () => window.removeEventListener('dock-demo-reset', handleReset);
  }, []);

  // Parse chemical services
  const chemicalServices = useMemo(() => getChemicalServices(effectiveServiceName ?? appointment.service_name), [effectiveServiceName, appointment.service_name]);

  // Get the first session ID for stats query
  const primarySessionId = sessions?.[0]?.id || null;
  const { data: sessionStats } = useDockSessionStats(primarySessionId);

  const handleAddBowlForService = useCallback((serviceLabel: string) => {
    setActiveServiceLabel(serviceLabel);
    if (!showBowlDetection) setShowBowlDetection(true);
  }, [showBowlDetection]);

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
        serviceLabel: activeServiceLabel,
      };
      setDemoBowls((prev) => [...prev, newBowl]);
      setActiveBowl({
        sessionId: newBowl.id,
        bowlId: newBowl.id,
        bowlNumber,
        status: 'open',
        demoLines: formulaLinesToBowlLines(lines),
      });
      setActiveServiceLabel(null);
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
      serviceLabel: activeServiceLabel || undefined,
    }, {
      onSuccess: (result: CreatedBowlResult) => {
        setActiveBowl({
          sessionId: result.sessionId,
          bowlId: result.bowlId,
          bowlNumber: result.bowlNumber,
          status: 'open',
        });
        setActiveServiceLabel(null);
      },
    });
  }, [isDemoMode, sessions, demoBowls, effectiveOrganization, createBowl, appointment, staff, activeServiceLabel]);

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
      demoLines: formulaLinesToBowlLines(bowl.lines),
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

  const handleBowlAction = useCallback((action: BowlAction) => {
    if (!bowlMenuTarget) return;
    switch (action) {
      case 'edit':
        if (bowlMenuTarget.type === 'remote') {
          handleBowlTap(bowlMenuTarget.session, bowlMenuTarget.index);
        } else {
          handleDemoBowlTap(bowlMenuTarget.bowl);
        }
        setBowlMenuTarget(null);
        break;
      case 'rename':
        setRenameTarget(bowlMenuTarget.type === 'remote' ? { type: 'remote', session: bowlMenuTarget.session } : { type: 'demo', bowl: bowlMenuTarget.bowl });
        setBowlMenuTarget(null);
        break;
      case 'discard':
        if (bowlMenuTarget.type === 'demo') {
          setDemoBowls(prev => prev.filter(b => b.id !== bowlMenuTarget.bowl.id));
          toast.success('Formula removed');
        } else {
          toast.success('Formula removed');
        }
        setBowlMenuTarget(null);
        break;
      default:
        toast('Coming soon', { description: `${action.replace('_', ' ')} will be available in a future update.` });
        setBowlMenuTarget(null);
        break;
    }
  }, [bowlMenuTarget]);

  const handleRename = useCallback((newName: string) => {
    if (!renameTarget) return;
    if (renameTarget.type === 'demo') {
      setDemoBowls(prev => prev.map(b => b.id === renameTarget.bowl.id ? { ...b, serviceLabel: newName } : b));
    }
    toast.success('Formula renamed');
    setRenameTarget(null);
  }, [renameTarget]);

  // Full-screen dispensing view
  const remoteBowls = sessions || [];
  const allBowlCount = remoteBowls.length + demoBowls.length;

  // Group bowls by service label (must be before early returns)
  const bowlsByService = useMemo(() => {
    const map = new Map<string, { remote: DockMixSession[]; demo: DemoBowl[] }>();
    for (const svc of chemicalServices) {
      map.set(svc, { remote: [], demo: [] });
    }
    for (const s of remoteBowls) {
      const label = s.service_label || chemicalServices[0] || 'Uncategorized';
      if (!map.has(label)) map.set(label, { remote: [], demo: [] });
      map.get(label)!.remote.push(s);
    }
    for (const b of demoBowls) {
      const label = b.serviceLabel || chemicalServices[0] || 'Uncategorized';
      if (!map.has(label)) map.set(label, { remote: [], demo: [] });
      map.get(label)!.demo.push(b);
    }
    return map;
  }, [chemicalServices, remoteBowls, demoBowls]);

  const hasChemicalServices = chemicalServices.length > 0;

  // Full-screen dispensing view
  if (activeBowl) {
    return (
      <DockLiveDispensing
        sessionId={activeBowl.sessionId}
        bowlId={activeBowl.bowlId}
        bowlNumber={activeBowl.bowlNumber}
        organizationId={effectiveOrganization?.id || ''}
        bowlStatus={activeBowl.status}
        demoLines={activeBowl.demoLines}
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

  

  return (
    <div className="relative flex flex-col h-full">
      <DockClientAlertsBanner
        phorestClientId={appointment.phorest_client_id}
        clientId={appointment.client_id}
        clientName={appointment.client_name}
        bookingNotes={appointment.notes}
      />
      <div className={cn(
        'px-7 py-4 flex-1 overflow-y-auto',
        !hasChemicalServices && allBowlCount === 0 ? 'flex flex-col' : 'space-y-6'
      )}>
        {hasChemicalServices ? (
          <>
            {/* Per-service sections */}
            {Array.from(bowlsByService.entries()).map(([serviceLabel, { remote, demo }]) => {
              const svcBowlCount = remote.length + demo.length;
              // Running bowl index across all services
              let bowlIdx = 0;
              // Count bowls in previous services for numbering
              let globalOffset = 0;
              for (const [lbl, entry] of bowlsByService.entries()) {
                if (lbl === serviceLabel) break;
                globalOffset += entry.remote.length + entry.demo.length;
              }

              return (
                <div key={serviceLabel}>
                  {/* Service header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
                      {serviceLabel}
                    </h3>
                    <span className="text-xs text-[hsl(var(--platform-foreground-muted)/0.5)]">
                      {svcBowlCount} bowl{svcBowlCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Bowl grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {remote.map((session) => {
                      bowlIdx++;
                      return (
                         <BowlCard
                          key={session.id}
                          session={session}
                          index={globalOffset + bowlIdx}
                          onTap={() => handleBowlTap(session, globalOffset + bowlIdx)}
                          onMenuTap={() => setBowlMenuTarget({ type: 'remote', session, index: globalOffset + bowlIdx })}
                        />
                      );
                    })}
                    {demo.map((bowl) => {
                      bowlIdx++;
                      return (
                        <DemoBowlCard
                          key={bowl.id}
                          bowl={bowl}
                          onTap={() => handleDemoBowlTap(bowl)}
                          onMenuTap={() => setBowlMenuTarget({ type: 'demo', bowl })}
                        />
                      );
                    })}
                    {/* Inline Add Bowl card */}
                    <AddBowlCard
                      onClick={() => handleAddBowlForService(serviceLabel)}
                      disabled={createBowl.isPending}
                    />
                  </div>
                </div>
              );
            })}
          </>
        ) : allBowlCount > 0 ? (
          /* Fallback: flat grid for appointments with no parseable chemical services but existing bowls */
          <div className="grid grid-cols-2 gap-4">
             {remoteBowls.map((session, idx) => (
              <BowlCard
                key={session.id}
                session={session}
                index={idx + 1}
                onTap={() => handleBowlTap(session, idx + 1)}
                onMenuTap={() => setBowlMenuTarget({ type: 'remote', session, index: idx + 1 })}
              />
            ))}
            {demoBowls.map((bowl) => (
              <DemoBowlCard
                key={bowl.id}
                bowl={bowl}
                onTap={() => handleDemoBowlTap(bowl)}
                onMenuTap={() => setBowlMenuTarget({ type: 'demo', bowl })}
              />
            ))}
            <AddBowlCard
              onClick={() => {
                setActiveServiceLabel(null);
                if (!showBowlDetection) setShowBowlDetection(true);
              }}
              disabled={createBowl.isPending}
            />
          </div>
        ) : (
          /* Empty state — Start Mixing */
          <button
            onClick={() => {
              setActiveServiceLabel(chemicalServices[0] || null);
              if (!showBowlDetection) setShowBowlDetection(true);
            }}
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


      {/* Bowl detection gate */}
      <DockBowlDetectionGate
        open={showBowlDetection}
        isDemoMode={isDemoMode}
        onReady={() => {
          setShowBowlDetection(false);
          setShowNewBowl(true);
        }}
        onCancel={() => {
          setShowBowlDetection(false);
          setActiveServiceLabel(null);
        }}
      />

      {/* New bowl sheet */}
      <DockNewBowlSheet
        open={showNewBowl}
        onClose={() => {
          setShowNewBowl(false);
          setActiveServiceLabel(null);
        }}
        onCreateBowl={handleCreateBowl}
        clientId={appointment.client_id}
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

      {/* Formula history floating button */}
      {appointment.client_id && (
        <button
          onClick={() => setShowFormulaHistory(prev => !prev)}
          className="absolute bottom-4 left-5 z-[25] w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-white/[0.12] to-white/[0.04] backdrop-blur-2xl border border-white/[0.18] ring-1 ring-white/[0.08] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.1)] active:scale-95 transition-all duration-150 hover:from-white/[0.16] hover:to-white/[0.06]"
          aria-label="Formula history"
        >
          <History className="w-5 h-5 text-white/50" />
        </button>
      )}

      {/* Formula history sheet */}
      <DockFormulaHistorySheet
        isOpen={showFormulaHistory}
        onClose={() => setShowFormulaHistory(false)}
        clientId={appointment.client_id}
        clientName={appointment.client_name}
      />

      {/* Bowl action sheet */}
      <DockBowlActionSheet
        open={!!bowlMenuTarget}
        onClose={() => setBowlMenuTarget(null)}
        onAction={handleBowlAction}
        bowlLabel={bowlMenuTarget?.type === 'demo' ? (bowlMenuTarget.bowl.serviceLabel || 'New Formula') : bowlMenuTarget ? `Bowl ${bowlMenuTarget.index}` : undefined}
      />

      {/* Rename dialog */}
      <DockRenameBowlDialog
        open={!!renameTarget}
        currentName={renameTarget?.type === 'demo' ? (renameTarget.bowl.serviceLabel || 'New Formula') : 'Bowl'}
        onConfirm={handleRename}
        onClose={() => setRenameTarget(null)}
      />
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
        'w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed min-h-[160px]',
        'border-violet-500/30 text-violet-400',
        'hover:bg-violet-600/10 hover:border-violet-500/50',
        'active:scale-[0.98] transition-all duration-150',
        'disabled:opacity-40'
      )}
    >
      <div className="w-12 h-12 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
        <Plus className="w-6 h-6" />
      </div>
      <span className="text-sm font-medium">Add Bowl</span>
    </button>
  );
}

// ─── Bowl Card (DB sessions) ──────────────────────────
function BowlCard({ session, index, onTap, onMenuTap }: { session: DockMixSession; index: number; onTap: () => void; onMenuTap: () => void }) {
  const status = getStatusDisplay(session.status);
  const StatusIcon = status.icon;
  const isTerminal = isTerminalSessionStatus(session.status as any);

  return (
    <button
      onClick={onTap}
      className={cn(
        'w-full text-left rounded-xl p-5 border transition-all duration-150 min-h-[160px] flex flex-col',
        'bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.3)]',
        'hover:border-[hsl(var(--platform-border)/0.5)]',
        'active:scale-[0.98]',
        isTerminal && 'opacity-60'
      )}
    >
      {/* Header: icon + title + menu */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0', status.iconBg)}>
            <StatusIcon className={cn('w-4.5 h-4.5', status.color)} />
          </div>
          <div className="min-w-0">
             <p className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
              Bowl {index}
            </p>
            <p className={cn('text-xs mt-0.5', status.color)}>
              {status.label}
            </p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onMenuTap(); }} className="p-1 -mr-1 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors">
          <MoreVertical className="w-6 h-6 text-[hsl(var(--platform-foreground-muted)/0.4)] flex-shrink-0" />
        </button>
      </div>

      {/* Info area */}
      <div className="flex-1 mt-1">
        {session.mixed_by_name && (
          <p className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.6)] mb-1">
            Mixed by {session.mixed_by_name}
          </p>
        )}
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
function DemoBowlCard({ bowl, onTap, onMenuTap }: { bowl: DemoBowl; onTap: () => void; onMenuTap: () => void }) {
  const previewLines = bowl.lines.slice(0, 3);
  const overflowCount = bowl.lines.length - 3;

  return (
    <button
      onClick={onTap}
      className={cn(
        'w-full text-left rounded-xl p-5 border transition-all duration-150 min-h-[160px] flex flex-col',
        'bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.3)]',
        'hover:border-[hsl(var(--platform-border)/0.5)]',
        'active:scale-[0.98]',
      )}
    >
      {/* Header: icon + title + menu */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <FlaskConical className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <div className="min-w-0">
             <p className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
              New Formula
            </p>
            <p className="text-xs mt-0.5 text-amber-400">
              In Progress
            </p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onMenuTap(); }} className="p-1 -mr-1 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors">
          <MoreVertical className="w-6 h-6 text-[hsl(var(--platform-foreground-muted)/0.4)] flex-shrink-0" />
        </button>
      </div>

      {/* Ingredient lines preview */}
      <div className="flex-1 mt-1 space-y-1">
        {previewLines.map((line, i) => (
          <p key={i} className="text-xs text-[hsl(var(--platform-foreground-muted)/0.6)] truncate leading-tight">
            <span className="text-[hsl(var(--platform-foreground-muted)/0.8)]">{line.product.name}</span>
            <span className="mx-1">·</span>
            <span>{(line.targetWeight * line.ratio).toFixed(1)}g</span>
          </p>
        ))}
        {overflowCount > 0 && (
           <p className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.4)]">
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
         <span className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.5)]">
          {bowl.totalWeight.toFixed(0)}g total
        </span>
        <span className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.5)]">
          ${bowl.totalCost.toFixed(2)}
        </span>
      </div>
    </button>
  );
}
